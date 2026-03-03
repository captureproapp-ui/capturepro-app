import { useEffect, useState } from 'react';
import { supabase, Property } from '../../lib/supabase';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Camera, X, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { LocationBadge } from '../ui/LocationBadge';
import { convertImageIfNeeded } from '../../utils/imageConversion';
import { extractEXIFData, getBrowserLocation } from '../../utils/geolocation';

type CladdingImageChecklistProps = {
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

type CladdingRequirement = {
  id: string;
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
  section_number: number;
  section_title: string;
  has_dropdown: boolean;
  dropdown_response: string | null;
  response_notes: string | null;
  photos: Photo[];
};

type Section = {
  number: number;
  title: string;
  items: CladdingRequirement[];
};

const CLADDING_MEASURE_CODE = 'external_cladding_nf';

const SECTION_COLORS: Record<number, { bg: string; border: string; text: string; badge: string }> = {
  1: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', badge: 'bg-slate-600' },
  2: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-600' },
  3: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700', badge: 'bg-sky-600' },
  4: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-600' },
  5: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', badge: 'bg-teal-600' },
  7: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-600' },
  8: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', badge: 'bg-cyan-600' },
  9: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-600' },
};

function isItemComplete(req: CladdingRequirement): boolean {
  if (req.has_dropdown && req.dropdown_response === 'no') return true;
  return req.satisfied_qty >= req.required_qty;
}

export function CladdingImageChecklist({
  propertyId,
  onBack,
}: CladdingImageChecklistProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [requirements, setRequirements] = useState<CladdingRequirement[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [savingDropdown, setSavingDropdown] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [error, setError] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  useEffect(() => {
    const grouped = new Map<number, Section>();
    for (const req of requirements) {
      if (!req.is_applicable) continue;
      if (!grouped.has(req.section_number)) {
        grouped.set(req.section_number, {
          number: req.section_number,
          title: req.section_title,
          items: [],
        });
      }
      grouped.get(req.section_number)!.items.push(req);
    }
    const sorted = Array.from(grouped.values()).sort((a, b) => a.number - b.number);
    setSections(sorted);

    if (expandedSections.size === 0 && sorted.length > 0) {
      const firstIncomplete = sorted.find(
        (s) => s.items.some((item) => !isItemComplete(item))
      );
      if (firstIncomplete) {
        setExpandedSections(new Set([firstIncomplete.number]));
      }
    }
  }, [requirements]);

  const fetchData = async () => {
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !propertyData) {
      setLoading(false);
      return;
    }

    setProperty(propertyData);

    const { data: measureType } = await supabase
      .from('measure_types')
      .select('id')
      .eq('code', CLADDING_MEASURE_CODE)
      .maybeSingle();

    if (!measureType) {
      setLoading(false);
      return;
    }

    const claddingMeasureId = measureType.id;

    const { data: requirementsData, error: requirementsError } = await supabase
      .from('property_evidence_requirements')
      .select(`
        id,
        template_id,
        required_qty,
        is_required,
        is_applicable,
        dropdown_response,
        response_notes,
        evidence_item_templates(code, title, stage, help_text, sort_order, scope, measure_type_id, section_number, section_title, has_dropdown)
      `)
      .eq('property_id', propertyId);

    if (requirementsError) {
      setLoading(false);
      return;
    }

    const claddingRequirements = requirementsData?.filter(
      (req: any) =>
        req.evidence_item_templates?.scope === 'property' &&
        req.evidence_item_templates?.measure_type_id === claddingMeasureId &&
        req.evidence_item_templates?.section_number !== null
    );

    const requirementsWithCounts = await Promise.all(
      (claddingRequirements || []).map(async (req: any) => {
        const { data: photos } = await supabase
          .from('photos')
          .select('id, file_url, file_name, uploaded_at, gps_lat, gps_lng, gps_accuracy')
          .eq('property_id', propertyId)
          .is('opening_id', null)
          .eq('template_id', req.template_id)
          .order('uploaded_at', { ascending: true });

        return {
          id: req.id,
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
          section_number: req.evidence_item_templates.section_number,
          section_title: req.evidence_item_templates.section_title,
          has_dropdown: req.evidence_item_templates.has_dropdown || false,
          dropdown_response: req.dropdown_response,
          response_notes: req.response_notes,
          photos: photos?.map((p) => ({
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

  const handleDropdownChange = async (req: CladdingRequirement, value: string) => {
    setSavingDropdown(req.id);
    setError('');

    try {
      const updateData: any = {
        dropdown_response: value,
        updated_at: new Date().toISOString(),
      };

      if (value === 'no') {
        updateData.response_notes = null;
      }

      const { error: updateError } = await supabase
        .from('property_evidence_requirements')
        .update(updateData)
        .eq('id', req.id);

      if (updateError) throw updateError;

      setRequirements((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? { ...r, dropdown_response: value, response_notes: value === 'no' ? null : r.response_notes }
            : r
        )
      );
    } catch (err: any) {
      setError(`Failed to save response: ${err?.message || 'Please try again.'}`);
    } finally {
      setSavingDropdown(null);
    }
  };

  const handleNotesChange = async (req: CladdingRequirement, notes: string) => {
    try {
      const { error: updateError } = await supabase
        .from('property_evidence_requirements')
        .update({
          response_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);

      if (updateError) throw updateError;

      setRequirements((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, response_notes: notes } : r
        )
      );
    } catch (err: any) {
      setError(`Failed to save notes: ${err?.message || 'Please try again.'}`);
    }
  };

  const handlePhotoUpload = async (templateId: string) => {
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

        const fileName = `${propertyId}/cladding/${Date.now()}_${processedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, processedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

        const requirement = requirements.find((r) => r.template_id === templateId);
        const photoType = ['before', 'during', 'after'].includes(requirement?.stage || '')
          ? (requirement?.stage as 'before' | 'during' | 'after')
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

        if (insertError) throw insertError;

        await fetchData();
      } catch (err: any) {
        setError(`Failed to upload photo: ${err?.message || 'Please try again.'}`);
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
    } catch (err) {
      setError('Failed to delete photo. Please try again.');
    }
  };

  const toggleSection = (sectionNumber: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionNumber)) {
        next.delete(sectionNumber);
      } else {
        next.add(sectionNumber);
      }
      return next;
    });
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

  const applicableItems = requirements.filter((r) => r.is_applicable);
  const totalRequired = applicableItems.length;
  const totalComplete = applicableItems.filter((r) => isItemComplete(r)).length;
  const progressPercent = totalRequired > 0 ? Math.round((totalComplete / totalRequired) * 100) : 0;

  const renderDropdownItem = (req: CladdingRequirement) => {
    const complete = isItemComplete(req);

    return (
      <div key={req.template_id} className="p-4 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">{req.title}</h4>
              {complete && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
            </div>
            {req.help_text && <p className="text-sm text-gray-600">{req.help_text}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 min-w-[120px]">Repairs needed?</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleDropdownChange(req, 'yes')}
                disabled={savingDropdown === req.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  req.dropdown_response === 'yes'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => handleDropdownChange(req, 'no')}
                disabled={savingDropdown === req.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  req.dropdown_response === 'no'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
            {savingDropdown === req.id && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-electric-500"></div>
            )}
          </div>

          {req.dropdown_response === 'yes' && (
            <div className="space-y-3 pl-0 border-l-4 border-amber-300 ml-1 pl-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Brief description of repairs</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Describe the repairs completed..."
                  defaultValue={req.response_notes || ''}
                  onBlur={(e) => handleNotesChange(req, e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {req.satisfied_qty} / {req.required_qty} photo{req.required_qty !== 1 ? 's' : ''}
                  {req.satisfied_qty < req.required_qty && (
                    <span className="text-orange-600 font-medium ml-2">
                      {req.required_qty - req.satisfied_qty} needed
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handlePhotoUpload(req.template_id)}
                  disabled={uploading === req.template_id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-electric-500 text-white hover:bg-electric-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
          )}

          {req.dropdown_response === 'no' && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              No repairs required -- item complete
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStandardItem = (req: CladdingRequirement) => {
    const complete = isItemComplete(req);
    const missing = Math.max(0, req.required_qty - req.satisfied_qty);

    return (
      <div key={req.template_id} className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">{req.title}</h4>
              {complete ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              )}
            </div>
            {req.help_text && <p className="text-sm text-gray-600 mb-2">{req.help_text}</p>}
            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-gray-600">
                {req.satisfied_qty} / {req.required_qty} photo{req.required_qty !== 1 ? 's' : ''}
              </span>
              {!complete && (
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
              complete
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
          <h2 className="text-2xl font-bold text-gray-900">Cladding Image Checklist</h2>
          <p className="text-gray-600 mt-1">
            {property.job_ref} - {property.address_line_1}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-semibold text-gray-900">{totalComplete} / {totalRequired} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progressPercent === 100 ? 'bg-green-600' : progressPercent >= 50 ? 'bg-electric-500' : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
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

      <div className="space-y-3">
        {sections.map((section) => {
          const colors = SECTION_COLORS[section.number] || SECTION_COLORS[1];
          const sectionComplete = section.items.filter((r) => isItemComplete(r)).length;
          const sectionTotal = section.items.length;
          const isExpanded = expandedSections.has(section.number);
          const allComplete = sectionComplete === sectionTotal;

          return (
            <div key={section.number} className={`rounded-lg border ${colors.border} overflow-hidden`}>
              <button
                onClick={() => toggleSection(section.number)}
                className={`w-full flex items-center justify-between px-5 py-4 ${colors.bg} transition-colors hover:opacity-90`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${colors.badge} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`}>
                    {section.number}
                  </span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600">
                      {sectionTotal} item{sectionTotal !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {allComplete ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {sectionComplete} / {sectionTotal}
                    </span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-3 bg-white">
                  {section.items.map((req) =>
                    req.has_dropdown ? renderDropdownItem(req) : renderStandardItem(req)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {requirements.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 font-medium">No cladding requirements found</p>
          <p className="text-gray-500 text-sm mt-1">
            Cladding photo requirements have not been generated for this property yet.
          </p>
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
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length)}
                    className="absolute right-4 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
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
