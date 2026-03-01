import { Ruler, Building2, Home, DollarSign } from 'lucide-react';
import { MeasureTypeAnalytics } from '../../../services/platformAnalyticsService';

interface MeasureTypesSectionProps {
  analytics: MeasureTypeAnalytics | null;
  formatCurrency: (cents: number) => string;
}

export default function MeasureTypesSection({ analytics, formatCurrency }: MeasureTypesSectionProps) {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Measure Types Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Ruler className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Measure Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.total_types}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Ruler className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.active_types}
              </p>
            </div>
          </div>
        </div>
      </div>

      {analytics.usage_by_type.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Measure Type</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Measure Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.usage_by_type.map((measure) => (
                  <tr key={measure.measure_name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{measure.measure_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {measure.organization_count}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-gray-400" />
                        {measure.property_count}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        {formatCurrency(measure.revenue_cents)}
                      </div>
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
