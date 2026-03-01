import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Archive, FileText, Clock, Download, Search, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadReport } from '../../services/reportStorage';

interface ArchivedProperty {
  id: string;
  original_property_id: string;
  organisation_id: string;
  archived_at: string;
  auto_delete_at: string;
  pdf_report_id: string | null;
  archived_by: string;
  property_data: {
    property: {
      job_ref: string;
      property_name: string | null;
      address_line_1: string;
      address_line_2: string | null;
      city: string;
      postcode: string;
      installation_date: string;
      assigned_installer_name: string | null;
    };
  };
  pdf_reports?: {
    file_url: string;
    version: number;
  };
  profiles?: {
    full_name: string;
  };
}

export function ArchiveManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [archivedProperties, setArchivedProperties] = useState<ArchivedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchivedProperties = async () => {
      console.log('🔍 Fetching archived properties...', {
        profileId: profile?.id,
        orgId: profile?.organisation_id,
        role: profile?.role
      });

      if (!profile?.organisation_id) {
        console.warn('⚠️ No organisation_id found in profile, cannot fetch archived properties');
        setLoading(false);
        setError('Organisation not found. Please ensure you are part of an organisation.');
        return;
      }

      try {
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('archived_properties')
          .select(`
            id,
            original_property_id,
            organisation_id,
            property_data,
            pdf_report_id,
            archived_at,
            auto_delete_at,
            archived_by,
            pdf_reports(file_url, version),
            profiles!archived_properties_archived_by_fkey(full_name)
          `)
          .eq('organisation_id', profile.organisation_id)
          .order('archived_at', { ascending: false });

        console.log('📦 Archived properties query result:', {
          dataCount: data?.length || 0,
          error: fetchError,
          data: data
        });

        if (fetchError) {
          console.error('❌ Failed to fetch archived properties:', fetchError);
          setError(`Failed to load archived properties: ${fetchError.message}`);
        } else {
          setArchivedProperties((data || []) as ArchivedProperty[]);
          console.log('✅ Successfully loaded', data?.length || 0, 'archived properties');
        }
      } catch (error) {
        console.error('💥 Error fetching archived properties:', error);
        setError('An unexpected error occurred while loading archived properties.');
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedProperties();
  }, [profile]);

  const filteredArchive = archivedProperties.filter((archive) => {
    const searchLower = searchTerm.toLowerCase();
    const property = archive.property_data.property;
    return (
      property.job_ref.toLowerCase().includes(searchLower) ||
      (property.property_name?.toLowerCase() || '').includes(searchLower) ||
      property.address_line_1.toLowerCase().includes(searchLower) ||
      property.postcode.toLowerCase().includes(searchLower)
    );
  });

  const calculateTimeRemaining = (autoDeleteAt: string): string => {
    const now = new Date();
    const deleteDate = new Date(autoDeleteAt);
    const diffTime = deleteDate.getTime() - now.getTime();
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

    if (diffYears > 0) {
      return `${diffYears} year${diffYears !== 1 ? 's' : ''} ${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    }
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
  };

  const handleDownloadReport = async (archive: ArchivedProperty) => {
    if (!archive.pdf_reports?.file_url) return;

    setDownloading(archive.id);
    try {
      const filename = `PAS2030_${archive.property_data.property.job_ref}_v${archive.pdf_reports.version}.pdf`;
      await downloadReport(archive.pdf_reports.file_url, filename);
      alert(`✓ Report downloaded successfully: ${filename}`);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download report. Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Archive Management</h2>
          <p className="text-gray-600 mt-1">Archived properties with 7-year retention period</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Archive</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Check the browser console (F12) for more details. Organisation ID: {profile?.organisation_id || 'Not found'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job ref, property name, address, or postcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Installation Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archived Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archived By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auto-Delete Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredArchive.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No archived properties match your search' : 'No archived properties yet'}
                  </td>
                </tr>
              ) : (
                filteredArchive.map((archive) => {
                  const property = archive.property_data.property;
                  return (
                    <tr key={archive.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {property.property_name || 'Property'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {property.address_line_1}, {property.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{property.job_ref}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(property.installation_date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(archive.archived_at).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(archive.archived_at).toLocaleTimeString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(archive.profiles as any)?.full_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-electric-500" />
                          <span className="text-sm font-medium text-electric-500">
                            {calculateTimeRemaining(archive.auto_delete_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(archive.auto_delete_at).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {archive.pdf_report_id ? (
                            <>
                              <button
                                onClick={() => navigate(`/reports/view/${archive.pdf_report_id}`)}
                                className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                title="View report online"
                              >
                                <Eye className="w-4 h-4" />
                                View Online
                              </button>
                              {archive.pdf_reports?.file_url && (
                                <button
                                  onClick={() => handleDownloadReport(archive)}
                                  disabled={downloading === archive.id}
                                  className="inline-flex items-center gap-1 bg-electric-500 text-white px-3 py-1.5 rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                                  title="Download PDF report"
                                >
                                  <Download className="w-4 h-4" />
                                  {downloading === archive.id ? 'Downloading...' : 'Download PDF'}
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">No report</span>
                          )}
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

      {filteredArchive.length > 0 && (
        <div className="bg-electric-50 border border-electric-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-electric-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-electric-800">7-Year Retention Policy</h3>
              <p className="text-sm text-electric-600 mt-1">
                Archived properties are automatically retained for 7 years from the archive date to comply with PAS2030
                regulations. After this period, they will be permanently deleted from the system.
              </p>
            </div>
          </div>
        </div>
      )}

      {filteredArchive.length > 0 && (
        <div className="text-sm text-gray-600">
          Showing {filteredArchive.length} archived propert{filteredArchive.length !== 1 ? 'ies' : 'y'}
        </div>
      )}
    </div>
  );
}
