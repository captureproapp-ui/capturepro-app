import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, Property, MeasureType, PropertyMeasuresSummary } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Filter, Download, FileText, Loader2, Archive, CheckSquare, Square, X, Layers, Eye } from 'lucide-react';
import { generateAndSaveReport } from '../../services/reportOrchestrator';
import { getInstallerAssignedJobs, InstallerJob } from '../../services/installerJobsService';
import { archiveProperty, bulkArchiveProperties } from '../../services/archiveService';
import { ArchiveConfirmationModal } from '../modals/ArchiveConfirmationModal';
import { fetchInstallerNames } from '../../services/propertyService';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { ColumnVisibilityToggle, Column } from '../ui/ColumnVisibilityToggle';

type PropertiesListProps = {
  onCreateNew: () => void;
  onSelectProperty: (propertyId: string) => void;
};

type PropertyOrJob = (Property | (InstallerJob & { id: string })) & {
  installer_names?: string[];
  measures?: PropertyMeasuresSummary['measures_detail'];
};

export function PropertiesList({ onCreateNew, onSelectProperty }: PropertiesListProps) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [properties, setProperties] = useState<PropertyOrJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [measureFilter, setMeasureFilter] = useState<string>('all');
  const [measureTypes, setMeasureTypes] = useState<MeasureType[]>([]);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [propertiesToArchive, setPropertiesToArchive] = useState<Property[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem('properties-columns-visibility');
    const defaultColumns = [
      { key: 'type', label: 'Type', visible: true },
      { key: 'installers', label: 'Installers', visible: true },
      { key: 'measures', label: 'Measures', visible: true },
    ];
    if (saved) {
      const visibility = JSON.parse(saved);
      return defaultColumns.map((col) => ({
        ...col,
        visible: visibility[col.key] ?? col.visible,
      }));
    }
    return defaultColumns;
  });

  useEffect(() => {
    const fetchMeasureTypes = async () => {
      const { data, error } = await supabase
        .from('measure_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setMeasureTypes(data);
      }
    };

    fetchMeasureTypes();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).refresh) {
      setRefreshKey((prev) => prev + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!profile || !user) return;

      if (profile.role === 'installer') {
        const jobs = await getInstallerAssignedJobs(user.id, profile.organisation_id);
        const mappedJobs = jobs.map((job) => ({
          ...job,
          id: job.property_id,
        }));
        setProperties(mappedJobs);
      } else {
        let query = supabase.from('properties').select('*');

        if (profile.organisation_id) {
          query = query.eq('organisation_id', profile.organisation_id);
        }

        if (statusFilter !== 'archived') {
          query = query.neq('status', 'archived');
        }

        const { data: propertiesData, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching properties:', error);
        } else if (propertiesData) {
          const enrichedProperties = await Promise.all(
            propertiesData.map(async (property) => {
              const { data: completionData } = await supabase
                .from('property_completion_summary')
                .select('completion_percentage')
                .eq('id', property.id)
                .maybeSingle();

              const installers = await fetchInstallerNames(property.assigned_installer_ids || []);
              const installerNames = installers.map((i) => i.full_name);

              const { data: measuresData } = await supabase
                .from('property_measures_summary')
                .select('measures_detail')
                .eq('property_id', property.id)
                .maybeSingle();

              return {
                ...property,
                completion_percentage: completionData?.completion_percentage || 0,
                installer_names: installerNames,
                measures: measuresData?.measures_detail || {},
              };
            })
          );
          setProperties(enrichedProperties);
        } else {
          setProperties([]);
        }
      }
      setLoading(false);
    };

    fetchProperties();
  }, [profile, user, statusFilter, refreshKey]);

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.job_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address_line_1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.postcode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;

    const matchesMeasure = measureFilter === 'all' || (property.measures && property.measures[measureFilter]);

    return matchesSearch && matchesStatus && matchesMeasure;
  });

  const handleGenerateReport = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratingReport(propertyId);
    setReportMessage(null);

    try {
      const result = await generateAndSaveReport(propertyId);

      if (result.success && result.reportId) {
        navigate(`/reports/view/${result.reportId}`);
      } else {
        setReportMessage({
          type: 'error',
          text: result.error || 'Failed to generate report',
        });
        setTimeout(() => setReportMessage(null), 5000);
      }
    } catch (error) {
      setReportMessage({
        type: 'error',
        text: 'An unexpected error occurred while generating the report',
      });
      setTimeout(() => setReportMessage(null), 5000);
    } finally {
      setGeneratingReport(null);
    }
  };

  const canGenerateReport = (property: Property) => {
    return property.completion_percentage === 100;
  };

  const canArchiveProperty = (property: Property) => {
    return property.completion_percentage === 100 && property.status === 'completed';
  };

  const handleSelectAll = () => {
    if (selectedPropertyIds.size === filteredProperties.length) {
      setSelectedPropertyIds(new Set());
    } else {
      const allIds = new Set(filteredProperties.map((p) => p.id));
      setSelectedPropertyIds(allIds);
    }
  };

  const handleSelectProperty = (propertyId: string) => {
    const newSelected = new Set(selectedPropertyIds);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedPropertyIds(newSelected);
  };

  const handleArchiveSingle = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setPropertiesToArchive([property]);
    setShowArchiveModal(true);
  };

  const handleArchiveSelected = () => {
    const selected = filteredProperties.filter((p) => selectedPropertyIds.has(p.id));
    setPropertiesToArchive(selected);
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = async () => {
    if (!user || !profile) return;

    setArchiving(true);
    setReportMessage(null);

    try {
      if (propertiesToArchive.length === 1) {
        const result = await archiveProperty(
          propertiesToArchive[0].id,
          user.id,
          profile.organisation_id || ''
        );

        if (result.success) {
          setReportMessage({
            type: 'success',
            text: `Property "${result.jobRef}" archived successfully! View in Archive section.`,
          });
          setSelectedPropertyIds(new Set());
          const fetchProperties = async () => {
            if (profile.role === 'installer') {
              const jobs = await getInstallerAssignedJobs(user.id, profile.organisation_id);
              const mappedJobs = jobs.map((job) => ({
                ...job,
                id: job.property_id,
              }));
              setProperties(mappedJobs);
            } else {
              let query = supabase.from('properties').select('*');
              if (profile.organisation_id) {
                query = query.eq('organisation_id', profile.organisation_id);
              }
              if (statusFilter !== 'archived') {
                query = query.neq('status', 'archived');
              }
              const { data: propertiesData, error } = await query.order('created_at', { ascending: false });
              if (error) {
                console.error('Error fetching properties:', error);
              } else if (propertiesData) {
                const enrichedProperties = await Promise.all(
                  propertiesData.map(async (property) => {
                    const { data: completionData } = await supabase
                      .from('property_completion_summary')
                      .select('completion_percentage')
                      .eq('id', property.id)
                      .maybeSingle();

                    const installers = await fetchInstallerNames(property.assigned_installer_ids || []);
                    const installerNames = installers.map((i) => i.full_name);

                    return {
                      ...property,
                      completion_percentage: completionData?.completion_percentage || 0,
                      installer_names: installerNames,
                    };
                  })
                );
                setProperties(enrichedProperties);
              } else {
                setProperties([]);
              }
            }
          };
          await fetchProperties();
        } else {
          setReportMessage({
            type: 'error',
            text: result.error || 'Failed to archive property',
          });
        }
      } else {
        const propertyIds = propertiesToArchive.map((p) => p.id);
        const result = await bulkArchiveProperties(propertyIds, user.id, profile.organisation_id || '');

        if (result.successful.length > 0) {
          const message =
            result.failed.length === 0
              ? `${result.successful.length} properties archived successfully! View in Archive section.`
              : `${result.successful.length} of ${result.totalCount} properties archived. ${result.failed.length} failed.`;

          setReportMessage({
            type: result.failed.length === 0 ? 'success' : 'error',
            text: message,
          });

          const failedIds = new Set(result.failed.map((r) => r.propertyId));
          setSelectedPropertyIds(failedIds);

          const fetchProperties = async () => {
            if (profile.role === 'installer') {
              const jobs = await getInstallerAssignedJobs(user.id, profile.organisation_id);
              const mappedJobs = jobs.map((job) => ({
                ...job,
                id: job.property_id,
              }));
              setProperties(mappedJobs);
            } else {
              let query = supabase.from('properties').select('*');
              if (profile.organisation_id) {
                query = query.eq('organisation_id', profile.organisation_id);
              }
              if (statusFilter !== 'archived') {
                query = query.neq('status', 'archived');
              }
              const { data: propertiesData, error } = await query.order('created_at', { ascending: false });
              if (error) {
                console.error('Error fetching properties:', error);
              } else if (propertiesData) {
                const enrichedProperties = await Promise.all(
                  propertiesData.map(async (property) => {
                    const { data: completionData } = await supabase
                      .from('property_completion_summary')
                      .select('completion_percentage')
                      .eq('id', property.id)
                      .maybeSingle();

                    const installers = await fetchInstallerNames(property.assigned_installer_ids || []);
                    const installerNames = installers.map((i) => i.full_name);

                    return {
                      ...property,
                      completion_percentage: completionData?.completion_percentage || 0,
                      installer_names: installerNames,
                    };
                  })
                );
                setProperties(enrichedProperties);
              } else {
                setProperties([]);
              }
            }
          };
          await fetchProperties();
        } else {
          setReportMessage({
            type: 'error',
            text: 'Failed to archive all properties. Please check requirements and try again.',
          });
        }
      }

      setTimeout(() => setReportMessage(null), 5000);
    } catch (error) {
      console.error('Archive error:', error);
      setReportMessage({
        type: 'error',
        text: 'An unexpected error occurred while archiving',
      });
      setTimeout(() => setReportMessage(null), 5000);
    } finally {
      setArchiving(false);
      setShowArchiveModal(false);
      setPropertiesToArchive([]);
    }
  };

  const isAllArchivable = selectedPropertyIds.size > 0 &&
    filteredProperties
      .filter((p) => selectedPropertyIds.has(p.id))
      .every((p) => canArchiveProperty(p));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reportMessage && (
        <div
          className={`p-4 rounded-lg ${
            reportMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {reportMessage.text}
        </div>
      )}

      {selectedPropertyIds.size > 0 && (
        <div className="bg-electric-500 text-white rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5" />
            <span className="font-medium">
              {selectedPropertyIds.size} propert{selectedPropertyIds.size !== 1 ? 'ies' : 'y'} selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleArchiveSelected}
              disabled={!isAllArchivable}
              className="flex items-center gap-2 bg-white text-electric-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed font-medium"
              title={!isAllArchivable ? 'All selected properties must be 100% complete to archive' : 'Archive selected properties'}
            >
              <Archive className="w-4 h-4" />
              Archive Selected
            </button>
            <button
              onClick={() => setSelectedPropertyIds(new Set())}
              className="flex items-center gap-2 bg-white text-electric-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile?.role === 'installer' ? 'My Jobs' : 'All Properties'}
          </h2>
          <p className="text-gray-600 mt-1">
            Manage and track installation properties
          </p>
        </div>
        {profile?.role !== 'installer' && (
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Property
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job ref, address, or postcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-400" />
            <select
              value={measureFilter}
              onChange={(e) => setMeasureFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            >
              <option value="all">All Measures</option>
              {measureTypes.map((measure) => (
                <option key={measure.code} value={measure.code}>
                  {measure.name}
                </option>
              ))}
            </select>
          </div>
          {!isMobileView && (
            <ColumnVisibilityToggle
              columns={columns}
              onChange={setColumns}
              storageKey="properties-columns-visibility"
            />
          )}
        </div>
      </div>

      {isMobileView ? (
        <div className="space-y-4">
          {filteredProperties.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              {searchTerm || statusFilter !== 'all' || measureFilter !== 'all'
                ? 'No properties match your filters'
                : 'No properties yet'}
            </div>
          ) : (
            filteredProperties.map((property) => {
              const dropdownItems: DropdownMenuItem[] = [
                {
                  label: 'View Details',
                  icon: <Eye className="w-4 h-4" />,
                  onClick: () => onSelectProperty(property.id),
                },
              ];

              if (profile?.role !== 'installer') {
                if (canGenerateReport(property)) {
                  dropdownItems.push({
                    label: generatingReport === property.id ? 'Generating...' : 'Generate Report',
                    icon: generatingReport === property.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    ),
                    onClick: () => handleGenerateReport(property.id, new MouseEvent('click') as any),
                    disabled: generatingReport === property.id,
                    variant: 'success',
                  });
                }

                if (property.status !== 'archived' && canArchiveProperty(property)) {
                  dropdownItems.push({
                    label: 'Archive Property',
                    icon: <Archive className="w-4 h-4" />,
                    onClick: () => handleArchiveSingle(property, new MouseEvent('click') as any),
                    variant: 'warning',
                  });
                }
              }

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProperty(property.id);
                          }}
                          className="text-gray-500 hover:text-gray-700 transition-colors mt-1"
                        >
                          {selectedPropertyIds.has(property.id) ? (
                            <CheckSquare className="w-5 h-5 text-electric-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1" onClick={() => onSelectProperty(property.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{property.job_ref}</h3>
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                property.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : property.status === 'archived'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {property.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {property.address_line_1}
                          </p>
                          <p className="text-sm text-gray-500">
                            {property.city}, {property.postcode}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu items={dropdownItems} align="right" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Type</p>
                        <p className="text-gray-900 font-medium capitalize">
                          {property.property_type.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Installation Date</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(property.installation_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {property.installer_names && property.installer_names.length > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Installers</p>
                        <p className="text-sm text-gray-900">
                          {property.installer_names.join(', ')}
                        </p>
                      </div>
                    )}

                    {property.measures && Object.keys(property.measures).length > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Measures</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(property.measures).map(([code, detail]) => (
                            <span
                              key={code}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${detail.color}`}
                              title={`${detail.name}: ${detail.count}`}
                            >
                              {detail.name}
                              {detail.count > 0 && (
                                <span className="ml-1 font-semibold">({detail.count})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-gray-500 text-xs">Completion</p>
                        <span className="text-sm font-semibold text-gray-700">
                          {property.completion_percentage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            property.completion_percentage === 100
                              ? 'bg-green-500'
                              : property.completion_percentage >= 75
                              ? 'bg-blue-500'
                              : property.completion_percentage >= 50
                              ? 'bg-yellow-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${property.completion_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left z-10">
                  <button
                    onClick={handleSelectAll}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Select all"
                  >
                    {selectedPropertyIds.size === filteredProperties.length && filteredProperties.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="sticky left-12 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                  Job Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Address
                </th>
                {columns.find((c) => c.key === 'type')?.visible && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Type
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Installation Date
                </th>
                {columns.find((c) => c.key === 'installers')?.visible && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Installers
                  </th>
                )}
                {columns.find((c) => c.key === 'measures')?.visible && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Measures
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' || measureFilter !== 'all'
                      ? 'No properties match your filters'
                      : 'No properties yet'}
                  </td>
                </tr>
              ) : (
                filteredProperties.map((property) => {
                  const dropdownItems: DropdownMenuItem[] = [
                    {
                      label: 'View Details',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => onSelectProperty(property.id),
                    },
                  ];

                  if (profile?.role !== 'installer') {
                    if (canGenerateReport(property)) {
                      dropdownItems.push({
                        label: generatingReport === property.id ? 'Generating...' : 'Generate Report',
                        icon: generatingReport === property.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        ),
                        onClick: () => handleGenerateReport(property.id, new MouseEvent('click') as any),
                        disabled: generatingReport === property.id,
                        variant: 'success',
                      });
                    } else {
                      dropdownItems.push({
                        label: 'Generate Report',
                        icon: <FileText className="w-4 h-4" />,
                        onClick: () => {},
                        disabled: true,
                      });
                    }

                    if (property.status !== 'archived') {
                      if (canArchiveProperty(property)) {
                        dropdownItems.push({
                          label: 'Archive Property',
                          icon: <Archive className="w-4 h-4" />,
                          onClick: () => handleArchiveSingle(property, new MouseEvent('click') as any),
                          variant: 'warning',
                        });
                      } else {
                        dropdownItems.push({
                          label: 'Archive Property',
                          icon: <Archive className="w-4 h-4" />,
                          onClick: () => {},
                          disabled: true,
                        });
                      }
                    }
                  }

                  return (
                    <tr
                      key={property.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="sticky left-0 bg-white px-4 py-4 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProperty(property.id);
                          }}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {selectedPropertyIds.has(property.id) ? (
                            <CheckSquare className="w-5 h-5 text-electric-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td
                        className="sticky left-12 bg-white px-6 py-4 whitespace-nowrap cursor-pointer z-10"
                        onClick={() => onSelectProperty(property.id)}
                      >
                        <div className="font-medium text-gray-900">{property.job_ref}</div>
                      </td>
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => onSelectProperty(property.id)}
                      >
                        <div className="text-sm text-gray-900">{property.address_line_1}</div>
                        <div className="text-sm text-gray-500">
                          {property.city}, {property.postcode}
                        </div>
                      </td>
                      {columns.find((c) => c.key === 'type')?.visible && (
                        <td
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => onSelectProperty(property.id)}
                        >
                          <div className="text-sm text-gray-900 capitalize">
                            {property.property_type.replace('_', ' ')}
                          </div>
                        </td>
                      )}
                      <td
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => onSelectProperty(property.id)}
                      >
                        <div className="text-sm text-gray-900">
                          {new Date(property.installation_date).toLocaleDateString()}
                        </div>
                      </td>
                      {columns.find((c) => c.key === 'installers')?.visible && (
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => onSelectProperty(property.id)}
                        >
                          <div className="text-sm text-gray-900">
                            {property.installer_names && property.installer_names.length > 0 ? (
                              property.installer_names.length === 1 ? (
                                property.installer_names[0]
                              ) : (
                                <span title={property.installer_names.join(', ')}>
                                  {property.installer_names[0]} +{property.installer_names.length - 1}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 italic">None</span>
                            )}
                          </div>
                        </td>
                      )}
                      {columns.find((c) => c.key === 'measures')?.visible && (
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => onSelectProperty(property.id)}
                        >
                          <div className="flex flex-wrap gap-1">
                            {property.measures && Object.keys(property.measures).length > 0 ? (
                              Object.entries(property.measures).map(([code, detail]) => (
                                <span
                                  key={code}
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${detail.color}`}
                                  title={`${detail.name}: ${detail.count}`}
                                >
                                  {detail.name}
                                  {detail.count > 0 && (
                                    <span className="ml-1 font-semibold">({detail.count})</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 italic">None</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => onSelectProperty(property.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                property.completion_percentage === 100
                                  ? 'bg-green-500'
                                  : property.completion_percentage >= 75
                                  ? 'bg-blue-500'
                                  : property.completion_percentage >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{ width: `${property.completion_percentage || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {property.completion_percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => onSelectProperty(property.id)}
                      >
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            property.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : property.status === 'archived'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {property.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <DropdownMenu items={dropdownItems} align="right" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <ArchiveConfirmationModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleConfirmArchive}
        properties={propertiesToArchive}
        isLoading={archiving}
      />
    </div>
  );
}
