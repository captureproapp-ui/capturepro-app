import { FileText, Eye, Mail, Share2 } from 'lucide-react';
import { ReportAnalytics } from '../../../services/platformAnalyticsService';

interface ReportsAnalyticsSectionProps {
  analytics: ReportAnalytics | null;
  formatBytes: (bytes: number) => string;
}

export default function ReportsAnalyticsSection({ analytics, formatBytes }: ReportsAnalyticsSectionProps) {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">PDF Reports Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.total_reports.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.total_views.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Eye className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Views/Report</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avg_views_per_report.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg File Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(analytics.avg_file_size_bytes)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Report Sharing</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Public Reports</span>
              <span className="text-lg font-bold text-green-900">
                {analytics.public_reports.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Private Reports</span>
              <span className="text-lg font-bold text-gray-900">
                {analytics.private_reports.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Email Delivery</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Sent</span>
              <span className="text-lg font-bold text-green-900">
                {analytics.email_stats.sent.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-amber-700">Pending</span>
              <span className="text-lg font-bold text-amber-900">
                {analytics.email_stats.pending.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-700">Failed</span>
              <span className="text-lg font-bold text-red-900">
                {analytics.email_stats.failed.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {analytics.most_viewed.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Most Viewed Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.most_viewed.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{report.property_address}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{report.view_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
