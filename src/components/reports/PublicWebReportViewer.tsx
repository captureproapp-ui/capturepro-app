import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Printer, AlertCircle } from 'lucide-react';
import { getReportByShareToken, downloadReport, incrementReportViewCount } from '../../services/reportStorage';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';

export function PublicWebReportViewer() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!shareToken) return;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const report = await getReportByShareToken(shareToken);

        if (!report) {
          setError('Report not found or no longer available');
          return;
        }

        if (!report.web_report_html) {
          setError('Web version not available for this report. Please download the PDF instead.');
          return;
        }

        setReportData(report);
        setHtmlContent(report.web_report_html);

        await incrementReportViewCount(report.id);
      } catch (err) {
        console.error('Error loading report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [shareToken]);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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
              {error === 'Report not found or no longer available' ? (
                <AlertCircle className="w-8 h-8 text-red-600" />
              ) : (
                <FileText className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Available</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load report'}</p>
            {error === 'Report not found or no longer available' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  This report may have been made private or has been deleted after the 7-year retention period.
                </p>
              </div>
            )}
            {reportData?.file_url && (
              <Button onClick={handleDownloadPDF} disabled={downloading}>
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            )}
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
              <h1 className="text-lg font-semibold text-gray-900">
                PAS2030 Property Report
              </h1>
            </div>

            <div className="flex items-center gap-3">
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
    </div>
  );
}
