import { useEffect, useState } from 'react';
import { supabase, Property } from '../../lib/supabase';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Camera, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { LocationBadge } from '../ui/LocationBadge';
import { OutOfOrderWarning } from '../ui/OutOfOrderWarning';
import { convertImageIfNeeded } from '../../utils/imageConversion';
import { extractEXIFData, getBrowserLocation } from '../../utils/geolocation';

type PropertyElevationsChecklistProps = {
  propertyId: string;
  onBack: () => void;
};

type Photo = {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
};

type ElevationRequirement = {
  template_id: string;
  code: string;
  title: string;
  stage: string;
  help_text: string;
  required_qty: number;
  satisfied_qty: number;
  is_required: boolean;
  is_applicable: boolean;
  sort_order: number;
  photos: Photo[];
};

export function PropertyElevationsChecklist({
  propertyId,
  onBack,
}: PropertyElevationsChecklistProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [requirements, setRequirements] = useState<ElevationRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [error, setError] = useState<string>('');
  const [showOutOfOrderWarning, setShowOutOfOrderWarning] = useState(false);
  const [pendingUploadTemplateId, setPendingUploadTemplateId] = useState<string | null>(null);
  const [outOfOrderData, setOutOfOrderData] = useState<{ stageWarning: string | null; skippedItems: string[]; targetTitle: string }>({ stageWarning: null, skippedItems: [], targetTitle: '' });

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !propertyData) {
      console.error('Error fetching property:', propertyError);
      setLoading(false);
      return;
    }

    setProperty(propertyData);

    const { data: requirementsData, error: requirementsError } = await supabase
      .from('property_evidence_requirements')
      .select(`
        template_id,
        required_qty,
        is_required,
        is_applicable,
        evidence_item_templates(code, title, stage, help_text, sort_order, scope, measure_type_id)
      `)
      .eq('property_id', propertyId);

    if (requirementsError) {
      console.error('Error fetching requirements:', requirementsError);
      setLoading(false);
      return;
    }

    const propertyScopedRequirements = requirementsData?.filter(
      (req: any) => req.evidence_item_templates?.scope === 'property' && req.evidence_item_templates?.measure_type_id === null
    );

    const requirementsWithCounts = await Promise.all(
      (propertyScopedRequirements || []).map(async (req: any) => {
        const { data: photos } = await supabase
          .from('photos')
          .select('id, file_url, file_name, uploaded_at, gps_lat, gps_lng, gps_accuracy')
          .eq('property_id', propertyId)
          .is('opening_id', null)
          .eq('template_id', req.template_id)
          .order('uploaded_at', { ascending: true });

        return {
          template_id: req.template_id,
          code: req.evidence_item_templates.code,
          title: req.evidence_item_templates.title,
          stage: req.evidence_item_templates.stage,
          help_text: req.evidence_item_templates.help_text,
          required_qty: req.required_qty,
          satisfied_qty: photos?.length || 0,
          is_required: req.is_required,
          is_applicable: req.is_applicable,
          sort_order: req.evidence_item_templates.sort_order,
          photos: photos?.map(p => ({
            id: p.id,
            file_url: p.file_url,
            file_name: p.file_name,
            uploaded_at: p.uploaded_at,
          })) || [],
        };
      })
    );

    setRequirements(requirementsWithCounts.sort((a, b) => a.sort_order - b.sort_order));
    setLoading(false);
  };

  const STAGE_ORDER = ['pre', 'post'];
  const STAGE_LABELS: Record<string, string> = { pre: 'Pre-Installation Elevations', post: 'Post-Installation Elevations' };

  const checkUploadOrder = (templateId: string): { hasWarning: boolean; stageWarning: string | null; skippedItems: string[] } => {
    const target = requirements.find((r) => r.template_id === templateId);
    if (!target) return { hasWarning: false, stageWarning: null, skippedItems: [] };

    const isReqComplete = (r: ElevationRequirement) => r.satisfied_qty >= r.required_qty;

    let stageWarning: string | null = null;
    const targetStageIndex = STAGE_ORDER.indexOf(target.stage);
    for (let i = 0; i < targetStageIndex; i++) {
      const priorStage = STAGE_ORDER[i];
      const priorItems = requirements.filter((r) => r.stage === priorStage && r.is_applicable);
      const incomplete = priorItems.filter((r) => !isReqComplete(r));
      if (incomplete.length > 0) {
        stageWarning = `${STAGE_LABELS[priorStage]} still has ${incomplete.length} incomplete item${incomplete.length !== 1 ? 's' : ''}.`;
        break;
      }
    }

    const sameStageItems = requirements.filter((r) => r.stage === target.stage && r.is_applicable && r.sort_order < target.sort_order);
    const skippedItems = sameStageItems.filter((r) => !isReqComplete(r)).map((r) => r.title);

    return { hasWarning: !!stageWarning || skippedItems.length > 0, stageWarning, skippedItems };
  };

  const triggerFileUpload = (templateId: string) => {
    setUploading(templateId);
    setError('');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.heic,.heif';
    fileInput.multiple = false;

    fileInput.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) {
        setUploading(null);
        return;
      }

      try {
        let browserLocation = null;
        try {
          browserLocation = await getBrowserLocation();
        } catch (error) {
          console.warn('Could not get browser location:', error);
        }

        const exifData = await extractEXIFData(file);

        const conversionResult = await convertImageIfNeeded(file);
        const processedFile = conversionResult.file;

        const fileName = `${propertyId}/elevations/${Date.now()}_${processedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, processedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

        const requirement = requirements.find((r) => r.template_id === templateId);
        const photoType = ['before', 'during', 'after'].includes(requirement?.stage || '')
          ? requirement?.stage as 'before' | 'during' | 'after'
          : 'detail';

        const { error: insertError } = await supabase.from('photos').insert({
          property_id: propertyId,
          opening_id: null,
          template_id: templateId,
          stage: requirement?.stage,
          photo_type: photoType,
          file_url: urlData.publicUrl,
          file_name: processedFile.name,
          gps_lat: exifData.gps_lat || browserLocation?.gps_lat || null,
          gps_lng: exifData.gps_lng || browserLocation?.gps_lng || null,
          gps_accuracy: browserLocation?.gps_accuracy || null,
          captured_at: exifData.capturedAt,
          uploaded_at: new Date().toISOString(),
        });

        if (insertError) {
          throw insertError;
        }

        await fetchData();
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        setError(`Failed to upload photo: ${error?.message || 'Please try again.'}`);
      } finally {
        setUploading(null);
      }
    };

    fileInput.click();
  };

  const handleConfirmOutOfOrder = () => {
    setShowOutOfOrderWarning(false);
    if (pendingUploadTemplateId) {
      triggerFileUpload(pendingUploadTemplateId);
      setPendingUploadTemplateId(null);
    }
  };

  const handlePhotoUpload = (templateId: string) => {
    const { hasWarning, stageWarning, skippedItems } = checkUploadOrder(templateId);
    if (hasWarning) {
      const target = requirements.find((r) => r.template_id === templateId);
      setOutOfOrderData({ stageWarning, skippedItems, targetTitle: target?.title || '' });
      setPendingUploadTemplateId(templateId);
      setShowOutOfOrderWarning(true);
      return;
    }
    triggerFileUpload(templateId);
  };

  const handleViewPhoto = (photos: Photo[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo? This action cannot be undone.')) return;

    try {
      setError('');
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      if (showLightbox) {
        if (lightboxPhotos.length === 1) {
          setShowLightbox(false);
        } else {
          const newIndex = lightboxIndex >= lightboxPhotos.length - 1 ? lightboxIndex - 1 : lightboxIndex;
          setLightboxIndex(Math.max(0, newIndex));
        }
      }

      await fetchData();
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError('Failed to delete photo. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Property not found</p>
        <button onClick={onBack} className="mt-4 text-electric-500 hover:text-electric-600 font-medium">
          Go Back
        </button>
      </div>
    );
  }

  const preRequirements = requirements.filter((r) => r.stage === 'pre' && r.is_applicable);
  const postRequirements = requirements.filter((r) => r.stage === 'post' && r.is_applicable);

  const renderRequirement = (req: ElevationRequirement) => {
    const isComplete = req.satisfied_qty >= req.required_qty;
    const missing = Math.max(0, req.required_qty - req.satisfied_qty);

    return (
      <div
        key={req.template_id}
        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">{req.title}</h4>
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              )}
            </div>
            {req.help_text && <p className="text-sm text-gray-600 mb-2">{req.help_text}</p>}
            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-gray-600">
                {req.satisfied_qty} / {req.required_qty} photos
              </span>
              {!isComplete && (
                <span className="text-orange-600 font-medium">{missing} needed</span>
              )}
            </div>
            {req.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {req.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer"
                    onClick={() => handleViewPhoto(req.photos, index)}
                  >
                    <img
                      src={photo.file_url}
                      alt={photo.file_name}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-electric-500 transition-colors"
                    />
                    <div className="absolute bottom-1 left-1">
                      <LocationBadge
                        gpsLat={photo.gps_lat}
                        gpsLng={photo.gps_lng}
                        gpsAccuracy={photo.gps_accuracy}
                        size="small"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handlePhotoUpload(req.template_id)}
            disabled={uploading === req.template_id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
              isComplete
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-electric-500 text-white hover:bg-electric-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {uploading === req.template_id ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Add Photo
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Property Elevations</h2>
          <p className="text-gray-600 mt-1">
            {property.job_ref} - {property.address_line_1}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-electric-50 border border-electric-200 rounded-lg p-4">
        <p className="text-sm text-electric-700">
          <strong>Note:</strong> Elevation photos show the exterior of the property from different sides.
          Take clear photos showing the full elevation where possible.
        </p>
      </div>

      <div className="space-y-6">
        {preRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-electric-500"></div>
              <h3 className="text-lg font-semibold text-gray-900">Pre-Installation Elevations</h3>
            </div>
            <div className="space-y-3">
              {preRequirements.map((req) => renderRequirement(req))}
            </div>
          </div>
        )}

        {postRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              <h3 className="text-lg font-semibold text-gray-900">Post-Installation Elevations</h3>
            </div>
            <div className="space-y-3">
              {postRequirements.map((req) => renderRequirement(req))}
            </div>
          </div>
        )}
      </div>

      <OutOfOrderWarning
        isOpen={showOutOfOrderWarning}
        targetItemTitle={outOfOrderData.targetTitle}
        stageWarning={outOfOrderData.stageWarning}
        skippedItems={outOfOrderData.skippedItems}
        onConfirm={handleConfirmOutOfOrder}
        onCancel={() => { setShowOutOfOrderWarning(false); setPendingUploadTemplateId(null); }}
      />

      {showLightbox && lightboxPhotos.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 z-10 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-4xl w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1 flex items-center justify-center w-full">
              <img
                src={lightboxPhotos[lightboxIndex].file_url}
                alt={lightboxPhotos[lightboxIndex].file_name}
                className="max-w-full max-h-full object-contain"
              />

              {lightboxPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length)}
                    className="absolute left-4 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                    title="Previous"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length)}
                    className="absolute right-4 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                    title="Next"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 bg-white bg-opacity-10 rounded-lg p-4 w-full max-w-2xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex-1">
                  <p className="font-medium">{lightboxPhotos[lightboxIndex].file_name}</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {new Date(lightboxPhotos[lightboxIndex].uploaded_at).toLocaleString()}
                  </p>
                  {lightboxPhotos.length > 1 && (
                    <p className="text-sm text-gray-300 mt-1">
                      Photo {lightboxIndex + 1} of {lightboxPhotos.length}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePhoto(lightboxPhotos[lightboxIndex].id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
