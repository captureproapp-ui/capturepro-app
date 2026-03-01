import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { OrganisationStats } from '../../services/platformAnalyticsService';
import { suspendOrganisation, reactivateOrganisation } from '../../services/superAdminActionsService';

interface SuspendOrganisationModalProps {
  organisation: OrganisationStats;
  onClose: () => void;
}

export default function SuspendOrganisationModal({ organisation, onClose }: SuspendOrganisationModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSuspended = !!organisation.suspended_at;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isSuspended && !reason.trim()) {
      setError('Reason is required to suspend an organisation');
      return;
    }

    setLoading(true);
    try {
      if (isSuspended) {
        await reactivateOrganisation(organisation.id, reason);
      } else {
        await suspendOrganisation(organisation.id, reason);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isSuspended ? 'reactivate' : 'suspend'} organisation`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isSuspended ? 'Reactivate Organisation' : 'Suspend Organisation'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isSuspended && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Warning: This is a critical action</p>
                <p>Suspending this organisation will prevent all users from accessing the platform. This action can be reversed.</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 mb-4">
              {isSuspended ? (
                <>
                  Reactivate <span className="font-medium">{organisation.name}</span> to restore access for all users.
                </>
              ) : (
                <>
                  Suspend <span className="font-medium">{organisation.name}</span> to prevent access for all users.
                </>
              )}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Organisation:</span>
                <span className="font-medium">{organisation.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total users:</span>
                <span className="font-medium">{organisation.total_users}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active properties:</span>
                <span className="font-medium">{organisation.active_properties}</span>
              </div>
              {isSuspended && organisation.suspended_at && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Suspended since:</span>
                  <span className="font-medium">
                    {new Date(organisation.suspended_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason {isSuspended ? '(Optional)' : '(Required)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isSuspended ? 'Enter reason for reactivation...' : 'Enter reason for suspension...'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required={!isSuspended}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSuspended
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              disabled={loading}
            >
              {loading ? (
                isSuspended ? 'Reactivating...' : 'Suspending...'
              ) : (
                isSuspended ? 'Reactivate' : 'Suspend'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
