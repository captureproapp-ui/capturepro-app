import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CancelRequest {
  organisationId: string;
  reason?: string;
  cancelImmediately?: boolean;
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

    const { organisationId, reason, cancelImmediately = false }: CancelRequest = await req.json();

    const { data: organisation } = await supabaseClient
      .from('organisations')
      .select('stripe_subscription_id, name')
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

    let cancellationDate: Date;

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(organisation.stripe_subscription_id);
      cancellationDate = new Date();

      await supabaseClient
        .from('organisations')
        .update({
          subscription_status: 'cancelled',
          subscription_ended_at: cancellationDate.toISOString(),
          pending_cancellation: false,
          cancellation_scheduled_for: null,
        })
        .eq('id', organisationId);
    } else {
      const subscription = await stripe.subscriptions.update(
        organisation.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

      cancellationDate = new Date(subscription.current_period_end * 1000);

      await supabaseClient
        .from('organisations')
        .update({
          pending_cancellation: true,
          cancellation_scheduled_for: cancellationDate.toISOString(),
        })
        .eq('id', organisationId);
    }

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'cancel_subscription',
        target_organisation_id: organisationId,
        changes_made: {
          cancellation_type: cancelImmediately ? 'immediate' : 'at_period_end',
          cancellation_date: cancellationDate.toISOString(),
        },
        reason: reason || 'No reason provided',
        metadata: {
          organisation_name: organisation.name,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: cancelImmediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will cancel at end of billing period',
        cancellation_date: cancellationDate.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
