import { Home, TrendingUp, CheckCircle, Image, DoorOpen } from 'lucide-react';
import { PropertiesAnalytics } from '../../../services/platformAnalyticsService';

interface PropertiesAnalyticsSectionProps {
  analytics: PropertiesAnalytics | null;
}

export default function PropertiesAnalyticsSection({ analytics }: PropertiesAnalyticsSectionProps) {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Properties & Workflow Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.total_properties.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.completion_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Completion Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avg_completion_time_days} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Image className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Photos/Property</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avg_photos_per_property.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-amber-700">In Progress</span>
              <span className="text-lg font-bold text-amber-900">
                {analytics.by_status.in_progress.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Completed</span>
              <span className="text-lg font-bold text-green-900">
                {analytics.by_status.completed.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Archived</span>
              <span className="text-lg font-bold text-gray-900">
                {analytics.by_status.archived.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Creation Rate</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Last 24 Hours</span>
              <span className="text-lg font-bold text-green-900">
                {analytics.creation_rate.daily}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Last 7 Days</span>
              <span className="text-lg font-bold text-blue-900">
                {analytics.creation_rate.weekly}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-indigo-700">Last 30 Days</span>
              <span className="text-lg font-bold text-indigo-900">
                {analytics.creation_rate.monthly}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Type Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(analytics.by_type).map(([type, count]) => (
            <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-600 mt-1 capitalize">
                {type.replace('_', ' ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DoorOpen className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Avg Areas/Property</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {analytics.avg_areas_per_property.toFixed(1)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DoorOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Avg Openings/Property</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {analytics.avg_openings_per_property.toFixed(1)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Image className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Avg Photos/Property</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {analytics.avg_photos_per_property.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
