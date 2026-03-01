import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Property, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FolderOpen, Users, Clock, CheckCircle, TrendingUp, HelpCircle, CreditCard, AlertCircle } from 'lucide-react';
import { SubscriptionModal } from '../support/SubscriptionModal';

export function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [installers, setInstallers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.organisation_id) {
        setLoading(false);
        return;
      }

      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 10000);

      try {
        const [propertiesResult, installersResult] = await Promise.all([
          supabase
            .from('properties')
            .select('*')
            .eq('organisation_id', profile.organisation_id)
            .neq('status', 'archived')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('*')
            .eq('organisation_id', profile.organisation_id)
            .eq('role', 'installer')
            .order('is_active', { ascending: false })
            .order('full_name'),
        ]);

        clearTimeout(timeoutId);

        if (propertiesResult.error) {
          console.error('Error fetching properties:', propertiesResult.error);
        } else {
          setProperties(propertiesResult.data || []);
        }

        if (installersResult.error) {
          console.error('Error fetching installers:', installersResult.error);
        } else {
          setInstallers(installersResult.data || []);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const inProgressCount = properties.filter((p) => p.status === 'in_progress').length;
  const completedCount = properties.filter((p) => p.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!profile?.organisation_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="bg-orange-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Organisation Access</h3>
          <p className="text-gray-600 mb-6">
            This dashboard requires organisation membership.
            {profile?.super_admin && ' As a super admin, please use Platform Analytics instead.'}
          </p>
          {profile?.super_admin && (
            <button
              onClick={() => navigate('/platform-analytics')}
              className="px-6 py-3 bg-gradient-to-r from-electric-500 to-electric-600 text-white rounded-xl font-semibold hover:from-electric-600 hover:to-electric-700 transition-all shadow-lg shadow-electric-500/30 active:scale-95"
            >
              Go to Platform Analytics
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-1.5">Organisation overview and insights</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:capturepro.app@gmail.com?subject=Support Request from ${encodeURIComponent(profile?.full_name || 'Admin')}`}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
            Support
          </a>
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-600 text-white rounded-xl font-semibold hover:from-electric-600 hover:to-electric-700 transition-all shadow-lg shadow-electric-500/30 active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            Subscription
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Total Properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{properties.length}</p>
            </div>
            <div className="p-3 bg-electric-50 rounded-xl group-hover:bg-electric-100 transition-colors">
              <FolderOpen className="w-7 h-7 text-electric-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{inProgressCount}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
              <Clock className="w-7 h-7 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{completedCount}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Active Installers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{installers.length}</p>
            </div>
            <div className="p-3 bg-electric-50 rounded-xl group-hover:bg-electric-100 transition-colors">
              <Users className="w-7 h-7 text-electric-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900">Recent Properties</h3>
          </div>
          <div className="divide-y divide-gray-200/60">
            {properties.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FolderOpen className="w-14 h-14 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">No properties yet</p>
              </div>
            ) : (
              properties.slice(0, 5).map((property) => (
                <div key={property.id} className="p-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-electric-600 transition-colors">{property.job_ref}</h4>
                      <p className="text-sm text-gray-600 mt-1.5">
                        {property.address_line_1}, {property.city}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                          property.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : property.status === 'archived'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {property.status.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">
                        {new Date(property.installation_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900">Installer Workload</h3>
          </div>
          <div className="divide-y divide-gray-200/60">
            {installers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-14 h-14 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">No installers yet</p>
              </div>
            ) : (
              installers.map((installer) => {
                const assignedCount = properties.filter((p) =>
                  p.assigned_installer_ids.includes(installer.id)
                ).length;
                const activeCount = properties.filter(
                  (p) =>
                    p.assigned_installer_ids.includes(installer.id) &&
                    p.status === 'in_progress'
                ).length;

                return (
                  <div key={installer.id} className="p-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">
                          {installer.full_name}
                          {!installer.is_active && (
                            <span className="text-gray-500 text-sm ml-2 font-normal">(inactive)</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1.5">{installer.email}</p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">
                            {assignedCount} total
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5 font-medium">{activeCount} active</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showSubscriptionModal && <SubscriptionModal onClose={() => setShowSubscriptionModal(false)} />}
    </div>
  );
}
