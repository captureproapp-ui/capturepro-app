import { useState, useEffect } from 'react';
import { supabase, Profile, PropertyType } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Square, DoorOpen, Home, Flame, Layers } from 'lucide-react';

type MeasureType = {
  id: string;
  name: string;
  code: string;
  description: string;
  icon_name: string;
  color_class: string;
};

const measureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'square': Square,
  'door-open': DoorOpen,
  'home': Home,
  'flame': Flame,
  'layers': Layers,
};

type CreatePropertyFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function CreatePropertyForm({ onClose, onSuccess }: CreatePropertyFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installers, setInstallers] = useState<Profile[]>([]);
  const [availableMeasures, setAvailableMeasures] = useState<MeasureType[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    job_ref: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    installation_date: '',
    property_type: 'mid_terrace' as PropertyType,
    assigned_installer_ids: [] as string[],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.organisation_id) return;

      const { data: installersData, error: installersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organisation_id', profile.organisation_id)
        .eq('role', 'installer')
        .eq('is_active', true)
        .order('full_name');

      if (installersError) {
        console.error('Error fetching installers:', installersError);
      } else {
        setInstallers(installersData || []);
      }

      const { data: measuresData, error: measuresError } = await supabase
        .from('organisation_measures')
        .select(`
          measure_type_id,
          measure_types (
            id,
            name,
            code,
            description,
            icon_name,
            color_class
          )
        `)
        .eq('organisation_id', profile.organisation_id);

      if (measuresError) {
        console.error('Error fetching organisation measures:', measuresError);
      } else {
        const measures = measuresData
          ?.map(item => item.measure_types as unknown as MeasureType)
          .filter(Boolean) || [];
        setAvailableMeasures(measures);
      }
    };

    fetchData();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!profile?.organisation_id) {
      setError('Organisation not found');
      setLoading(false);
      return;
    }

    if (selectedMeasures.length === 0) {
      setError('Please select at least one measure type');
      setLoading(false);
      return;
    }

    const { data: propertyData, error: insertError } = await supabase
      .from('properties')
      .insert({
        organisation_id: profile.organisation_id,
        job_ref: formData.job_ref,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2 || null,
        city: formData.city,
        postcode: formData.postcode,
        installation_date: formData.installation_date,
        property_type: formData.property_type,
        assigned_installer_ids: formData.assigned_installer_ids,
        status: 'in_progress',
      })
      .select()
      .single();

    if (insertError || !propertyData) {
      setError(insertError?.message || 'Failed to create property');
      setLoading(false);
      return;
    }

    const propertyMeasures = selectedMeasures.map(measureTypeId => ({
      property_id: propertyData.id,
      measure_type_id: measureTypeId,
      created_by: profile.id,
    }));

    const { error: measuresError } = await supabase
      .from('property_measures')
      .insert(propertyMeasures);

    if (measuresError) {
      setError(`Property created but failed to add measures: ${measuresError.message}`);
      setLoading(false);
      return;
    }

    const { error: requirementsError } = await supabase.rpc(
      'generate_requirements_for_property_measures',
      { p_property_id: propertyData.id }
    );

    if (requirementsError) {
      console.error('Error generating photo requirements:', requirementsError);
    }

    setLoading(false);
    onSuccess();
  };

  const handleInstallerToggle = (installerId: string) => {
    setFormData((prev) => ({
      ...prev,
      assigned_installer_ids: prev.assigned_installer_ids.includes(installerId)
        ? prev.assigned_installer_ids.filter((id) => id !== installerId)
        : [...prev.assigned_installer_ids, installerId],
    }));
  };

  const handleMeasureToggle = (measureId: string) => {
    setSelectedMeasures((prev) =>
      prev.includes(measureId)
        ? prev.filter((id) => id !== measureId)
        : [...prev, measureId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Property</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Reference *
              </label>
              <input
                type="text"
                value={formData.job_ref}
                onChange={(e) => setFormData({ ...formData, job_ref: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                placeholder="e.g., JOB-2024-001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1 *
              </label>
              <input
                type="text"
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                placeholder="e.g., 123 Main Street"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                placeholder="e.g., London"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postcode *
              </label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                placeholder="e.g., SW1A 1AA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Installation Date *
              </label>
              <input
                type="date"
                value={formData.installation_date}
                onChange={(e) =>
                  setFormData({ ...formData, installation_date: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                value={formData.property_type}
                onChange={(e) =>
                  setFormData({ ...formData, property_type: e.target.value as PropertyType })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              >
                <option value="mid_terrace">Mid Terrace</option>
                <option value="end_terrace">End Terrace</option>
                <option value="detached">Detached</option>
                <option value="semi_detached">Semi Detached</option>
                <option value="bungalow">Bungalow</option>
                <option value="flat">Flat</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Measures Being Fitted *
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select what work will be done at this property. Photo requirements will be generated based on your selection.
              </p>
              {availableMeasures.length === 0 ? (
                <div className="border border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    No measures available. Please contact support to add measures to your organisation.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMeasures.map((measure) => {
                    const IconComponent = measureIcons[measure.icon_name] || Square;
                    const isSelected = selectedMeasures.includes(measure.id);
                    return (
                      <label
                        key={measure.id}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-electric-500 bg-electric-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleMeasureToggle(measure.id)}
                          className="mt-1 w-4 h-4 text-electric-500 border-gray-300 rounded focus:ring-electric-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <IconComponent className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-900">
                              {measure.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{measure.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Installers
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {installers.length === 0 ? (
                  <p className="text-sm text-gray-500">No installers available</p>
                ) : (
                  installers.map((installer) => (
                    <label
                      key={installer.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assigned_installer_ids.includes(installer.id)}
                        onChange={() => handleInstallerToggle(installer.id)}
                        className="w-4 h-4 text-electric-500 border-gray-300 rounded focus:ring-electric-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {installer.full_name}
                        </p>
                        <p className="text-xs text-gray-500">{installer.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
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
              {loading ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
