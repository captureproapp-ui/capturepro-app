import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Camera, CheckCircle, AlertCircle, Upload, X, XCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { LocationBadge } from '../ui/LocationBadge';
import { convertImageIfNeeded } from '../../utils/imageConversion';

type OpeningChecklistProps = {
  openingId: string;
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

type EvidenceRequirement = {
  template_id: string;
  code: string;
  title: string;
  stage: string;
  help_text: string;
  required_qty: number;
  satisfied_qty: number;
  is_required: boolean;
  sort_order: number;
  can_mark_not_available: boolean;
  marked_not_available: boolean;
  not_available_reason: string | null;
  photos: Photo[];
};

type OpeningInfo = {
  id: string;
  opening_type: string;
  opening_number: number;
  room_name: string;
  area_name: string;
  property_id: string;
};

export function OpeningChecklist({ openingId, onBack }: OpeningChecklistProps) {
  const [opening, setOpening] = useState<OpeningInfo | null>(null);
  const [requirements, setRequirements] = useState<EvidenceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showNAModal, setShowNAModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [naReason, setNaReason] = useState('');
  const [error, setError] = useState<string>('');
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    fetchData();
  }, [openingId]);

  const fetchData = async () => {
    const { data: openingData, error: openingError } = await supabase
      .from('openings')
      .select('*, areas(property_id, area_name)')
      .eq('id', openingId)
      .maybeSingle();

    if (openingError || !openingData) {
      console.error('Error fetching opening:', openingError);
      setLoading(false);
      return;
    }

    setOpening({
      id: openingData.id,
      opening_type: openingData.opening_type,
      opening_number: openingData.opening_number,
      room_name: openingData.room_name,
      area_name: openingData.areas?.area_name,
      property_id: openingData.areas?.property_id,
    });

    const { data: requirementsData, error: requirementsError } = await supabase
      .from('property_evidence_requirements')
      .select(`
        template_id,
        required_qty,
        is_required,
        is_applicable,
        evidence_item_templates(code, title, stage, help_text, sort_order, scope, can_mark_not_available)
      `)
      .eq('property_id', openingData.areas?.property_id)
      .eq('is_applicable', true);

    if (requirementsError) {
      console.error('Error fetching requirements:', requirementsError);
      setLoading(false);
      return;
    }

    const openingScopedRequirements = requirementsData?.filter(
      (req: any) => req.evidence_item_templates?.scope === 'opening'
    );

    const requirementsWithCounts = await Promise.all(
      (openingScopedRequirements || []).map(async (req: any) => {
        const { data: photos } = await supabase
          .from('photos')
          .select('id, file_url, file_name, uploaded_at, gps_lat, gps_lng, gps_accuracy, marked_not_available_at, not_available_reason')
          .eq('opening_id', openingId)
          .eq('template_id', req.template_id)
          .order('uploaded_at', { ascending: true });

        const actualPhotos = photos?.filter(p => !p.marked_not_available_at) || [];
        const naPhoto = photos?.find(p => p.marked_not_available_at);

        return {
          template_id: req.template_id,
          code: req.evidence_item_templates.code,
          title: req.evidence_item_templates.title,
          stage: req.evidence_item_templates.stage,
          help_text: req.evidence_item_templates.help_text,
          required_qty: req.required_qty,
          satisfied_qty: actualPhotos.length,
          is_required: req.is_required,
          sort_order: req.evidence_item_templates.sort_order,
          can_mark_not_available: req.evidence_item_templates.can_mark_not_available || false,
          marked_not_available: !!naPhoto,
          not_available_reason: naPhoto?.not_available_reason || null,
          photos: actualPhotos.map(p => ({
            id: p.id,
            file_url: p.file_url,
            file_name: p.file_name,
            uploaded_at: p.uploaded_at,
            gps_lat: p.gps_lat,
            gps_lng: p.gps_lng,
            gps_accuracy: p.gps_accuracy,
          })),
        };
      })
    );

    setRequirements(requirementsWithCounts.sort((a, b) => a.sort_order - b.sort_order));
    setLoading(false);
  };

  const handleMarkNotAvailable = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowNAModal(true);
  };

  const handleConfirmNA = async () => {
    if (!selectedTemplate || !opening) return;

    try {
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const requirement = requirements.find((r) => r.template_id === selectedTemplate);
      const photoType = ['before', 'during', 'after'].includes(requirement?.stage || '')
        ? requirement?.stage as 'before' | 'during' | 'after'
        : 'detail';

      const { error } = await supabase.from('photos').insert({
        property_id: opening.property_id,
        opening_id: openingId,
        template_id: selectedTemplate,
        stage: requirement?.stage,
        photo_type: photoType,
        file_url: '',
        file_name: 'N/A',
        marked_not_available_at: new Date().toISOString(),
        not_available_reason: naReason.trim() || null,
        marked_not_available_by: user.id,
        captured_at: new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
      });

      if (error) throw error;

      setShowNAModal(false);
      setSelectedTemplate(null);
      setNaReason('');
      await fetchData();
    } catch (error) {
      console.error('Error marking as N/A:', error);
      setError('Failed to mark as not available. Please try again.');
    }
  };

  const handleUnmarkNA = async (templateId: string) => {
    if (!confirm('Remove "Not Available" marking? You can upload photos afterwards.')) return;

    try {
      setError('');
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('opening_id', openingId)
        .eq('template_id', templateId)
        .not('marked_not_available_at', 'is', null);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error unmarking N/A:', error);
      setError('Failed to remove marking. Please try again.');
    }
  };

  const handlePhotoUpload = async (templateId: string) => {
    setUploading(templateId);
    setError('');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.heic,.heif';
    fileInput.setAttribute('capture', 'environment');
    fileInput.multiple = false;

    fileInput.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file || !opening) {
        setUploading(null);
        return;
      }

      try {
        const conversionResult = await convertImageIfNeeded(file);
        const processedFile = conversionResult.file;

        const fileName = `${opening.property_id}/${openingId}/${Date.now()}_${processedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
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
          property_id: opening.property_id,
          opening_id: openingId,
          template_id: templateId,
          stage: requirement?.stage,
          photo_type: photoType,
          file_url: urlData.publicUrl,
          file_name: processedFile.name,
          captured_at: new Date().toISOString(),
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

  if (!opening) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Opening not found</p>
        <button onClick={onBack} className="mt-4 text-electric-500 hover:text-electric-600 font-medium">
          Go Back
        </button>
      </div>
    );
  }

  const preRequirements = requirements.filter((r) => r.stage === 'pre');
  const duringRequirements = requirements.filter((r) => r.stage === 'during');
  const postRequirements = requirements.filter((r) => r.stage === 'post');

  const getStageProgress = (reqs: EvidenceRequirement[]) => {
    const completed = reqs.filter(r => r.satisfied_qty >= r.required_qty || r.marked_not_available).length;
    return { completed, total: reqs.length };
  };

  const renderRequirement = (req: EvidenceRequirement) => {
    const isComplete = req.satisfied_qty >= req.required_qty || req.marked_not_available;
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
              {req.marked_not_available ? (
                <div className="flex items-center gap-1">
                  <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600">N/A</span>
                </div>
              ) : req.satisfied_qty >= req.required_qty ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
              )}
            </div>
            {req.help_text && <p className="text-sm text-gray-600 mb-2">{req.help_text}</p>}
            <div className="flex items-center gap-4 text-sm mb-3">
              {req.marked_not_available ? (
                <span className="text-gray-600">
                  Marked as not available{req.not_available_reason && `: ${req.not_available_reason}`}
                </span>
              ) : (
                <>
                  <span className="text-gray-600">
                    {req.satisfied_qty} / {req.required_qty} photos
                  </span>
                  {!isComplete && (
                    <span className="text-orange-600 font-medium">{missing} needed</span>
                  )}
                </>
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
          <div className="flex items-center gap-2">
            {req.marked_not_available ? (
              <button
                onClick={() => handleUnmarkNA(req.template_id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
                Unmark
              </button>
            ) : (
              <>
                {req.photos.length === 0 && (
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
                )}
                {req.can_mark_not_available && !isComplete && (
                  <button
                    onClick={() => handleMarkNotAvailable(req.template_id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="Mark as not available"
                  >
                    <X className="w-4 h-4" />
                    N/A
                  </button>
                )}
              </>
            )}
          </div>
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
          <h2 className="text-2xl font-bold text-gray-900">
            {opening.opening_type === 'window' ? 'Window' : 'Door'} {opening.opening_number}
          </h2>
          <p className="text-gray-600 mt-1">
            {opening.area_name}
            {opening.room_name && ` - ${opening.room_name}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Upload Error</p>
            <p className="mt-1">{error}</p>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-electric-500"></div>
              <h3 className="text-lg font-semibold text-gray-900">Pre-Installation</h3>
            </div>
            <span className="text-sm text-gray-600">
              {getStageProgress(preRequirements).completed} / {getStageProgress(preRequirements).total}
            </span>
          </div>
          <div className="space-y-3">
            {preRequirements.map((req) => renderRequirement(req))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-600"></div>
              <h3 className="text-lg font-semibold text-gray-900">During Installation</h3>
            </div>
            <span className="text-sm text-gray-600">
              {getStageProgress(duringRequirements).completed} / {getStageProgress(duringRequirements).total}
            </span>
          </div>
          <div className="space-y-3">
            {duringRequirements.map((req) => renderRequirement(req))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              <h3 className="text-lg font-semibold text-gray-900">Post-Installation</h3>
            </div>
            <span className="text-sm text-gray-600">
              {getStageProgress(postRequirements).completed} / {getStageProgress(postRequirements).total}
            </span>
          </div>
          <div className="space-y-3">
            {postRequirements.map((req) => renderRequirement(req))}
          </div>
        </div>
      </div>

      {showNAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Not Available</h3>
            <p className="text-sm text-gray-600 mb-4">
              This requirement doesn't apply to this installation. You can optionally provide a reason.
            </p>
            <textarea
              value={naReason}
              onChange={(e) => setNaReason(e.target.value)}
              placeholder="Optional reason (e.g., 'No external wall visible', 'Access blocked')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNAModal(false);
                  setSelectedTemplate(null);
                  setNaReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNA}
                className="flex-1 px-4 py-2 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div className="mt-2">
                    <LocationBadge
                      gpsLat={lightboxPhotos[lightboxIndex].gps_lat}
                      gpsLng={lightboxPhotos[lightboxIndex].gps_lng}
                      gpsAccuracy={lightboxPhotos[lightboxIndex].gps_accuracy}
                      size="medium"
                      showCoordinates={true}
                    />
                  </div>
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
