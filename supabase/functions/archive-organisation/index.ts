import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ArchiveOrganisationRequest {
  organisationId: string;
  reason: string;
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

    const { organisationId, reason }: ArchiveOrganisationRequest = await req.json();

    const { data: organisation } = await supabaseClient
      .from('organisations')
      .select('*')
      .eq('id', organisationId)
      .single();

    if (!organisation) {
      return new Response(
        JSON.stringify({ error: 'Organisation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: users } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('organisation_id', organisationId);

    const { data: properties } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('organisation_id', organisationId);

    const { data: storageData } = await supabaseClient.rpc(
      'get_organisation_storage_usage',
      { org_id: organisationId }
    );

    let stripeSubscriptionStatus = 'none';
    if (organisation.stripe_subscription_id) {
      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
          apiVersion: '2024-11-20.acacia',
        });

        await stripe.subscriptions.update(organisation.stripe_subscription_id, {
          pause_collection: { behavior: 'void' }
        });

        stripeSubscriptionStatus = 'paused';
      } catch (stripeError) {
        console.error('Error pausing Stripe subscription:', stripeError);
        stripeSubscriptionStatus = 'pause_failed';
      }
    }

    const archiveData = {
      organisation,
      users,
      properties,
      user_count: users?.length || 0,
      property_count: properties?.length || 0,
    };

    await supabaseClient
      .from('archived_organisations')
      .insert({
        original_organisation_id: organisationId,
        organisation_data: archiveData,
        archived_by: user.id,
        archived_reason: reason,
        stripe_subscription_status: stripeSubscriptionStatus,
        user_count: users?.length || 0,
        property_count: properties?.length || 0,
        total_storage_bytes: storageData || 0,
      });

    await supabaseClient
      .from('organisations')
      .update({
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
      })
      .eq('id', organisationId);

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'archive_organisation',
        target_organisation_id: organisationId,
        changes_made: {
          archived: true,
          suspended: true,
          stripe_status: stripeSubscriptionStatus,
          user_count: users?.length || 0,
          property_count: properties?.length || 0,
        },
        reason: reason,
        metadata: {
          organisation_name: organisation.name,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Organisation archived successfully. Stripe subscription paused.',
        stripe_status: stripeSubscriptionStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error archiving organisation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
