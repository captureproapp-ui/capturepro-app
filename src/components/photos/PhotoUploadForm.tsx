import { useState, useRef, useEffect } from 'react';
import { supabase, PhotoType } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Upload, Image as ImageIcon, MapPin, AlertCircle, Camera } from 'lucide-react';
import { convertMultipleImages } from '../../utils/imageConversion';
import { extractEXIFData, getBrowserLocation } from '../../utils/geolocation';

type EvidenceTemplate = {
  id: string;
  code: string;
  title: string;
  stage: 'pre' | 'during' | 'post';
  scope: 'property' | 'opening';
  help_text: string | null;
  required_qty: number;
};

type PhotoUploadFormProps = {
  openingId: string;
  onClose: () => void;
  onSuccess: () => void;
};

type PhotoFile = {
  file: File;
  preview: string;
  photoType: PhotoType;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  capturedAt: string;
  templateId: string | null;
};

export function PhotoUploadForm({ openingId, onClose, onSuccess }: PhotoUploadFormProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied' | 'unavailable'>('unknown');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EvidenceTemplate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPropertyIdAndTemplates = async () => {
      try {
        const { data: opening, error: openingError } = await supabase
          .from('openings')
          .select('area_id, areas!inner(property_id)')
          .eq('id', openingId)
          .single();

        if (openingError) {
          console.error('Error fetching opening:', openingError);
          setError('Failed to load opening details');
          return;
        }

        if (opening?.areas?.property_id) {
          setPropertyId(opening.areas.property_id);

          const { data: requirements, error: reqError } = await supabase
            .from('property_evidence_requirements')
            .select(`
              id,
              required_qty,
              evidence_item_templates!inner(
                id,
                code,
                title,
                stage,
                scope,
                help_text
              )
            `)
            .eq('property_id', opening.areas.property_id)
            .eq('is_applicable', true)
            .eq('evidence_item_templates.scope', 'opening');

          if (reqError) {
            console.error('Error fetching templates:', reqError);
          } else if (requirements) {
            const templateList = requirements.map((req: any) => ({
              id: req.evidence_item_templates.id,
              code: req.evidence_item_templates.code,
              title: req.evidence_item_templates.title,
              stage: req.evidence_item_templates.stage,
              scope: req.evidence_item_templates.scope,
              help_text: req.evidence_item_templates.help_text,
              required_qty: req.required_qty,
            }));
            setTemplates(templateList);
          }
        }
      } catch (err) {
        console.error('Error loading property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyIdAndTemplates();
  }, [openingId]);

  const getLocationFromBrowser = async () => {
    try {
      const location = await getBrowserLocation();
      setLocationStatus('granted');
      setLocationError(null);
      return location;
    } catch (error: any) {
      if (error?.code === 1) {
        setLocationStatus('denied');
        setLocationError('Location permission denied. Please enable location access in your browser settings.');
      } else if (error?.code === 2) {
        setLocationStatus('unavailable');
        setLocationError('Location unavailable. Please check your device settings.');
      } else if (error?.code === 3) {
        setLocationStatus('unavailable');
        setLocationError('Location request timed out. Please try again.');
      } else if (error?.message === 'Geolocation not supported') {
        setLocationStatus('unavailable');
        setLocationError('Geolocation not supported by your browser');
      }
      throw error;
    }
  };

  const handleManualLocationRequest = async () => {
    setGettingLocation(true);
    try {
      await getLocationFromBrowser();
    } catch (error) {
      console.warn('Could not get location:', error);
    }
    setGettingLocation(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setGettingLocation(true);
    let browserLocation: { gps_lat: number; gps_lng: number; gps_accuracy: number } | null = null;

    try {
      browserLocation = await getLocationFromBrowser();
    } catch (error) {
      console.warn('Could not get browser location:', error);
    }

    setGettingLocation(false);

    try {
      setConverting(true);
      setError('');

      const conversionResults = await convertMultipleImages(files, (current, total, fileName) => {
        setConversionProgress({ current, total, fileName });
      });

      const newPhotos = await Promise.all(
        conversionResults.map(async (result, index) => {
          const originalFile = files[index];
          const exifData = await extractEXIFData(originalFile);

          const photoFile = {
            file: result.file,
            preview: URL.createObjectURL(result.file),
            photoType: 'before' as PhotoType,
            gps_lat: exifData.gps_lat || browserLocation?.gps_lat || null,
            gps_lng: exifData.gps_lng || browserLocation?.gps_lng || null,
            gps_accuracy: browserLocation?.gps_accuracy || null,
            capturedAt: exifData.capturedAt,
            templateId: null,
          };

          return photoFile;
        })
      );

      console.log('Adding photos to state:', newPhotos.map(p => ({ name: p.file.name, photoType: p.photoType })));
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process images');
    } finally {
      setConverting(false);
      setConversionProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePhotoTypeChange = (index: number, type: PhotoType) => {
    console.log(`Changing photo type at index ${index} to:`, type);
    setPhotos((prev) => {
      const updated = prev.map((photo, i) => (i === index ? { ...photo, photoType: type } : photo));
      console.log('Updated photos state:', updated.map(p => ({ name: p.file.name, photoType: p.photoType })));
      return updated;
    });
  };

  const handleTemplateChange = (index: number, templateId: string) => {
    setPhotos((prev) => prev.map((photo, i) => (i === index ? { ...photo, templateId } : photo)));
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      setError('Please select at least one photo');
      return;
    }

    if (!propertyId) {
      setError('Property information not loaded. Please try again.');
      return;
    }

    console.log('Starting upload with photos state:', photos);
    console.log('Photo types before upload:', photos.map(p => ({ name: p.file.name, photoType: p.photoType })));

    const invalidPhotos = photos.filter(p => !p.photoType || !['before', 'during', 'after', 'detail'].includes(p.photoType));
    if (invalidPhotos.length > 0) {
      console.error('Invalid photo types detected:', invalidPhotos);
      setError('Some photos have invalid types. Please refresh and try again.');
      return;
    }

    const photosWithoutTemplate = photos.filter(p => !p.templateId);
    if (photosWithoutTemplate.length > 0) {
      setError(`Please select an evidence requirement for all photos (${photosWithoutTemplate.length} photo(s) missing).`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const { count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('opening_id', openingId);

      const currentCount = count || 0;

      if (currentCount + photos.length > 45) {
        setError(`Cannot upload ${photos.length} photos. Maximum 45 photos per opening. Currently ${currentCount} photos.`);
        setUploading(false);
        return;
      }

      const uploadResults = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        console.log(`Processing photo ${i + 1}/${photos.length}:`, {
          fileName: photo.file.name,
          photoType: photo.photoType,
          photoTypeType: typeof photo.photoType,
        });

        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${openingId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, photo.file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          uploadResults.push({ success: false, fileName: photo.file.name, error: uploadError.message });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        const photoType = photo.photoType || 'before';

        if (!['before', 'during', 'after', 'detail'].includes(photoType)) {
          console.error('Invalid photo type detected:', photoType);
          uploadResults.push({ success: false, fileName: photo.file.name, error: 'Invalid photo type' });
          continue;
        }

        const selectedTemplate = templates.find(t => t.id === photo.templateId);
        const stage = selectedTemplate?.stage || 'pre';

        const photoData = {
          property_id: propertyId,
          opening_id: openingId,
          file_url: publicUrl,
          file_name: photo.file.name,
          photo_type: photoType,
          template_id: photo.templateId,
          stage: stage,
          gps_lat: photo.gps_lat,
          gps_lng: photo.gps_lng,
          gps_accuracy: photo.gps_accuracy,
          captured_at: photo.capturedAt,
          uploaded_by: user?.id,
          display_order: currentCount + i + 1,
          metadata: {
            original_name: photo.file.name,
            size: photo.file.size,
            type: photo.file.type,
          },
        };

        console.log('Inserting photo with data:', JSON.stringify(photoData, null, 2));

        const { error: dbError } = await supabase.from('photos').insert(photoData);

        if (dbError) {
          console.error('Error saving photo record:', dbError);
          console.error('Failed photo data:', photoData);
          uploadResults.push({ success: false, fileName: photo.file.name, error: dbError.message });
        } else {
          uploadResults.push({ success: true, fileName: photo.file.name });
        }
      }

      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));

      const failedUploads = uploadResults.filter(r => !r.success);
      const successfulUploads = uploadResults.filter(r => r.success);

      if (failedUploads.length > 0) {
        const errorDetails = failedUploads.map(f => `${f.fileName}: ${f.error}`).join('; ');
        setError(`${failedUploads.length} photo(s) failed to upload. ${successfulUploads.length} succeeded. Errors: ${errorDetails}`);
        setUploading(false);
        if (successfulUploads.length > 0) {
          onSuccess();
        }
      } else {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to upload photos. Please try again.');
      console.error('Upload error:', err);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Upload Photos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="bg-electric-50 border border-electric-200 text-electric-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-electric-600 border-t-transparent rounded-full animate-spin" />
              Loading opening details...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {converting && (
            <div className="bg-electric-50 border border-electric-200 text-electric-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-electric-600 border-t-transparent rounded-full animate-spin" />
              Converting {conversionProgress.fileName} ({conversionProgress.current}/{conversionProgress.total})
            </div>
          )}

          {gettingLocation && (
            <div className="bg-electric-50 border border-electric-200 text-electric-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 animate-pulse" />
              Getting your location...
            </div>
          )}

          {!gettingLocation && locationStatus === 'granted' && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Location enabled - Photos will be tagged with GPS coordinates</span>
              </div>
            </div>
          )}

          {!gettingLocation && locationStatus === 'denied' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{locationError}</span>
                </div>
                <button
                  onClick={handleManualLocationRequest}
                  className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-xs font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!gettingLocation && locationStatus === 'unknown' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Enable location to tag photos with GPS coordinates</span>
                </div>
                <button
                  onClick={handleManualLocationRequest}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                >
                  Enable Location
                </button>
              </div>
            </div>
          )}

          {templates.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Evidence Requirements</p>
                  <p className="text-xs text-gray-600">
                    {templates.length} evidence requirement(s) available for this opening.
                    You must select an evidence requirement for each photo to track completion progress.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-electric-500 hover:bg-electric-50 transition-colors"
            >
              <Camera className="w-10 h-10 mx-auto mb-3 text-electric-500" />
              <p className="text-gray-900 font-medium mb-1">Take Photo</p>
              <p className="text-sm text-gray-500">Use your camera</p>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-electric-500 hover:bg-electric-50 transition-colors"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-electric-500" />
              <p className="text-gray-900 font-medium mb-1">Upload from Gallery</p>
              <p className="text-sm text-gray-500">Select existing photos</p>
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">Maximum 45 photos per opening</p>

          <input
            ref={cameraInputRef}
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {photos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Selected Photos ({photos.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                        <img
                          src={photo.preview}
                          alt={photo.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {photo.file.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(photo.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {photo.gps_lat && photo.gps_lng && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>Location captured {photo.gps_accuracy ? `(±${Math.round(photo.gps_accuracy)}m)` : ''}</span>
                          </div>
                        )}

                        <div className="mt-2 space-y-2">
                          <select
                            value={photo.templateId || ''}
                            onChange={(e) => handleTemplateChange(index, e.target.value)}
                            className={`w-full text-sm px-2 py-1 border rounded focus:ring-2 focus:ring-electric-500 focus:border-transparent ${
                              !photo.templateId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select Evidence Requirement *</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.title} ({template.stage})
                              </option>
                            ))}
                          </select>

                          <select
                            value={photo.photoType}
                            onChange={(e) =>
                              handlePhotoTypeChange(index, e.target.value as PhotoType)
                            }
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                          >
                            <option value="before">Before</option>
                            <option value="during">During</option>
                            <option value="after">After</option>
                            <option value="detail">Detail</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || photos.length === 0 || loading || !propertyId}
              className="flex items-center gap-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-electric-300 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-4 h-4" />
              {uploading ? 'Uploading...' : `Upload ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
