import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DowngradeRequest {
  organisationId: string;
  newPriceId: string;
  newPlanTier: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.super_admin) {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organisationId, newPriceId, newPlanTier }: DowngradeRequest = await req.json();

    const { data: organisation } = await supabaseClient
      .from('organisations')
      .select('stripe_subscription_id, stripe_customer_id, name')
      .eq('id', organisationId)
      .single();

    if (!organisation?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-11-20.acacia',
    });

    const subscription = await stripe.subscriptions.retrieve(organisation.stripe_subscription_id);
    const currentItem = subscription.items.data[0];

    await stripe.subscriptions.update(organisation.stripe_subscription_id, {
      items: [{
        id: currentItem.id,
        price: newPriceId,
      }],
      proration_behavior: 'none',
      billing_cycle_anchor: 'unchanged',
    });

    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    await supabaseClient
      .from('organisations')
      .update({
        pending_plan_change: {
          new_tier: newPlanTier,
          new_price_id: newPriceId,
          effective_date: currentPeriodEnd.toISOString(),
          old_tier: organisation.subscription_plan_tier,
          old_price_id: currentItem.price.id,
        },
      })
      .eq('id', organisationId);

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'downgrade_subscription_plan',
        target_organisation_id: organisationId,
        changes_made: {
          old_price_id: currentItem.price.id,
          new_price_id: newPriceId,
          new_plan_tier: newPlanTier,
          effective_date: currentPeriodEnd.toISOString(),
        },
        metadata: {
          organisation_name: organisation.name,
          downgrade_type: 'at_period_end',
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription downgrade scheduled for end of billing period',
        effective_date: currentPeriodEnd.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error downgrading subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
