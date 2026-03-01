import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpgradeRequest {
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

    const { organisationId, newPriceId, newPlanTier }: UpgradeRequest = await req.json();

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
      proration_behavior: 'always_invoice',
    });

    await supabaseClient
      .from('organisations')
      .update({
        subscription_plan_tier: newPlanTier,
        stripe_price_id: newPriceId,
      })
      .eq('id', organisationId);

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'upgrade_subscription_plan',
        target_organisation_id: organisationId,
        changes_made: {
          old_price_id: currentItem.price.id,
          new_price_id: newPriceId,
          new_plan_tier: newPlanTier,
        },
        metadata: {
          organisation_name: organisation.name,
          upgrade_type: 'immediate',
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription upgraded successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
