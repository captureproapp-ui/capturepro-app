import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, MeasureType } from '../../lib/supabase';
import {
  Building2,
  CreditCard,
  Package,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
interface OrganisationMeasure {
  id: string;
  measure_type_id: string;
  is_primary: boolean;
  stripe_subscription_item_id: string | null;
}

interface Organisation {
  id: string;
  name: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
}

export function OrganisationSettings() {
  const { profile } = useAuth();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [measureTypes, setMeasureTypes] = useState<MeasureType[]>([]);
  const [organisationMeasures, setOrganisationMeasures] = useState<OrganisationMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.organisation_id) {
      setLoading(false);
      return;
    }

    try {
      const [orgResult, measuresResult, orgMeasuresResult] = await Promise.all([
        supabase
          .from('organisations')
          .select('id, name, stripe_customer_id, stripe_subscription_id, subscription_status')
          .eq('id', profile.organisation_id)
          .single(),
        supabase
          .from('measure_types')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('organisation_measures')
          .select('id, measure_type_id, is_primary, stripe_subscription_item_id')
          .eq('organisation_id', profile.organisation_id),
      ]);

      if (orgResult.error) throw orgResult.error;
      if (measuresResult.error) throw measuresResult.error;
      if (orgMeasuresResult.error) throw orgMeasuresResult.error;

      setOrganisation(orgResult.data);
      setMeasureTypes(measuresResult.data);
      setOrganisationMeasures(orgMeasuresResult.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load organisation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeasure = async (measureTypeId: string) => {
    setProcessing(measureTypeId);
    setError('');
    setSuccess('');

    try {
      const measureType = measureTypes.find(m => m.id === measureTypeId);

      if (measureType?.stripe_payment_link_url) {
        const paymentUrl = new URL(measureType.stripe_payment_link_url);
        if (profile?.email) {
          paymentUrl.searchParams.set('prefilled_email', profile.email);
        }
        window.location.href = paymentUrl.toString();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (!organisation?.stripe_subscription_id) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              priceId: 'price_starter_monthly',
              organisationName: organisation?.name || 'Organisation',
              adminFullName: profile?.full_name || 'Admin',
              adminEmail: profile?.email || '',
              seatLimit: 5,
              measureTypeId,
            }),
          }
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create checkout session');
        }

        if (result.url) {
          window.location.href = result.url;
        } else if (result.sessionId) {
          window.location.href = `https://checkout.stripe.com/c/pay/${result.sessionId}`;
        }
        return;
      }

      setError('Please use the payment link to add this measure');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add measure');
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveMeasure = async (measureTypeId: string) => {
    setProcessing(measureTypeId);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-measure-from-subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ measureTypeId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove measure');
      }

      setSuccess('Measure removed successfully!');
      await fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove measure');
    } finally {
      setProcessing(null);
    }
  };

  const openBillingPortal = async () => {
    if (!organisation?.stripe_subscription_id || !organisation?.stripe_customer_id) {
      setError('Billing information is incomplete. Please contact support for assistance.');
      return;
    }

    setProcessing('portal');
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to open billing portal';
        throw new Error(errorMessage);
      }

      if (!result.url) {
        throw new Error('No billing portal URL returned. Please try again or contact support.');
      }

      window.location.href = result.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open billing portal';
      console.error('Billing portal error:', err);
      setError(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!profile?.organisation_id) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No organisation found</p>
      </div>
    );
  }

  if (profile.role !== 'admin' && profile.role !== 'owner') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">Only admins and owners can manage organisation settings</p>
      </div>
    );
  }

  const activeMeasureIds = new Set(organisationMeasures.map(m => m.measure_type_id));

  const additionalMeasures = organisationMeasures.filter(m => !m.is_primary);
  const primaryMeasure = organisationMeasures.find(m => m.is_primary);

  const additionalMeasuresCount = additionalMeasures.length;
  const additionalCost = additionalMeasuresCount * 10;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Organisation Settings</h2>
        <p className="text-gray-600 mt-1.5">Manage your organisation and measure types</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Success</p>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200/60 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Measure Types
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage measure types for your organisation
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {measureTypes.map((measureType) => {
                  const isActive = activeMeasureIds.has(measureType.id);
                  const isProcessing = processing === measureType.id;
                  const orgMeasure = organisationMeasures.find(m => m.measure_type_id === measureType.id);
                  const isPrimary = orgMeasure?.is_primary || false;

                  return (
                    <div
                      key={measureType.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-green-500 bg-green-50/50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{measureType.name}</p>
                              {isActive && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                  Active
                                </span>
                              )}
                              {isPrimary && isActive && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                  Primary
                                </span>
                              )}
                            </div>
                            {measureType.description && (
                              <p className="text-sm text-gray-600 mt-0.5">{measureType.description}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          {isActive && !isPrimary && (
                            <button
                              onClick={() => handleRemoveMeasure(measureType.id)}
                              disabled={isProcessing}
                              className="px-3 py-2 text-red-700 hover:bg-red-50 rounded-lg transition-all border border-red-200 hover:border-red-300 flex items-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Remove
                            </button>
                          )}
                          {isActive && isPrimary && (
                            <span className="text-sm text-gray-500 px-3 py-2">Included</span>
                          )}
                          {!isActive && (
                            <button
                              onClick={() => handleAddMeasure(measureType.id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-500/30 flex items-center gap-2 text-sm font-semibold disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Add (£10/mo)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Organisation Info</h3>
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>Name</span>
                </div>
                <p className="text-gray-900 font-medium ml-6">{organisation?.name}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Subscription Status</span>
                </div>
                <p className="text-gray-900 font-medium ml-6 capitalize">
                  {organisation?.subscription_status || 'No subscription'}
                </p>
              </div>
            </div>
          </div>

          {organisation?.stripe_subscription_id && (
            <>
              <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Billing Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Base subscription (includes 1 measure)</span>
                    <span className="font-semibold text-gray-900">Included</span>
                  </div>
                  {primaryMeasure && (
                    <div className="flex justify-between items-center text-sm pl-4">
                      <span className="text-gray-500">
                        • {measureTypes.find(m => m.id === primaryMeasure.measure_type_id)?.name}
                      </span>
                      <span className="text-gray-500 text-xs">Primary</span>
                    </div>
                  )}
                  {additionalMeasuresCount > 0 && (
                    <>
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Additional Measures</p>
                        {additionalMeasures.map((measure) => {
                          const measureType = measureTypes.find(m => m.id === measure.measure_type_id);
                          return (
                            <div key={measure.id} className="flex justify-between items-center text-sm mb-1">
                              <span className="text-gray-600">• {measureType?.name}</span>
                              <span className="font-semibold text-gray-900">£10/mo</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Additional Cost</span>
                          <span className="text-xl font-bold text-blue-600">£{additionalCost}/mo</span>
                        </div>
                      </div>
                    </>
                  )}
                  {additionalMeasuresCount === 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Add additional measures for £10/mo each
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {organisation?.stripe_customer_id ? (
                <button
                  onClick={openBillingPortal}
                  disabled={processing === 'portal'}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {processing === 'portal' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-5 h-5" />
                      Manage Billing
                    </>
                  )}
                </button>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Billing Portal Unavailable</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your billing information is being set up. If this persists, please contact support.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
