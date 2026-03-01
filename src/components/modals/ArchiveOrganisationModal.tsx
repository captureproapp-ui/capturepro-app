import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

interface ArchiveOrganisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisationId: string;
  organisationName: string;
  userCount?: number;
  propertyCount?: number;
  onSuccess: () => void;
}

export function ArchiveOrganisationModal({
  isOpen,
  onClose,
  organisationId,
  organisationName,
  userCount = 0,
  propertyCount = 0,
  onSuccess,
}: ArchiveOrganisationModalProps) {
  const [reason, setReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for archiving this organisation');
      return;
    }

    setIsArchiving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/archive-organisation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            organisationId,
            reason: reason.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to archive organisation');
      }

      onSuccess();
      onClose();
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive organisation');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Archive Organisation">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Warning: Organisation Suspension</h4>
          <p className="text-sm text-amber-800">
            Archiving <strong>{organisationName}</strong> will:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-800 mt-2 space-y-1">
            <li>Pause the Stripe subscription (no charges while archived)</li>
            <li>Suspend access for all {userCount} user{userCount !== 1 ? 's' : ''}</li>
            <li>Archive complete data snapshot including {propertyCount} propert{propertyCount !== 1 ? 'ies' : 'y'}</li>
            <li>Retain data for 90 days before manual deletion option appears</li>
            <li>Allow full restoration during the retention period</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reason for Archiving
          </label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Non-payment, Requested closure, Policy violation, etc."
            disabled={isArchiving}
          />
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
            disabled={isArchiving}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleArchive}
            disabled={isArchiving || !reason.trim()}
          >
            {isArchiving ? 'Archiving...' : 'Archive Organisation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
