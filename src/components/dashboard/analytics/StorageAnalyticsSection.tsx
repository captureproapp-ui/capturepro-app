import { HardDrive, TrendingUp, Image, FileText } from 'lucide-react';
import { StorageMetrics } from '../../../services/platformAnalyticsService';

interface StorageAnalyticsSectionProps {
  metrics: StorageMetrics | null;
  formatBytes: (bytes: number) => string;
}

export default function StorageAnalyticsSection({ metrics, formatBytes }: StorageAnalyticsSectionProps) {
  if (!metrics) return null;

  const photosPercentage = metrics.total_storage_bytes > 0
    ? (metrics.photos_storage_bytes / metrics.total_storage_bytes) * 100
    : 0;

  const pdfsPercentage = metrics.total_storage_bytes > 0
    ? (metrics.pdfs_storage_bytes / metrics.total_storage_bytes) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Storage Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <HardDrive className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.total_storage_bytes)}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: '45%' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">45% of allocated storage</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Image className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Photos Storage</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.photos_storage_bytes)}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full"
              style={{ width: `${photosPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{photosPercentage.toFixed(1)}% of total storage</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">PDFs Storage</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.pdfs_storage_bytes)}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-amber-600 h-2 rounded-full"
              style={{ width: `${pdfsPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{pdfsPercentage.toFixed(1)}% of total storage</p>
        </div>
      </div>

      {metrics.top_organisations_by_storage.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Organizations by Storage</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage Used</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.top_organisations_by_storage.map((org) => (
                  <tr key={org.organisation_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{org.organisation_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatBytes(org.storage_bytes)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {((org.storage_bytes / metrics.total_storage_bytes) * 100).toFixed(2)}%
                    </td>
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
