import { useState, useEffect } from 'react';
import { MapPin, Briefcase, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Property } from '../../lib/supabase';

type EditPropertyDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: PropertyDetailsUpdate) => Promise<void>;
  property: Property;
};

export type PropertyDetailsUpdate = {
  job_ref: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
};

type ValidationErrors = {
  job_ref?: string;
  address_line_1?: string;
  city?: string;
  postcode?: string;
};

export function EditPropertyDetailsModal({
  isOpen,
  onClose,
  onConfirm,
  property,
}: EditPropertyDetailsModalProps) {
  const [formData, setFormData] = useState<PropertyDetailsUpdate>({
    job_ref: '',
    address_line_1: '',
    address_line_2: null,
    city: '',
    postcode: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && property) {
      setFormData({
        job_ref: property.job_ref || '',
        address_line_1: property.address_line_1 || '',
        address_line_2: property.address_line_2 || null,
        city: property.city || '',
        postcode: property.postcode || '',
      });
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen, property]);

  const validateField = (name: keyof ValidationErrors, value: string): string | undefined => {
    const trimmed = value.trim();

    if (!trimmed) {
      return 'This field is required';
    }

    if (name === 'postcode') {
      const postcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i;
      if (!postcodeRegex.test(trimmed)) {
        return 'Please enter a valid UK postcode';
      }
    }

    if (name === 'job_ref' && trimmed.length < 2) {
      return 'Job reference must be at least 2 characters';
    }

    return undefined;
  };

  const handleFieldChange = (field: keyof PropertyDetailsUpdate, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field as keyof ValidationErrors]) {
      const error = validateField(field as keyof ValidationErrors, value);
      setErrors(prev => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    newErrors.job_ref = validateField('job_ref', formData.job_ref);
    newErrors.address_line_1 = validateField('address_line_1', formData.address_line_1);
    newErrors.city = validateField('city', formData.city);
    newErrors.postcode = validateField('postcode', formData.postcode);

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, v]) => v !== undefined)
    ) as ValidationErrors;

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  const hasChanges = (): boolean => {
    return (
      formData.job_ref.trim() !== property.job_ref ||
      formData.address_line_1.trim() !== property.address_line_1 ||
      (formData.address_line_2?.trim() || null) !== (property.address_line_2 || null) ||
      formData.city.trim() !== property.city ||
      formData.postcode.trim() !== property.postcode
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!hasChanges()) {
      setErrors({ job_ref: 'No changes have been made' });
      return;
    }

    setSaving(true);
    try {
      const updates: PropertyDetailsUpdate = {
        job_ref: formData.job_ref.trim(),
        address_line_1: formData.address_line_1.trim(),
        address_line_2: formData.address_line_2?.trim() || null,
        city: formData.city.trim(),
        postcode: formData.postcode.trim().toUpperCase(),
      };

      await onConfirm(updates);
      setSuccessMessage('Property details updated successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating property details:', error);
      setErrors({ job_ref: error instanceof Error ? error.message : 'Failed to update property details' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      job_ref: property.job_ref || '',
      address_line_1: property.address_line_1 || '',
      address_line_2: property.address_line_2 || null,
      city: property.city || '',
      postcode: property.postcode || '',
    });
    setErrors({});
    setSuccessMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Property Details" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Edit Job Reference and Address</p>
              <p className="text-sm text-gray-600 mt-1">
                Update the job reference and address details for this property
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="job_ref" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-4 h-4" />
              Job Reference *
            </label>
            <input
              type="text"
              id="job_ref"
              value={formData.job_ref}
              onChange={(e) => handleFieldChange('job_ref', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 outline-none transition-colors ${
                errors.job_ref ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., JOB-12345"
              disabled={saving}
            />
            {errors.job_ref && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.job_ref}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="address_line_1" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4" />
              Address Line 1 *
            </label>
            <input
              type="text"
              id="address_line_1"
              value={formData.address_line_1}
              onChange={(e) => handleFieldChange('address_line_1', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 outline-none transition-colors ${
                errors.address_line_1 ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 123 Main Street"
              disabled={saving}
            />
            {errors.address_line_1 && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.address_line_1}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="address_line_2" className="text-sm font-medium text-gray-700 mb-1 block">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              id="address_line_2"
              value={formData.address_line_2 || ''}
              onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 outline-none transition-colors"
              placeholder="e.g., Apartment 4B"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="text-sm font-medium text-gray-700 mb-1 block">
                City *
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 outline-none transition-colors ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., London"
                disabled={saving}
              />
              {errors.city && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.city}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="postcode" className="text-sm font-medium text-gray-700 mb-1 block">
                Postcode *
              </label>
              <input
                type="text"
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleFieldChange('postcode', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-electric-500 outline-none transition-colors ${
                  errors.postcode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., SW1A 1AA"
                disabled={saving}
              />
              {errors.postcode && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.postcode}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !hasChanges()}
            className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
