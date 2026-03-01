import { Image, Upload, HardDrive } from 'lucide-react';
import { PhotoAnalytics } from '../../../services/platformAnalyticsService';

interface PhotoAnalyticsSectionProps {
  analytics: PhotoAnalytics | null;
  formatBytes: (bytes: number) => string;
}

export default function PhotoAnalyticsSection({ analytics, formatBytes }: PhotoAnalyticsSectionProps) {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Photo & Media Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Image className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Photos</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.total_photos.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg/Property</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avg_per_property.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg/Opening</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avg_per_opening.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <HardDrive className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(analytics.storage_bytes)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos by Stage</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Pre-Installation</span>
              <span className="text-lg font-bold text-blue-900">
                {analytics.by_stage.pre.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-amber-700">During Installation</span>
              <span className="text-lg font-bold text-amber-900">
                {analytics.by_stage.during.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Post-Installation</span>
              <span className="text-lg font-bold text-green-900">
                {analytics.by_stage.post.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Rate</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Last 24 Hours</span>
              <span className="text-lg font-bold text-green-900">
                {analytics.upload_rate.daily.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Last 7 Days</span>
              <span className="text-lg font-bold text-blue-900">
                {analytics.upload_rate.weekly.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-indigo-700">Last 30 Days</span>
              <span className="text-lg font-bold text-indigo-900">
                {analytics.upload_rate.monthly.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(analytics.by_type).map(([type, count]) => (
            <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1 capitalize">{type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
