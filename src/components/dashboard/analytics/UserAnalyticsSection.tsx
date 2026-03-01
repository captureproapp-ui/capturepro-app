import { Users, UserCheck, UserPlus, Mail, AlertCircle } from 'lucide-react';
import { UserAnalytics } from '../../../services/platformAnalyticsService';

interface UserAnalyticsSectionProps {
  analytics: UserAnalytics | null;
}

export default function UserAnalyticsSection({ analytics }: UserAnalyticsSectionProps) {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.total_users.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.active_users.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((analytics.active_users / analytics.total_users) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">DAU</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.daily_active_users.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Daily Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">MAU</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.monthly_active_users.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Monthly Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Owners</span>
              <span className="text-lg font-bold text-gray-900">{analytics.by_role.owners}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Admins</span>
              <span className="text-lg font-bold text-gray-900">{analytics.by_role.admins}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Installers</span>
              <span className="text-lg font-bold text-gray-900">{analytics.by_role.installers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Super Admins</span>
              <span className="text-lg font-bold text-blue-900">{analytics.by_role.super_admins}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Registrations</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Last 24 Hours</span>
              <span className="text-lg font-bold text-green-900">{analytics.new_registrations.daily}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Last 7 Days</span>
              <span className="text-lg font-bold text-blue-900">{analytics.new_registrations.weekly}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-indigo-700">Last 30 Days</span>
              <span className="text-lg font-bold text-indigo-900">{analytics.new_registrations.monthly}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Invitation Statistics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{analytics.invitation_stats.sent}</p>
            <p className="text-sm text-gray-600 mt-1">Sent</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-900">{analytics.invitation_stats.pending}</p>
            <p className="text-sm text-amber-700 mt-1">Pending</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-900">{analytics.invitation_stats.accepted}</p>
            <p className="text-sm text-green-700 mt-1">Accepted</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-900">{analytics.invitation_stats.expired}</p>
            <p className="text-sm text-red-700 mt-1">Expired</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-900">
              {analytics.invitation_stats.conversion_rate.toFixed(1)}%
            </p>
            <p className="text-sm text-blue-700 mt-1">Conversion</p>
          </div>
        </div>
      </div>

      {analytics.inactive_users.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Inactive Users (30+ days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Inactive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.inactive_users.slice(0, 10).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.days_inactive}</td>
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
