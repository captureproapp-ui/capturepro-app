import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UnarchiveUserRequest {
  archivedUserId: string;
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

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    const { archivedUserId }: UnarchiveUserRequest = await req.json();

    const { data: archivedUser } = await supabaseClient
      .from('archived_users')
      .select('*')
      .eq('id', archivedUserId)
      .single();

    if (!archivedUser) {
      return new Response(
        JSON.stringify({ error: 'Archived user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!archivedUser.can_be_restored) {
      return new Response(
        JSON.stringify({ error: 'This user cannot be restored' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = archivedUser.original_user_id;

    await supabaseServiceClient.auth.admin.updateUserById(userId, {
      user_metadata: { archived: false, unarchived_at: new Date().toISOString() }
    });

    await supabaseClient
      .from('profiles')
      .update({
        is_active: true,
        deactivated_at: null,
        deactivated_by: null,
      })
      .eq('id', userId);

    await supabaseClient
      .from('archived_users')
      .update({ can_be_restored: false })
      .eq('id', archivedUserId);

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'unarchive_user',
        target_user_id: userId,
        target_organisation_id: archivedUser.organisation_id,
        changes_made: {
          unarchived: true,
          is_active: true,
        },
        metadata: {
          archived_user_id: archivedUserId,
          user_data: archivedUser.user_data,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User unarchived successfully. Access has been restored.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error unarchiving user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
