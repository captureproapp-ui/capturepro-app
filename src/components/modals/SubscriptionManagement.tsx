import { useState } from 'react';
import { CreditCard, Calendar, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';

interface SubscriptionManagementProps {
  organisation: any;
  onRefresh: () => void;
}

export function SubscriptionManagement({ organisation, onRefresh }: SubscriptionManagementProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const hasPendingCancellation = organisation.pending_cancellation;
  const hasPendingPlanChange = organisation.pending_plan_change !== null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Subscription Management</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm text-slate-600">Current Plan</label>
            <p className="font-semibold text-slate-900 capitalize">
              {organisation.subscription_plan_tier || organisation.subscription_plan || 'Standard'}
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Status</label>
            <p className={`font-semibold capitalize ${
              organisation.subscription_status === 'active' ? 'text-green-600' :
              organisation.subscription_status === 'cancelled' ? 'text-red-600' :
              'text-amber-600'
            }`}>
              {organisation.subscription_status}
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Monthly Revenue</label>
            <p className="font-semibold text-slate-900">
              {formatCurrency(organisation.monthly_revenue_cents)}
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-600">Subscription Started</label>
            <p className="font-semibold text-slate-900">
              {formatDate(organisation.subscription_started_at)}
            </p>
          </div>
        </div>

        {hasPendingCancellation && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">Subscription Cancellation Scheduled</h4>
              <p className="text-sm text-red-800 mt-1">
                This subscription will cancel on {formatDate(organisation.cancellation_scheduled_for)}
              </p>
            </div>
          </div>
        )}

        {hasPendingPlanChange && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900">Plan Change Scheduled</h4>
              <p className="text-sm text-blue-800 mt-1">
                Downgrade to <strong>{organisation.pending_plan_change.new_tier}</strong> scheduled for{' '}
                {formatDate(organisation.pending_plan_change.effective_date)}
              </p>
            </div>
          </div>
        )}

        {organisation.stripe_subscription_id && organisation.subscription_status === 'active' && (
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Cancel Subscription
            </Button>
          </div>
        )}
      </div>

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        organisationId={organisation.id}
        organisationName={organisation.name}
        currentPeriodEnd={organisation.cancellation_scheduled_for}
        onSuccess={() => {
          setShowCancelModal(false);
          onRefresh();
        }}
      />
    </div>
  );
}
