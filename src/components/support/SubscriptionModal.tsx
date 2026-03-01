import { useState, useEffect } from 'react';
import { X, Check, Zap, Crown, Mail, Loader } from 'lucide-react';
import { supabase, Organisation } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type SubscriptionModalProps = {
  onClose: () => void;
};

type PricingTier = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£29',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 5 users',
      'Unlimited properties',
      'PAS2030 compliance reports',
      'Photo evidence management',
      'Email support',
      'Mobile app access',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '£79',
    description: 'Ideal for growing businesses',
    features: [
      'Up to 15 users',
      'Unlimited properties',
      'PAS2030 compliance reports',
      'Photo evidence management',
      'Priority email support',
      'Mobile app access',
      'Advanced analytics',
      'Custom branding',
    ],
    recommended: true,
  },
];

export function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  const { profile } = useAuth();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganisation = async () => {
      if (!profile?.organisation_id) return;

      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', profile.organisation_id)
        .maybeSingle();

      if (!error && data) {
        setOrganisation(data);
      }
      setLoading(false);
    };

    fetchOrganisation();
  }, [profile]);

  const currentPlan = organisation?.subscription_plan || 'starter';

  const handleSelectPlan = async (planId: string) => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return;
    }

    setProcessingPlan(planId);
    setError(null);

    try {
      if (!organisation?.stripe_customer_id) {
        window.location.href = '/checkout';
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error opening portal:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setProcessingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose the plan that fits your business needs
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-electric-500" />
          </div>
        ) : (
          <>
            {organisation?.subscription_plan && (
              <div className="p-4 bg-electric-50 border-b border-electric-100">
                <p className="text-center text-sm text-gray-700">
                  Current Plan: <strong className="text-electric-700 capitalize">{currentPlan}</strong>
                  {organisation.subscription_status && (
                    <span className={`ml-2 ${organisation.subscription_status === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                      ({organisation.subscription_status})
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PRICING_TIERS.map((tier) => {
                  const isCurrentPlan = tier.id === currentPlan;

                  return (
                    <div
                      key={tier.id}
                      className={`relative rounded-lg border-2 p-6 ${
                        tier.recommended
                          ? 'border-electric-500 shadow-lg'
                          : 'border-gray-200'
                      } ${isCurrentPlan ? 'bg-electric-50' : 'bg-white'}`}
                    >
                      {tier.recommended && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-electric-500 text-white text-xs font-bold rounded-full">
                            <Crown className="w-3 h-3" />
                            RECOMMENDED
                          </span>
                        </div>
                      )}

                      {isCurrentPlan && (
                        <div className="absolute -top-3 right-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                            <Check className="w-3 h-3" />
                            CURRENT
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                        <div className="flex items-baseline justify-center gap-1 mb-2">
                          <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <p className="text-sm text-gray-600">{tier.description}</p>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleSelectPlan(tier.id)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                          isCurrentPlan
                            ? 'bg-gray-200 text-gray-600 cursor-default'
                            : tier.recommended
                            ? 'bg-electric-500 text-white hover:bg-electric-600'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        } ${processingPlan === tier.id ? 'opacity-75 cursor-wait' : ''}`}
                        disabled={isCurrentPlan || processingPlan === tier.id}
                      >
                        {processingPlan === tier.id ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            {organisation?.stripe_customer_id ? 'Opening Portal...' : 'Redirecting...'}
                          </>
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : organisation?.stripe_customer_id ? (
                          'Change Plan'
                        ) : (
                          'Get Started'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg text-white">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white bg-opacity-10 rounded-lg">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Contact Us</h3>
                    <p className="text-gray-300 mb-4">
                      For organizations requiring 50+ users, custom features, or dedicated support,
                      we offer tailored enterprise solutions.
                    </p>
                    <a
                      href={`mailto:capturepro.app@gmail.com?subject=Enterprise Plan Inquiry from ${encodeURIComponent(profile?.full_name || 'Customer')}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Contact Us for Enterprise
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
