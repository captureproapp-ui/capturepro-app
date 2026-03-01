import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Download, FileText, Search, CheckCircle, XCircle, Clock, Eye, Share2, Globe, Lock } from 'lucide-react';
import { getOrganisationReports, downloadReport } from '../../services/reportStorage';
import { ShareReportModal } from '../modals/ShareReportModal';

interface Report {
  id: string;
  property_id: string;
  file_url: string | null;
  version: number;
  file_size_bytes: number;
  generated_at: string;
  email_sent_at: string | null;
  email_send_status: string;
  web_report_html: string | null;
  share_token: string;
  is_public: boolean;
  archived_at: string | null;
  auto_delete_at: string | null;
  properties: {
    job_ref: string;
    property_name: string | null;
    address_line_1: string;
    city: string;
    postcode: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

export function ReportsManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [shareModalReport, setShareModalReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!profile?.organisation_id) return;

      try {
        const data = await getOrganisationReports(profile.organisation_id);
        setReports(data as Report[]);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [profile]);

  const filteredReports = reports.filter((report) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      report.properties.job_ref.toLowerCase().includes(searchLower) ||
      (report.properties.property_name?.toLowerCase() || '').includes(searchLower) ||
      report.properties.address_line_1.toLowerCase().includes(searchLower) ||
      report.properties.postcode.toLowerCase().includes(searchLower)
    );
  });

  const handleDownload = async (report: Report) => {
    if (!report.file_url) {
      alert('This is a web-only report with no PDF file available.');
      return;
    }

    setDownloading(report.id);
    try {
      const filename = `PAS2030_${report.properties.job_ref}_v${report.version}.pdf`;
      await downloadReport(report.file_url, filename);
      alert(`✓ Report downloaded successfully: ${filename}`);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download report. Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getEmailStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-orange-600" />;
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
          <h2 className="text-2xl font-bold text-gray-900">Reports Management</h2>
          <p className="text-gray-600 mt-1">View and download generated PAS2030 compliance packs</p>
        </div>
      </div>

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
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sharing
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No reports match your search' : 'No reports generated yet'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.properties.property_name || 'Property'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.properties.address_line_1}, {report.properties.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{report.properties.job_ref}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-electric-100 text-electric-700">
                        v{report.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(report.generated_at).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(report.generated_at).toLocaleTimeString('en-GB')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.profiles.full_name}</div>
                      <div className="text-xs text-gray-500">{report.profiles.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{formatFileSize(report.file_size_bytes)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getEmailStatusIcon(report.email_send_status)}
                        <span className="text-sm text-gray-700 capitalize">{report.email_send_status}</span>
                      </div>
                      {report.email_sent_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(report.email_sent_at).toLocaleString('en-GB')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        {report.is_public ? (
                          <div className="flex items-center gap-1 text-green-600" title="Public - Anyone with link can view">
                            <Globe className="w-4 h-4" />
                            <span className="text-xs font-medium">Public</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500" title="Private - Only organization members">
                            <Lock className="w-4 h-4" />
                            <span className="text-xs font-medium">Private</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShareModalReport(report)}
                          className="inline-flex items-center gap-1 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium"
                          title="Share report"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        {report.web_report_html && (
                          <button
                            onClick={() => navigate(`/reports/view/${report.id}`)}
                            className="inline-flex items-center gap-1 bg-white text-electric-600 px-3 py-1.5 rounded-lg border border-electric-500 hover:bg-electric-50 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        )}
                        {report.file_url && (
                          <button
                            onClick={() => handleDownload(report)}
                            disabled={downloading === report.id}
                            className="inline-flex items-center gap-1 bg-electric-500 text-white px-3 py-1.5 rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            {downloading === report.id ? 'Downloading...' : 'PDF'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredReports.length > 0 && (
        <div className="text-sm text-gray-600">
          Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
        </div>
      )}

      {shareModalReport && (
        <ShareReportModal
          isOpen={!!shareModalReport}
          onClose={() => setShareModalReport(null)}
          reportId={shareModalReport.id}
          shareToken={shareModalReport.share_token}
          isPublic={shareModalReport.is_public}
          archivedAt={shareModalReport.archived_at}
          autoDeleteAt={shareModalReport.auto_delete_at}
          onToggleSuccess={async () => {
            if (profile?.organisation_id) {
              const data = await getOrganisationReports(profile.organisation_id);
              setReports(data as Report[]);
            }
          }}
        />
      )}
    </div>
  );
}
