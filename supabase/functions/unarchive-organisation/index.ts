import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UnarchiveOrganisationRequest {
  archivedOrganisationId: string;
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

    const { archivedOrganisationId }: UnarchiveOrganisationRequest = await req.json();

    const { data: archivedOrg } = await supabaseClient
      .from('archived_organisations')
      .select('*')
      .eq('id', archivedOrganisationId)
      .single();

    if (!archivedOrg) {
      return new Response(
        JSON.stringify({ error: 'Archived organisation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!archivedOrg.can_be_restored) {
      return new Response(
        JSON.stringify({ error: 'This organisation cannot be restored' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organisationId = archivedOrg.original_organisation_id;
    const orgData = archivedOrg.organisation_data.organisation;

    let stripeSubscriptionStatus = 'none';
    if (orgData.stripe_subscription_id && archivedOrg.stripe_subscription_status === 'paused') {
      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
          apiVersion: '2024-11-20.acacia',
        });

        await stripe.subscriptions.update(orgData.stripe_subscription_id, {
          pause_collection: null
        });

        stripeSubscriptionStatus = 'resumed';
      } catch (stripeError) {
        console.error('Error resuming Stripe subscription:', stripeError);
        stripeSubscriptionStatus = 'resume_failed';
      }
    }

    await supabaseClient
      .from('organisations')
      .update({
        suspended_at: null,
        suspended_by: null,
      })
      .eq('id', organisationId);

    await supabaseClient
      .from('archived_organisations')
      .update({ can_be_restored: false })
      .eq('id', archivedOrganisationId);

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'unarchive_organisation',
        target_organisation_id: organisationId,
        changes_made: {
          unarchived: true,
          suspended: false,
          stripe_status: stripeSubscriptionStatus,
        },
        metadata: {
          archived_organisation_id: archivedOrganisationId,
          organisation_name: orgData.name,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Organisation unarchived successfully. Stripe subscription resumed.',
        stripe_status: stripeSubscriptionStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error unarchiving organisation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
