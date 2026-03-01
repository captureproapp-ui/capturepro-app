import { useState } from 'react';
import { X, Copy, Check, Globe, Lock, AlertCircle, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toggleReportPublicAccess } from '../../services/reportStorage';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  shareToken: string;
  isPublic: boolean;
  archivedAt?: string | null;
  autoDeleteAt?: string | null;
  onToggleSuccess?: () => void;
}

export function ShareReportModal({
  isOpen,
  onClose,
  reportId,
  shareToken,
  isPublic: initialIsPublic,
  archivedAt,
  autoDeleteAt,
  onToggleSuccess,
}: ShareReportModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const shareUrl = `${window.location.origin}/share/${shareToken}`;

  const handleTogglePublic = async () => {
    try {
      setToggling(true);
      const newValue = !isPublic;
      await toggleReportPublicAccess(reportId, newValue);
      setIsPublic(newValue);
      onToggleSuccess?.();
    } catch (err) {
      console.error('Failed to toggle public access:', err);
      alert('Failed to update sharing settings. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Report">
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-900">
                {isPublic ? 'Public Access Enabled' : 'Private Report'}
              </h3>
              <p className="text-sm text-gray-600">
                {isPublic
                  ? 'Anyone with the link can view this report'
                  : 'Only organization members can access'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 ${
              isPublic ? 'bg-electric-600' : 'bg-gray-300'
            } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {isPublic && (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Public Access Warning</p>
                  <p>
                    This report will be accessible to anyone with the link. Make sure it
                    doesn't contain sensitive information you don't want to share publicly.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 font-mono"
                  />
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="secondary"
                  size="sm"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleOpenLink}
                  variant="secondary"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </Button>
              </div>
            </div>

            {autoDeleteAt && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Link Validity Period</p>
                    <p>
                      {archivedAt
                        ? `This link will remain valid until ${formatDate(
                            autoDeleteAt
                          )} (7 years after archival).`
                        : 'This link will remain valid for 7 years after the report is archived.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!autoDeleteAt && !archivedAt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Active Report</p>
                  <p>
                    This report is currently active. It will be retained for 7 years after
                    being archived, and the share link will remain valid for that entire
                    period.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {!isPublic && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">
              Enable public access to generate a shareable link for this report.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
