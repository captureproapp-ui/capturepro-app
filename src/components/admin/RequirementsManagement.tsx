import { useEffect, useState } from 'react';
import { supabase, Property } from '../../lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

type RequirementsManagementProps = {
  propertyId: string;
  onBack: () => void;
};

type PropertyRequirement = {
  id: string;
  template_id: string;
  required_qty: number;
  is_required: boolean;
  is_applicable: boolean;
  template_code: string;
  template_title: string;
  template_stage: string;
  template_scope: string;
};

export function RequirementsManagement({ propertyId, onBack }: RequirementsManagementProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [requirements, setRequirements] = useState<PropertyRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !propertyData) {
      console.error('Error fetching property:', propertyError);
      setLoading(false);
      return;
    }

    setProperty(propertyData);

    const { data: requirementsData, error: requirementsError } = await supabase
      .from('property_evidence_requirements')
      .select(`
        id,
        template_id,
        required_qty,
        is_required,
        is_applicable,
        evidence_item_templates(code, title, stage, scope)
      `)
      .eq('property_id', propertyId)
      .order('evidence_item_templates(sort_order)');

    if (requirementsError) {
      console.error('Error fetching requirements:', requirementsError);
      setLoading(false);
      return;
    }

    const formattedRequirements = (requirementsData || []).map((req: any) => ({
      id: req.id,
      template_id: req.template_id,
      required_qty: req.required_qty,
      is_required: req.is_required,
      is_applicable: req.is_applicable,
      template_code: req.evidence_item_templates.code,
      template_title: req.evidence_item_templates.title,
      template_stage: req.evidence_item_templates.stage,
      template_scope: req.evidence_item_templates.scope,
    }));

    setRequirements(formattedRequirements);
    setLoading(false);
  };

  const handleToggleApplicable = (requirementId: string) => {
    setRequirements((prev) =>
      prev.map((req) =>
        req.id === requirementId ? { ...req, is_applicable: !req.is_applicable } : req
      )
    );
  };

  const handleChangeQuantity = (requirementId: string, newQty: number) => {
    if (newQty < 0) return;
    setRequirements((prev) =>
      prev.map((req) => (req.id === requirementId ? { ...req, required_qty: newQty } : req))
    );
  };

  const handleSave = async () => {
    setSaving(true);

    const updates = requirements.map((req) => ({
      id: req.id,
      required_qty: req.required_qty,
      is_applicable: req.is_applicable,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('property_evidence_requirements')
        .update({
          required_qty: update.required_qty,
          is_applicable: update.is_applicable,
        })
        .eq('id', update.id);

      if (error) {
        console.error('Error updating requirement:', error);
        alert('Failed to save some requirements. Please try again.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    alert('Requirements saved successfully!');
    onBack();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Property not found</p>
        <button onClick={onBack} className="mt-4 text-electric-500 hover:text-electric-600 font-medium">
          Go Back
        </button>
      </div>
    );
  }

  const propertyRequirements = requirements.filter((r) => r.template_scope === 'property');
  const openingRequirements = requirements.filter((r) => r.template_scope === 'opening');

  const renderRequirement = (req: PropertyRequirement) => (
    <div key={req.id} className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium text-gray-900">{req.template_title}</h4>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                req.template_stage === 'pre'
                  ? 'bg-electric-100 text-electric-700'
                  : req.template_stage === 'during'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {req.template_stage}
            </span>
          </div>

          <div className="flex items-center gap-6 mt-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={req.is_applicable}
                onChange={() => handleToggleApplicable(req.id)}
                className="w-4 h-4 text-electric-500 border-gray-300 rounded focus:ring-electric-500"
              />
              <span className="text-sm text-gray-700">Applicable</span>
            </label>

            {req.is_applicable && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Required quantity:</label>
                <input
                  type="number"
                  min="0"
                  value={req.required_qty}
                  onChange={(e) => handleChangeQuantity(req.id, parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Manage Requirements</h2>
          <p className="text-gray-600 mt-1">
            {property.job_ref} - {property.address_line_1}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-electric-50 border border-electric-200 rounded-lg p-4">
        <p className="text-sm text-electric-700">
          Use this page to customize which photo requirements apply to this property and adjust the
          number of photos needed.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property-Level Requirements</h3>
          <div className="space-y-3">
            {propertyRequirements.map((req) => renderRequirement(req))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Opening-Level Requirements (per opening)
          </h3>
          <div className="space-y-3">
            {openingRequirements.map((req) => renderRequirement(req))}
          </div>
        </div>
      </div>
    </div>
  );
}
