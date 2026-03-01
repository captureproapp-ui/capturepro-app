import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Ban, CheckCircle, Eye, Trash2 } from 'lucide-react';
import type { OrganisationStats } from '../../services/platformAnalyticsService';
import AdjustSeatsModal from '../modals/AdjustSeatsModal';
import SuspendOrganisationModal from '../modals/SuspendOrganisationModal';
import OrganisationDetailModal from '../modals/OrganisationDetailModal';
import { DeleteOrganisationModal } from '../modals/DeleteOrganisationModal';

interface OrganizationsTableProps {
  organisations: OrganisationStats[];
  onUpdate: () => void;
}

type SortField = 'name' | 'created_at' | 'total_users' | 'active_properties' | 'storage_used_bytes' | 'monthly_revenue_cents';
type SortDirection = 'asc' | 'desc';

export default function OrganizationsTable({ organisations, onUpdate }: OrganizationsTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<OrganisationStats | null>(null);
  const [showAdjustSeatsModal, setShowAdjustSeatsModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredOrgs = organisations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedOrgs = [...filteredOrgs].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * modifier;
    }

    return ((aVal as number) - (bVal as number)) * modifier;
  });

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
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (org: OrganisationStats) => {
    if (org.suspended_at) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Suspended
        </span>
      );
    }

    switch (org.subscription_status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Trial
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Canceled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {org.subscription_status}
          </span>
        );
    }
  };

  const handleAdjustSeats = (org: OrganisationStats) => {
    setSelectedOrg(org);
    setShowAdjustSeatsModal(true);
  };

  const handleSuspend = (org: OrganisationStats) => {
    setSelectedOrg(org);
    setShowSuspendModal(true);
  };

  const handleViewDetails = (org: OrganisationStats) => {
    setSelectedOrg(org);
    setShowDetailModal(true);
  };

  const handleDelete = (org: OrganisationStats) => {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const handleModalClose = () => {
    setShowAdjustSeatsModal(false);
    setShowSuspendModal(false);
    setShowDetailModal(false);
    setShowDeleteModal(false);
    setSelectedOrg(null);
    onUpdate();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search organisations by name or owner email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Organisation
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('created_at')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Created
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th
                onClick={() => handleSort('total_users')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Users
                  <SortIcon field="total_users" />
                </div>
              </th>
              <th
                onClick={() => handleSort('active_properties')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Properties
                  <SortIcon field="active_properties" />
                </div>
              </th>
              <th
                onClick={() => handleSort('storage_used_bytes')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Storage
                  <SortIcon field="storage_used_bytes" />
                </div>
              </th>
              <th
                onClick={() => handleSort('monthly_revenue_cents')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  MRR
                  <SortIcon field="monthly_revenue_cents" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedOrgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">{org.name}</div>
                    <div className="text-sm text-gray-500">{org.owner_email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(org.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className={org.active_users >= org.seat_limit ? 'text-red-600 font-medium' : ''}>
                      {org.active_users} / {org.seat_limit}
                    </span>
                    <span className="text-xs text-gray-500">
                      {org.total_users} total
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span>{org.active_properties} active</span>
                    <span className="text-xs text-gray-500">
                      {org.total_properties} total
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatBytes(org.storage_used_bytes)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(org.monthly_revenue_cents)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(org)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(org)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAdjustSeats(org)}
                      className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                      title="Adjust Seats"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    {org.suspended_at ? (
                      <button
                        onClick={() => handleSuspend(org)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                        title="Reactivate"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(org)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Suspend"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(org)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete Organisation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedOrgs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No organisations found matching your search.
          </div>
        )}
      </div>

      {selectedOrg && showAdjustSeatsModal && (
        <AdjustSeatsModal
          organisation={selectedOrg}
          onClose={handleModalClose}
        />
      )}

      {selectedOrg && showSuspendModal && (
        <SuspendOrganisationModal
          organisation={selectedOrg}
          onClose={handleModalClose}
        />
      )}

      {selectedOrg && showDetailModal && (
        <OrganisationDetailModal
          organisation={selectedOrg}
          onClose={handleModalClose}
        />
      )}

      {selectedOrg && showDeleteModal && (
        <DeleteOrganisationModal
          organisation={selectedOrg}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleModalClose}
        />
      )}
    </div>
  );
}
