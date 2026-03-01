import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Archive, AlertTriangle, FileText } from 'lucide-react';
import { Property } from '../../lib/supabase';

interface ArchiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  properties: Property[];
  reportVersions?: Record<string, number>;
  isLoading?: boolean;
}

export function ArchiveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  properties,
  reportVersions = {},
  isLoading = false,
}: ArchiveConfirmationModalProps) {
  const isBulk = properties.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isBulk ? 'Archive Multiple Properties' : 'Archive Property'}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-orange-800">
              {isBulk ? 'Archive Multiple Properties' : 'Archive This Property'}
            </h4>
            <p className="text-sm text-orange-700 mt-1">
              {isBulk
                ? `${properties.length} properties will be moved to the Archive and removed from the main properties list.`
                : 'This property will be moved to the Archive and removed from the main properties list.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            {isBulk ? 'Properties to Archive:' : 'Property Details:'}
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {properties.map((property) => (
              <div key={property.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">{property.job_ref}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {property.address_line_1}, {property.city}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{property.postcode}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      <Archive className="w-3 h-3" />
                      {property.completion_percentage}%
                    </div>
                    {reportVersions[property.id] && (
                      <span className="text-xs text-gray-500">Report v{reportVersions[property.id]}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Archive className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">7-Year Retention Period</h4>
              <p className="text-sm text-blue-700 mt-1">
                {isBulk ? 'These properties' : 'This property'} will be retained in the archive for 7 years to comply
                with PAS2030 regulations. {isBulk ? 'They' : 'It'} can be accessed from the Archive section.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
            <Archive className="w-4 h-4" />
            {isLoading ? 'Archiving...' : isBulk ? `Archive ${properties.length} Properties` : 'Archive Property'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
