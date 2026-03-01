import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.10.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteOrganisationRequest {
  organisation_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      throw new Error('Only super admins can delete organisations');
    }

    const { organisation_id }: DeleteOrganisationRequest = await req.json();

    if (!organisation_id) {
      throw new Error('organisation_id is required');
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisations')
      .select('name, stripe_customer_id, stripe_subscription_id')
      .eq('id', organisation_id)
      .single();

    if (orgError || !org) {
      throw new Error('Organisation not found');
    }

    const deletionSteps = [];

    if (stripeSecretKey && org.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2024-12-18.acacia'
        });

        await stripe.subscriptions.cancel(org.stripe_subscription_id);
        deletionSteps.push({ step: 'stripe_subscription', status: 'success' });
      } catch (stripeError: any) {
        deletionSteps.push({
          step: 'stripe_subscription',
          status: 'failed',
          error: stripeError.message
        });
      }
    }

    const { data: photos } = await supabaseAdmin
      .from('photos')
      .select('file_url')
      .in('property_id',
        supabaseAdmin
          .from('properties')
          .select('id')
          .eq('organisation_id', organisation_id)
      );

    if (photos && photos.length > 0) {
      const photoPaths = photos
        .map(p => {
          const match = p.file_url?.match(/\/photos\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      if (photoPaths.length > 0) {
        const { error: photoDeleteError } = await supabaseAdmin.storage
          .from('photos')
          .remove(photoPaths);

        deletionSteps.push({
          step: 'storage_photos',
          status: photoDeleteError ? 'failed' : 'success',
          count: photoPaths.length,
          error: photoDeleteError?.message
        });
      }
    }

    const { data: reports } = await supabaseAdmin
      .from('pdf_reports')
      .select('file_url')
      .in('property_id',
        supabaseAdmin
          .from('properties')
          .select('id')
          .eq('organisation_id', organisation_id)
      )
      .not('file_url', 'is', null);

    if (reports && reports.length > 0) {
      const reportPaths = reports
        .map(r => r.file_url!.split('/').pop()!)
        .filter(Boolean);

      if (reportPaths.length > 0) {
        const { error: reportDeleteError } = await supabaseAdmin.storage
          .from('reports')
          .remove(reportPaths);

        deletionSteps.push({
          step: 'storage_reports',
          status: reportDeleteError ? 'failed' : 'success',
          count: reportPaths.length,
          error: reportDeleteError?.message
        });
      }
    }

    const { data: dbResult, error: dbError } = await supabaseAdmin.rpc(
      'delete_organisation_cascade',
      { org_id: organisation_id }
    );

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }

    deletionSteps.push({
      step: 'database',
      status: 'success',
      details: dbResult
    });

    const userIds = dbResult.user_ids || [];
    const authDeletionResults = [];

    for (const userId of userIds) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      authDeletionResults.push({
        user_id: userId,
        status: authError ? 'failed' : 'success',
        error: authError?.message
      });
    }

    deletionSteps.push({
      step: 'auth_users',
      status: 'success',
      details: authDeletionResults
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Organisation "${org.name}" has been permanently deleted`,
        organisation_id,
        steps: deletionSteps
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error deleting organisation:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: error.message === 'Unauthorized' || error.message?.includes('super admin') ? 403 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
