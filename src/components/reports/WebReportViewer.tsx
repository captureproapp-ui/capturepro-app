import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Eye, Printer, Share2 } from 'lucide-react';
import { getReportById, getWebReportContent, incrementReportViewCount, downloadReport } from '../../services/reportStorage';
import { ShareReportModal } from '../modals/ShareReportModal';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';

export function WebReportViewer() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!reportId) return;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const [report, html] = await Promise.all([
          getReportById(reportId),
          getWebReportContent(reportId),
        ]);

        if (!report) {
          setError('Report not found');
          return;
        }

        if (!html) {
          setError('Web version not available for this report. Please download the PDF instead.');
          return;
        }

        setReportData(report);
        setHtmlContent(html);

        await incrementReportViewCount(reportId);
      } catch (err) {
        console.error('Error loading report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  const handleDownloadPDF = async () => {
    if (!reportData || !reportData.file_url) {
      alert('This is a web-only report with no PDF file available.');
      return;
    }

    try {
      setDownloading(true);
      const filename = `${reportData.properties.property_name || 'Report'}_${reportData.properties.job_ref}_v${reportData.version}.pdf`;
      await downloadReport(reportData.file_url, filename);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="large" />
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlContent) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Available</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load report'}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/reports')} variant="secondary">
                <ArrowLeft className="w-4 h-4" />
                Back to Reports
              </Button>
              {reportData?.file_url && (
                <Button onClick={handleDownloadPDF} disabled={downloading}>
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : 'Download PDF'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/reports')}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Reports</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{reportData?.view_count || 0} views</span>
                </div>
              </div>

              <Button onClick={() => setShowShareModal(true)} variant="secondary" size="sm">
                <Share2 className="w-4 h-4" />
                Share
              </Button>

              <Button onClick={handlePrint} variant="secondary" size="sm">
                <Printer className="w-4 h-4" />
                Print
              </Button>

              {reportData?.file_url && (
                <Button onClick={handleDownloadPDF} disabled={downloading} size="sm">
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : 'Download PDF'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8">
        <div
          className="web-report-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {reportData && (
        <ShareReportModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          reportId={reportData.id}
          shareToken={reportData.share_token}
          isPublic={reportData.is_public}
          archivedAt={reportData.archived_at}
          autoDeleteAt={reportData.auto_delete_at}
          onToggleSuccess={async () => {
            const updated = await getReportById(reportId!);
            if (updated) {
              setReportData(updated);
            }
          }}
        />
      )}
    </div>
  );
}
