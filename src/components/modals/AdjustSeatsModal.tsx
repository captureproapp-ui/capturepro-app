import { useState } from 'react';
import { X } from 'lucide-react';
import type { OrganisationStats } from '../../services/platformAnalyticsService';
import { adjustOrganisationSeats } from '../../services/superAdminActionsService';

interface AdjustSeatsModalProps {
  organisation: OrganisationStats;
  onClose: () => void;
}

export default function AdjustSeatsModal({ organisation, onClose }: AdjustSeatsModalProps) {
  const [newSeatLimit, setNewSeatLimit] = useState(organisation.seat_limit);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newSeatLimit < 1) {
      setError('Seat limit must be at least 1');
      return;
    }

    if (newSeatLimit < organisation.active_users) {
      setError(`Seat limit cannot be less than active users (${organisation.active_users})`);
      return;
    }

    if (newSeatLimit === organisation.seat_limit) {
      setError('New seat limit must be different from current limit');
      return;
    }

    setLoading(true);
    try {
      await adjustOrganisationSeats(organisation.id, newSeatLimit, reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust seats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Adjust Seat Limit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Adjust the seat limit for <span className="font-medium">{organisation.name}</span>
            </p>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current limit:</span>
                <span className="font-medium">{organisation.seat_limit} seats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active users:</span>
                <span className="font-medium">{organisation.active_users} users</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total users:</span>
                <span className="font-medium">{organisation.total_users} users</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Seat Limit
            </label>
            <input
              type="number"
              min="1"
              value={newSeatLimit}
              onChange={(e) => setNewSeatLimit(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for adjustment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Adjusting...' : 'Adjust Seats'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
