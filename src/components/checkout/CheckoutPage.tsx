import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, CreditCard, Users, Shield } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  seats: number;
  features: string[];
  stripePriceId: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    seats: 5,
    stripePriceId: 'price_starter_monthly',
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
    price: 79,
    seats: 15,
    stripePriceId: 'price_professional_monthly',
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
  },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    organisationName: '',
    adminFullName: '',
    adminEmail: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckout = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    if (!formData.organisationName || !formData.adminFullName || !formData.adminEmail) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const stripe = (window as any).Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

      if (!stripe) {
        throw new Error('Stripe is not loaded');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: selectedPlan.stripePriceId,
          organisationName: formData.organisationName,
          adminFullName: formData.adminFullName,
          adminEmail: formData.adminEmail,
          seatLimit: selectedPlan.seats,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      const result = await stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <img
            src="/brand/image.png"
            alt="CapturePro"
            className="w-24 h-24 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your CapturePro Plan
          </h1>
          <p className="text-xl text-gray-300">
            Professional installation documentation for PAS2030 compliance
          </p>
        </div>

        {!selectedPlan ? (
          <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl shadow-2xl p-8 hover:scale-105 transition-transform cursor-pointer border-4 border-transparent hover:border-electric-500"
                onClick={() => setSelectedPlan(plan)}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">£{plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full bg-electric-500 text-white py-3 rounded-lg font-medium hover:bg-electric-600 transition-colors">
                  Select {plan.name}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Complete Your Purchase</h2>
                <p className="text-gray-600 mt-1">
                  {selectedPlan.name} Plan - £{selectedPlan.price}/month
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-electric-500 hover:text-electric-600 font-medium"
              >
                Change Plan
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisation Name
                </label>
                <input
                  type="text"
                  name="organisationName"
                  value={formData.organisationName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  name="adminFullName"
                  value={formData.adminFullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  placeholder="john@company.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll use this email to log in to your account
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-electric-500" />
                <h3 className="font-semibold text-gray-900">What's included:</h3>
              </div>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-electric-500 text-white py-4 rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:bg-electric-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  Continue to Payment
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Secure payment processed by Stripe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
