import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Property, Area, Opening } from '../../lib/supabase';
import { ArrowLeft, Plus, Home, Camera, ClipboardList, Image, Settings, CheckCircle, PlayCircle, Archive, FileText, Download, Eye, Loader2, AlertCircle, Users, Square, DoorOpen, Flame, Layers, Pencil } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPropertyReports, downloadReport } from '../../services/reportStorage';
import { generateAndSaveReport, generateAndSaveWebReportOnly } from '../../services/reportOrchestrator';
import { updatePropertyInstallers, fetchInstallerNames, updatePropertyDetails } from '../../services/propertyService';
import { ChangeInstallerModal } from '../modals/ChangeInstallerModal';
import { EditPropertyDetailsModal, PropertyDetailsUpdate } from '../modals/EditPropertyDetailsModal';

type PropertyMeasure = {
  id: string;
  name: string;
  code: string;
  icon_name: string;
  color_class: string;
};

const measureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'square': Square,
  'door-open': DoorOpen,
  'home': Home,
  'flame': Flame,
  'layers': Layers,
};

type PropertyDetailProps = {
  propertyId: string;
  onBack: () => void;
  onAddRoom: () => void;
  onViewArea: (areaId: string) => void;
  onViewOpenings?: () => void;
  onViewElevations?: () => void;
  onViewImageChecklist?: () => void;
  onManageRequirements?: () => void;
  refreshTrigger?: number;
};

type AreaWithOpenings = Area & {
  openings: Opening[];
  photoCount: number;
};

export function PropertyDetail({
  propertyId,
  onBack,
  onAddRoom,
  onViewArea,
  onViewOpenings,
  onViewElevations,
  onViewImageChecklist,
  onManageRequirements,
  refreshTrigger,
}: PropertyDetailProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [areas, setAreas] = useState<AreaWithOpenings[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingWebReport, setGeneratingWebReport] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [assignedInstallers, setAssignedInstallers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [showChangeInstallerModal, setShowChangeInstallerModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [propertyMeasures, setPropertyMeasures] = useState<PropertyMeasure[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (refreshTrigger !== undefined) {
      setRefreshKey(refreshTrigger);
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-menu-container')) {
        setShowStatusMenu(false);
      }
    };

    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusMenu]);

  useEffect(() => {
    const fetchPropertyData = async () => {
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (propError) {
        console.error('Error fetching property:', propError);
        setLoading(false);
        return;
      }

      setProperty(propData);

      const { data: completionData, error: completionError } = await supabase
        .from('property_completion_summary')
        .select('completion_percentage')
        .eq('id', propertyId)
        .maybeSingle();

      if (!completionError && completionData) {
        setCompletionPercentage(completionData.completion_percentage || 0);
      }

      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .eq('property_id', propertyId)
        .neq('area_name', 'External')
        .order('created_at');

      if (areasError) {
        console.error('Error fetching areas:', areasError);
        setLoading(false);
        return;
      }

      const areasWithDetails = await Promise.all(
        (areasData || []).map(async (area) => {
          const { data: openingsData } = await supabase
            .from('openings')
            .select('*')
            .eq('area_id', area.id)
            .order('opening_type')
            .order('opening_number');

          const openings = openingsData || [];

          const photoCountPromises = openings.map(async (opening) => {
            const { count } = await supabase
              .from('photos')
              .select('*', { count: 'exact', head: true })
              .eq('opening_id', opening.id);
            return count || 0;
          });

          const photoCounts = await Promise.all(photoCountPromises);
          const totalPhotoCount = photoCounts.reduce((sum, count) => sum + count, 0);

          return {
            ...area,
            openings,
            photoCount: totalPhotoCount,
          };
        })
      );

      setAreas(areasWithDetails);

      const { data: measuresData, error: measuresError } = await supabase
        .from('property_measures')
        .select(`
          measure_type_id,
          measure_types (
            id,
            name,
            code,
            icon_name,
            color_class
          )
        `)
        .eq('property_id', propertyId);

      if (!measuresError && measuresData) {
        const measures = measuresData
          .map(item => item.measure_types as unknown as PropertyMeasure)
          .filter(Boolean);
        setPropertyMeasures(measures);
      }

      setLoading(false);
    };

    const fetchReports = async () => {
      if (!isAdmin) return;

      setLoadingReports(true);
      try {
        const reportsData = await getPropertyReports(propertyId);
        setReports(reportsData || []);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchPropertyData();
    fetchReports();
  }, [propertyId, isAdmin, refreshKey]);

  useEffect(() => {
    const fetchInstallers = async () => {
      if (!property || !property.assigned_installer_ids || property.assigned_installer_ids.length === 0) {
        setAssignedInstallers([]);
        return;
      }

      const installers = await fetchInstallerNames(property.assigned_installer_ids);
      setAssignedInstallers(installers);
    };

    fetchInstallers();
  }, [property]);

  const handleStatusChange = async (newStatus: 'in_progress' | 'completed' | 'archived') => {
    if (!property) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', propertyId);

      if (error) throw error;

      setProperty({ ...property, status: newStatus });
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Error updating property status:', error);
      alert('Failed to update property status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const result = await generateAndSaveReport(propertyId);
      if (result.success && result.reportId) {
        setGeneratingReport(false);
        navigate(`/reports/view/${result.reportId}`);
        return;
      } else {
        alert(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleGenerateWebReportOnly = async () => {
    setGeneratingWebReport(true);
    try {
      const result = await generateAndSaveWebReportOnly(propertyId);
      if (result.success && result.reportId) {
        setGeneratingWebReport(false);
        navigate(`/reports/view/${result.reportId}`);
        return;
      } else {
        alert(result.error || 'Failed to generate web report');
      }
    } catch (error) {
      console.error('Error generating web report:', error);
      alert('Failed to generate web report');
    } finally {
      setGeneratingWebReport(false);
    }
  };

  const handleDownloadReport = async (report: any) => {
    setDownloading(report.id);
    try {
      const filename = `PAS2030_${property?.job_ref}_v${report.version}.pdf`;
      await downloadReport(report.file_url, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  const handleChangeInstallers = async (selectedInstallerIds: string[]) => {
    if (!property) return;

    console.log('🔄 Updating installers for property:', {
      propertyId: property.id,
      propertyStatus: property.status,
      currentInstallers: property.assigned_installer_ids,
      newInstallers: selectedInstallerIds
    });

    const result = await updatePropertyInstallers(property.id, selectedInstallerIds);

    if (result.success) {
      console.log('✅ Successfully updated installers');
      const updatedInstallers = await fetchInstallerNames(selectedInstallerIds);
      setAssignedInstallers(updatedInstallers);
      setProperty({ ...property, assigned_installer_ids: selectedInstallerIds });
    } else {
      console.error('❌ Failed to update installers:', result.error);
      alert(result.error || 'Failed to update installers');
      throw new Error(result.error);
    }
  };

  const handleUpdatePropertyDetails = async (updates: PropertyDetailsUpdate) => {
    if (!property) return;

    console.log('🔄 Updating property details:', {
      propertyId: property.id,
      updates
    });

    const result = await updatePropertyDetails(property.id, updates);

    if (result.success) {
      console.log('✅ Successfully updated property details');
      setProperty({
        ...property,
        job_ref: updates.job_ref,
        address_line_1: updates.address_line_1,
        address_line_2: updates.address_line_2,
        city: updates.city,
        postcode: updates.postcode,
      });
    } else {
      console.error('❌ Failed to update property details:', result.error);
      throw new Error(result.error || 'Failed to update property details');
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
        <button
          onClick={onBack}
          className="mt-4 text-electric-500 hover:text-electric-600 font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalOpenings = areas.reduce((sum, area) => sum + area.openings.length, 0);
  const totalPhotos = areas.reduce((sum, area) => sum + area.photoCount, 0);

  const hasWindowsDoors = propertyMeasures.some((m) => m.code === 'windows_doors');
  const hasCladding = propertyMeasures.some((m) => m.code === 'external_cladding_nf');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{property.job_ref}</h2>
            {isAdmin && (
              <button
                onClick={() => setShowEditDetailsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                title="Edit job reference and address"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Details</span>
              </button>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {property.address_line_1}
            {property.address_line_2 && `, ${property.address_line_2}`}, {property.city}, {property.postcode}
          </p>
        </div>
        {isAdmin && onManageRequirements && (
          <button
            onClick={onManageRequirements}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Manage Requirements
          </button>
        )}
        {hasWindowsDoors && (
          <button
            onClick={onAddRoom}
            className="flex items-center gap-2 bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Room
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 relative status-menu-container">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                    property.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : property.status === 'archived'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {property.status.replace('_', ' ')}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={updatingStatus}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {showStatusMenu && isAdmin && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="p-2">
                <button
                  onClick={() => {
                    setShowEditDetailsModal(true);
                    setShowStatusMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Pencil className="w-4 h-4 text-electric-600" />
                  <div className="text-left">
                    <div className="font-medium">Edit Details</div>
                    <div className="text-xs text-gray-500">Update job reference and address</div>
                  </div>
                </button>
                <div className="border-t border-gray-200 my-2"></div>
                <p className="text-xs font-medium text-gray-500 px-3 py-2">Change Status</p>
                {property.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={updatingStatus}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4 text-orange-600" />
                    <div className="text-left">
                      <div className="font-medium">Reopen Job</div>
                      <div className="text-xs text-gray-500">Mark as in progress</div>
                    </div>
                  </button>
                )}
                {property.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    disabled={updatingStatus}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Mark Complete</div>
                      <div className="text-xs text-gray-500">Job is finished</div>
                    </div>
                  </button>
                )}
                {property.status !== 'archived' && (
                  <button
                    onClick={() => handleStatusChange('archived')}
                    disabled={updatingStatus}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <div className="font-medium">Archive Job</div>
                      <div className="text-xs text-gray-500">Move to archive</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Completion</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    completionPercentage === 100
                      ? 'bg-green-600'
                      : completionPercentage >= 50
                      ? 'bg-electric-500'
                      : 'bg-orange-600'
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-right">
                {completionPercentage}%
              </span>
            </div>
          </div>
        </div>

        {hasWindowsDoors && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rooms</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{areas.length}</p>
              </div>
              <Home className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        )}

        {hasWindowsDoors && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Openings</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{totalOpenings}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Photos</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{totalPhotos}</p>
            </div>
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>

      {propertyMeasures.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Measures Being Fitted</h3>
            <p className="text-sm text-gray-600 mt-1">
              Photo requirements are based on the selected measures
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {propertyMeasures.map((measure) => {
              const IconComponent = measureIcons[measure.icon_name] || Square;
              return (
                <div
                  key={measure.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${measure.color_class}`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium text-sm">{measure.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasWindowsDoors && (
          <button
            onClick={onViewOpenings}
            className="bg-white rounded-lg border-2 border-electric-500 p-6 hover:bg-electric-50 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-electric-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-electric-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Openings Checklist</h3>
                <p className="text-sm text-gray-600">
                  View and upload photos for all windows and doors
                </p>
              </div>
            </div>
          </button>
        )}

        {hasCladding && (
          <button
            onClick={onViewImageChecklist}
            className="bg-white rounded-lg border-2 border-gray-600 p-6 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Layers className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Cladding Image Checklist</h3>
                <p className="text-sm text-gray-600">
                  Upload photos for external cladding installation
                </p>
              </div>
            </div>
          </button>
        )}

        {!hasCladding && (
          <button
            onClick={onViewElevations}
            className="bg-white rounded-lg border-2 border-green-600 p-6 hover:bg-green-50 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Image className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Property Elevations</h3>
                <p className="text-sm text-gray-600">
                  Upload photos of property elevations (pre/post)
                </p>
              </div>
            </div>
          </button>
        )}
      </div>

      {hasWindowsDoors && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Rooms</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {areas.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Home className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No areas yet</p>
              </div>
            ) : (
              areas.map((area) => (
                <div
                  key={area.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onViewArea(area.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-medium text-gray-900">
                          {area.area_name}
                          {area.custom_room_name && ` - ${area.custom_room_name}`}
                        </h4>
                      </div>

                      <div className="mt-2 flex gap-4 text-sm text-gray-600">
                        {area.windows_to_replace_count > 0 && (
                          <span>{area.windows_to_replace_count} windows</span>
                        )}
                        {area.doors_to_replace_count > 0 && (
                          <span>{area.doors_to_replace_count} doors</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <span className="font-medium">{area.openings.length}</span>
                          <span>openings</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Camera className="w-4 h-4" />
                          <span className="font-medium">{area.photoCount}</span>
                          <span>photos</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewArea(area.id);
                      }}
                      className="text-electric-500 hover:text-electric-600 font-medium text-sm"
                    >
                      View Openings →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Property Type</p>
            <p className="text-gray-900 font-medium mt-1 capitalize">
              {property.property_type.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Installation Date</p>
            <p className="text-gray-900 font-medium mt-1">
              {new Date(property.installation_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Created</p>
            <p className="text-gray-900 font-medium mt-1">
              {new Date(property.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Last Updated</p>
            <p className="text-gray-900 font-medium mt-1">
              {new Date(property.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Assigned Installers</h3>
          {isAdmin && (
            <button
              onClick={() => setShowChangeInstallerModal(true)}
              disabled={property.status !== 'in_progress'}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title={
                property.status !== 'in_progress'
                  ? `Cannot change installers for ${property.status} properties`
                  : 'Change assigned installers'
              }
            >
              <Users className="w-4 h-4" />
              Change Installers
            </button>
          )}
        </div>
        {assignedInstallers.length > 0 ? (
          <div className="space-y-2">
            {assignedInstallers.map((installer) => (
              <div
                key={installer.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="p-2 bg-electric-100 rounded-full">
                  <Users className="w-4 h-4 text-electric-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{installer.full_name}</p>
                  <p className="text-sm text-gray-500">{installer.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600 text-sm">No installers assigned</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
            {completionPercentage === 100 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateWebReportOnly}
                  disabled={generatingWebReport || generatingReport}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {generatingWebReport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Web Report Only
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport || generatingWebReport}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {generatingReport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Full Report (PDF)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              {completionPercentage === 100 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <p className="text-green-800 font-medium mb-2">Property 100% Complete</p>
                  <p className="text-green-700 text-sm mb-4">This property is ready for report generation</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleGenerateWebReportOnly}
                      disabled={generatingWebReport || generatingReport}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {generatingWebReport ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5" />
                          Web Report Only
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport || generatingWebReport}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {generatingReport ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Report...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Full Report (PDF)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 font-medium mb-2">No Reports Yet</p>
                  <p className="text-gray-500 text-sm">Complete this property to generate reports</p>
                  <div className="mt-4 text-sm text-gray-600">
                    Current Progress: <span className="font-semibold text-gray-900">{completionPercentage}%</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-electric-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Version {report.version}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(report.generated_at).toLocaleDateString()} at {new Date(report.generated_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Generated by {report.profiles.full_name}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.web_report_html && (
                      <button
                        onClick={() => navigate(`/reports/view/${report.id}`)}
                        className="inline-flex items-center gap-1 bg-white text-electric-600 px-3 py-2 rounded-lg border border-electric-500 hover:bg-electric-50 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View Online
                      </button>
                    )}
                    {report.file_url && (
                      <button
                        onClick={() => handleDownloadReport(report)}
                        disabled={downloading === report.id}
                        className="inline-flex items-center gap-1 bg-electric-500 text-white px-3 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {downloading === report.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download PDF
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {reports.length > 1 && (
                <div className="text-sm text-gray-600 text-center pt-2">
                  {reports.length} report versions available
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {property && profile?.organisation_id && (
        <ChangeInstallerModal
          isOpen={showChangeInstallerModal}
          onClose={() => setShowChangeInstallerModal(false)}
          onConfirm={handleChangeInstallers}
          currentInstallerIds={property.assigned_installer_ids || []}
          organisationId={profile.organisation_id}
          propertyStatus={property.status}
        />
      )}

      {property && (
        <EditPropertyDetailsModal
          isOpen={showEditDetailsModal}
          onClose={() => setShowEditDetailsModal(false)}
          onConfirm={handleUpdatePropertyDetails}
          property={property}
        />
      )}
    </div>
  );
}
