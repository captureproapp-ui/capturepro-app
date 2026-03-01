import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

const STANDARD_ROOMS = [
  'Living Room',
  'Dining Room',
  'Kitchen',
  'Bedroom 1',
  'Bedroom 2',
  'Bedroom 3',
  'Bedroom 4',
  'Bathroom',
  'En-suite',
  'Porch',
  'Conservatory',
  'Garage',
  'Integral Garage',
  'Converted Garage',
  'Utility Room',
  'Boot Room',
  'Study',
  'Landing',
  'Hallway',
  'Other',
];

type AddRoomFormProps = {
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddRoomForm({ propertyId, onClose, onSuccess }: AddRoomFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    area_name: '',
    custom_room_name: '',
    windows_to_replace_count: 0,
    doors_to_replace_count: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.windows_to_replace_count === 0 && formData.doors_to_replace_count === 0) {
      setError('Please specify at least one window or door to replace');
      return;
    }

    if (formData.area_name === 'Other' && !formData.custom_room_name.trim()) {
      setError('Please provide a custom room name');
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from('areas').insert({
      property_id: propertyId,
      area_name: formData.area_name,
      area_type: 'room',
      custom_room_name:
        formData.area_name === 'Other' ? formData.custom_room_name : null,
      windows_to_replace_count: formData.windows_to_replace_count,
      doors_to_replace_count: formData.doors_to_replace_count,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add Room</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Type *
            </label>
            <select
              value={formData.area_name}
              onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            >
              <option value="">Select a room type...</option>
              {STANDARD_ROOMS.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          {formData.area_name === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Room Name *
              </label>
              <input
                type="text"
                value={formData.custom_room_name}
                onChange={(e) =>
                  setFormData({ ...formData, custom_room_name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                placeholder="Enter custom room name"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Windows to Replace
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.windows_to_replace_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    windows_to_replace_count: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doors to Replace
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.doors_to_replace_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    doors_to_replace_count: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-electric-50 border border-electric-200 p-4 rounded-lg">
            <p className="text-sm text-electric-800">
              <strong>Note:</strong> Openings (Window 1, Window 2, etc.) will be automatically
              created based on the counts you specify above.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-electric-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Room...' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
