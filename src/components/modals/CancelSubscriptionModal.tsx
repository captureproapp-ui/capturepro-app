import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisationId: string;
  organisationName: string;
  currentPeriodEnd?: string;
  onSuccess: () => void;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  organisationId,
  organisationName,
  currentPeriodEnd,
  onSuccess,
}: CancelSubscriptionModalProps) {
  const [reason, setReason] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            organisationId,
            reason: reason.trim() || undefined,
            cancelImmediately,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      onSuccess();
      onClose();
      setReason('');
      setCancelImmediately(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Subscription">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">Warning: Subscription Cancellation</h4>
          <p className="text-sm text-red-800">
            Cancelling the subscription for <strong>{organisationName}</strong> will:
          </p>
          <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
            {cancelImmediately ? (
              <>
                <li>Immediately cancel the subscription</li>
                <li>Revoke access to all users right away</li>
                <li>Stop all billing immediately</li>
              </>
            ) : (
              <>
                <li>Schedule cancellation for end of billing period ({formatDate(currentPeriodEnd)})</li>
                <li>Allow continued access until cancellation date</li>
                <li>Prevent renewal at the end of the period</li>
              </>
            )}
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reason for Cancellation (Optional)
          </label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer request, Non-payment, etc."
            disabled={isCancelling}
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="cancelImmediately"
            checked={cancelImmediately}
            onChange={(e) => setCancelImmediately(e.target.checked)}
            disabled={isCancelling}
            className="mt-1"
          />
          <label htmlFor="cancelImmediately" className="text-sm text-slate-700">
            Cancel immediately (instead of at period end)
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isCancelling}
          >
            Keep Subscription
          </Button>
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
