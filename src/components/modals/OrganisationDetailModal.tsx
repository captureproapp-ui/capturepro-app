import { useState, useEffect } from 'react';
import { X, Users, Building2, History, CreditCard, Archive } from 'lucide-react';
import type { OrganisationStats } from '../../services/platformAnalyticsService';
import {
  getOrganisationUsers,
  getOrganisationProperties,
  getAuditLogs,
  type AuditLog,
} from '../../services/superAdminActionsService';
import { supabase } from '../../lib/supabase';
import { SubscriptionManagement } from './SubscriptionManagement';
import { ArchiveUserModal } from './ArchiveUserModal';
import { ArchiveOrganisationModal } from './ArchiveOrganisationModal';
import { Button } from '../ui/Button';

interface OrganisationDetailModalProps {
  organisation: OrganisationStats;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function OrganisationDetailModal({ organisation, onClose, onRefresh }: OrganisationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'users' | 'archived_users' | 'properties' | 'audit'>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchiveUserModal, setShowArchiveUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showArchiveOrgModal, setShowArchiveOrgModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const userData = await getOrganisationUsers(organisation.id);
        setUsers(userData);
      } else if (activeTab === 'archived_users') {
        const { data } = await supabase
          .from('archived_users')
          .select('*')
          .eq('organisation_id', organisation.id)
          .order('archived_at', { ascending: false });
        setArchivedUsers(data || []);
      } else if (activeTab === 'properties') {
        const propertyData = await getOrganisationProperties(organisation.id);
        setProperties(propertyData);
      } else if (activeTab === 'audit') {
        const auditData = await getAuditLogs(organisation.id);
        setAuditLogs(auditData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveUser = (user: any) => {
    setSelectedUser(user);
    setShowArchiveUserModal(true);
  };

  const handleArchiveSuccess = () => {
    loadData();
    if (onRefresh) onRefresh();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{organisation.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{organisation.owner_email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'subscription'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Subscription
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users ({organisation.total_users})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('archived_users')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'archived_users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archived Users
              </div>
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'properties'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Properties ({organisation.total_properties})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Audit Log
              </div>
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Organisation Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{formatDate(organisation.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">{organisation.owner_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${organisation.suspended_at ? 'text-red-600' : 'text-green-600'}`}>
                        {organisation.suspended_at ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Subscription Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium capitalize">{organisation.subscription_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium">{organisation.subscription_plan || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MRR:</span>
                      <span className="font-medium">{formatCurrency(organisation.monthly_revenue_cents)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Users & Seats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seat limit:</span>
                      <span className="font-medium">{organisation.seat_limit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active users:</span>
                      <span className={`font-medium ${organisation.active_users >= organisation.seat_limit ? 'text-red-600' : ''}`}>
                        {organisation.active_users}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total users:</span>
                      <span className="font-medium">{organisation.total_users}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Properties & Storage</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active properties:</span>
                      <span className="font-medium">{organisation.active_properties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total properties:</span>
                      <span className="font-medium">{organisation.total_properties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage used:</span>
                      <span className="font-medium">{formatBytes(organisation.storage_used_bytes)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={() => setShowArchiveOrgModal(true)}
                  className="flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive Organisation
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <SubscriptionManagement
              organisation={organisation}
              onRefresh={() => {
                if (onRefresh) onRefresh();
              }}
            />
          )}

          {activeTab === 'users' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                          {!user.is_active && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        {user.is_active && user.role !== 'owner' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleArchiveUser(user)}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No users found</div>
              )}
            </div>
          )}

          {activeTab === 'archived_users' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading archived users...</div>
              ) : archivedUsers.length > 0 ? (
                <div className="space-y-2">
                  {archivedUsers.map((archivedUser) => {
                    const userData = archivedUser.user_data as any;
                    return (
                      <div key={archivedUser.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{userData.full_name}</p>
                            <p className="text-sm text-gray-600">{userData.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Archived: {formatDate(archivedUser.archived_at)}
                            </p>
                            {archivedUser.archived_reason && (
                              <p className="text-xs text-gray-600 mt-1">
                                Reason: {archivedUser.archived_reason}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Archived
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No archived users found</div>
              )}
            </div>
          )}

          {activeTab === 'properties' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading properties...</div>
              ) : properties.length > 0 ? (
                <div className="space-y-2">
                  {properties.map((property) => (
                    <div key={property.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{property.job_ref}</p>
                          <p className="text-sm text-gray-600">
                            {property.address_line_1}, {property.city} {property.postcode}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          property.status === 'completed' ? 'bg-green-100 text-green-800' :
                          property.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No properties found</div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
              ) : auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {log.action_type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-600">
                          Performed by: <span className="font-medium">{log.performer_name}</span>
                        </p>
                        {log.reason && (
                          <p className="text-gray-600">
                            Reason: <span className="font-medium">{log.reason}</span>
                          </p>
                        )}
                        {log.changes_made && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              View changes
                            </summary>
                            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.changes_made, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No audit logs found</div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {selectedUser && (
        <ArchiveUserModal
          isOpen={showArchiveUserModal}
          onClose={() => {
            setShowArchiveUserModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.id}
          userName={selectedUser.full_name}
          userEmail={selectedUser.email}
          onSuccess={handleArchiveSuccess}
        />
      )}

      <ArchiveOrganisationModal
        isOpen={showArchiveOrgModal}
        onClose={() => setShowArchiveOrgModal(false)}
        organisationId={organisation.id}
        organisationName={organisation.name}
        userCount={organisation.total_users}
        propertyCount={organisation.total_properties}
        onSuccess={() => {
          setShowArchiveOrgModal(false);
          if (onRefresh) onRefresh();
          onClose();
        }}
      />
    </div>
  );
}
