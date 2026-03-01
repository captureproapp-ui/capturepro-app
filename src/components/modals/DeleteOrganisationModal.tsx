import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { getSupabaseUrl, getSupabaseAnonKey } from '../../lib/env';

interface DeleteOrganisationModalProps {
  organisation: {
    id: string;
    name: string;
    owner_email: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteOrganisationModal({ organisation, onClose, onSuccess }: DeleteOrganisationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'confirm' | 'deleting' | 'complete'>('confirm');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);
    setStep('deleting');

    try {
      const supabaseUrl = getSupabaseUrl();
      const anonKey = getSupabaseAnonKey();

      if (!supabaseUrl || !anonKey) {
        throw new Error('Missing Supabase configuration');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-organisation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organisation_id: organisation.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete organisation');
      }

      setStep('complete');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Error deleting organisation:', err);
      setError(err.message || 'An unexpected error occurred');
      setStep('confirm');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete Organisation</h2>
          </div>
          {step === 'confirm' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-medium mb-2">
                  Warning: This action cannot be undone!
                </p>
                <p className="text-red-700 text-sm">
                  Deleting this organisation will permanently remove all associated data.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Organisation Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Name: </span>
                      <span className="text-sm font-medium text-gray-900">{organisation.name}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Owner: </span>
                      <span className="text-sm font-medium text-gray-900">{organisation.owner_email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">The following data will be deleted:</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>All user accounts and authentication records</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>All properties and installation data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>All photos and PDF reports from storage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>All evidence requirements and checklists</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>All audit logs and notifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Stripe subscription (if active)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>The organisation record itself</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Type DELETE"
                    disabled={isDeleting}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={isDeleting || confirmText !== 'DELETE'}
                >
                  Delete Organisation
                </Button>
              </div>
            </>
          )}

          {step === 'deleting' && (
            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Deleting Organisation...</h3>
              <p className="text-sm text-gray-600">
                This may take a moment. Please do not close this window.
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Organisation Deleted</h3>
              <p className="text-sm text-gray-600">
                All data has been permanently removed from the system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
