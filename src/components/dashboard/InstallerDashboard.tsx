import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FolderOpen, Clock, CheckCircle, ChevronRight, HelpCircle, CreditCard } from 'lucide-react';
import { getInstallerAssignedJobs, InstallerJob } from '../../services/installerJobsService';
import { SubscriptionModal } from '../support/SubscriptionModal';

type InstallerDashboardProps = {
  onSelectProperty?: (propertyId: string) => void;
};

export function InstallerDashboard({ onSelectProperty }: InstallerDashboardProps) {
  const { user, profile } = useAuth();
  const [properties, setProperties] = useState<InstallerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    const fetchMyJobs = async () => {
      if (!user || !profile) return;

      const jobs = await getInstallerAssignedJobs(user.id, profile.organisation_id);
      setProperties(jobs);
      setLoading(false);
    };

    fetchMyJobs();
  }, [user, profile]);

  const inProgressCount = properties.filter(
    (p) => p.status === 'in_progress' || (p.status !== 'completed' && p.status !== 'archived')
  ).length;
  const completedCount = properties.filter(
    (p) => p.status === 'completed' || p.completion_percentage === 100
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Dashboard</h2>
          <p className="text-gray-600 mt-1.5">Overview of your assigned jobs</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:capturepro.app@gmail.com?subject=Support Request from ${encodeURIComponent(profile?.full_name || 'User')}`}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
            Support
          </a>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-600 text-white rounded-xl font-semibold hover:from-electric-600 hover:to-electric-700 transition-all shadow-lg shadow-electric-500/30 active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              Subscription
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Total Jobs</p>
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
      </div>

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-bold text-gray-900">My Jobs</h3>
        </div>
        <div className="divide-y divide-gray-200/60">
          {!loading && properties.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FolderOpen className="w-14 h-14 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">No jobs assigned yet</p>
            </div>
          ) : (
            properties.map((property) => (
              <button
                key={property.property_id}
                onClick={() => onSelectProperty?.(property.property_id)}
                className="w-full p-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 group-hover:text-electric-600 transition-colors">{property.job_ref}</h4>
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
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {property.address_line_1}, {property.city}
                    </p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex-1 w-full">
                        <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
                          <span>Completion</span>
                          <span className="text-gray-900">{property.completion_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              property.completion_percentage === 100
                                ? 'bg-gradient-to-r from-success-500 to-success-600'
                                : property.completion_percentage >= 50
                                ? 'bg-gradient-to-r from-electric-500 to-electric-600'
                                : 'bg-gradient-to-r from-orange-500 to-orange-600'
                            }`}
                            style={{ width: `${property.completion_percentage}%` }}
                          />
                        </div>
                      </div>

                      {property.unfinished_openings_count > 0 && (
                        <div className="text-xs text-gray-600 font-medium whitespace-nowrap">
                          <span className="font-bold text-orange-600">
                            {property.unfinished_openings_count}
                          </span>
                          <span className="text-gray-500">/{property.total_openings_count}</span> incomplete
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0 group-hover:text-electric-600 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {showSubscriptionModal && <SubscriptionModal onClose={() => setShowSubscriptionModal(false)} />}
    </div>
  );
}
