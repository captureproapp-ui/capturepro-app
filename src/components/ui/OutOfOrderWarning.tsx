import { AlertTriangle, X } from 'lucide-react';

interface OutOfOrderWarningProps {
  isOpen: boolean;
  targetItemTitle: string;
  stageWarning: string | null;
  skippedItems: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function OutOfOrderWarning({
  isOpen,
  targetItemTitle,
  stageWarning,
  skippedItems,
  onConfirm,
  onCancel,
}: OutOfOrderWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Photos may be out of order
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                {stageWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
                    {stageWarning}
                  </div>
                )}
                {skippedItems.length > 0 && (
                  <div>
                    <p className="mb-2">
                      The following items before <span className="font-semibold text-gray-900">"{targetItemTitle}"</span> have not been photographed yet:
                    </p>
                    <ul className="space-y-1">
                      {skippedItems.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">&#8226;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-gray-500">
                  You can still continue, but it is recommended to take photos in order.
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
