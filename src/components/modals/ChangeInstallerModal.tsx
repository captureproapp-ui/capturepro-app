import { useState, useEffect } from 'react';
import { X, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase, Profile } from '../../lib/supabase';

type ChangeInstallerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedInstallerIds: string[]) => Promise<void>;
  currentInstallerIds: string[];
  organisationId: string;
  propertyStatus: string;
};

export function ChangeInstallerModal({
  isOpen,
  onClose,
  onConfirm,
  currentInstallerIds,
  organisationId,
  propertyStatus,
}: ChangeInstallerModalProps) {
  const [installers, setInstallers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentInstallerIds));
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(currentInstallerIds));
      fetchInstallers();
      console.log('🔧 ChangeInstallerModal opened:', {
        propertyStatus,
        currentInstallerIds,
        organisationId
      });
    }
  }, [isOpen, currentInstallerIds, organisationId]);

  const fetchInstallers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('role', 'installer')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setInstallers(data || []);
      console.log('👥 Fetched installers:', data?.length || 0, 'active installers');
    } catch (error) {
      console.error('Error fetching installers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInstaller = (installerId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(installerId)) {
      newSelected.delete(installerId);
    } else {
      newSelected.add(installerId);
    }
    setSelectedIds(newSelected);
  };

  const handleNext = () => {
    setShowConfirmation(true);
  };

  const handleConfirmChange = async () => {
    setSaving(true);
    try {
      await onConfirm(Array.from(selectedIds));
      setShowConfirmation(false);
      onClose();
    } catch (error) {
      console.error('Error updating installers:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedIds(new Set(currentInstallerIds));
  };

  const currentInstallerNames = installers
    .filter((i) => currentInstallerIds.includes(i.id))
    .map((i) => i.full_name);

  const newInstallerNames = installers
    .filter((i) => selectedIds.has(i.id))
    .map((i) => i.full_name);

  const addedInstallers = newInstallerNames.filter((name) => !currentInstallerNames.includes(name));
  const removedInstallers = currentInstallerNames.filter((name) => !newInstallerNames.includes(name));

  const currentSet = new Set(currentInstallerIds);
  const selectedArray = Array.from(selectedIds);

  const hasChanges =
    currentSet.size !== selectedIds.size ||
    selectedArray.some(id => !currentSet.has(id)) ||
    currentInstallerIds.some(id => !selectedIds.has(id));

  console.log('🔄 Change detection:', {
    currentInstallerIds,
    selectedIds: Array.from(selectedIds),
    hasChanges,
    propertyStatus,
    addedCount: addedInstallers.length,
    removedCount: removedInstallers.length
  });

  if (showConfirmation) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Confirm Installer Changes">
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  This will change installer assignments for this property
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Please review the changes carefully before confirming.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Installers</h4>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                {currentInstallerNames.length > 0 ? (
                  <ul className="space-y-1">
                    {currentInstallerNames.map((name, index) => (
                      <li key={index} className="text-sm text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No installers assigned</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">New Installers</h4>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                {newInstallerNames.length > 0 ? (
                  <ul className="space-y-1">
                    {newInstallerNames.map((name, index) => (
                      <li
                        key={index}
                        className={`text-sm flex items-center gap-2 ${
                          addedInstallers.includes(name)
                            ? 'text-green-700 font-medium'
                            : 'text-gray-900'
                        }`}
                      >
                        <Users className={`w-4 h-4 ${addedInstallers.includes(name) ? 'text-green-600' : 'text-gray-400'}`} />
                        {name}
                        {addedInstallers.includes(name) && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Added</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No installers will be assigned</p>
                )}
              </div>
            </div>

            {removedInstallers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Removed</h4>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <ul className="space-y-1">
                    {removedInstallers.map((name, index) => (
                      <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-red-600" />
                        {name}
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Removed</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmChange}
              disabled={saving}
              className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Confirm Changes'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Assigned Installers">
      <div className="space-y-6">
        {propertyStatus !== 'in_progress' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Cannot change installers for {propertyStatus} properties
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Only properties with 'in_progress' status can have installer assignments changed.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
          </div>
        ) : installers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium">No Active Installers</p>
            <p className="text-gray-500 text-sm mt-1">
              There are no active installers in your organisation
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700">
                Select installers to assign to this property. You can assign multiple installers or leave it unassigned.
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="divide-y divide-gray-200">
                {installers.map((installer) => {
                  const isSelected = selectedIds.has(installer.id);
                  const isCurrentlyAssigned = currentInstallerIds.includes(installer.id);

                  return (
                    <button
                      key={installer.id}
                      onClick={() => handleToggleInstaller(installer.id)}
                      disabled={propertyStatus !== 'in_progress'}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-electric-500 border-electric-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{installer.full_name}</p>
                          <p className="text-sm text-gray-500">{installer.email}</p>
                        </div>
                      </div>
                      {isCurrentlyAssigned && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Currently Assigned
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedIds.size}</span> installer{selectedIds.size !== 1 ? 's' : ''} selected
              </div>

              {propertyStatus === 'in_progress' && !hasChanges && installers.length > 0 && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border border-gray-200">
                  Make changes to the selection to continue
                </div>
              )}

              {propertyStatus === 'in_progress' && (
                <div className="text-xs text-green-600 bg-green-50 rounded px-3 py-2 border border-green-200 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Property status: In Progress (can modify installers)
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={propertyStatus !== 'in_progress' || !hasChanges || installers.length === 0}
            className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            title={
              propertyStatus !== 'in_progress'
                ? 'Property must be in progress status'
                : !hasChanges
                ? 'Make changes to continue'
                : installers.length === 0
                ? 'No installers available'
                : 'Continue to confirmation'
            }
          >
            Next
          </button>
        </div>
      </div>
    </Modal>
  );
}
