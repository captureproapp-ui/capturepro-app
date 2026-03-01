import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ArchiveUserRequest {
  userId: string;
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

    const { userId, reason }: ArchiveUserRequest = await req.json();

    const { data: userToArchive } = await supabaseClient
      .from('profiles')
      .select('*, organisations(name)')
      .eq('id', userId)
      .single();

    if (!userToArchive) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userToArchive.super_admin) {
      return new Response(
        JSON.stringify({ error: 'Cannot archive super admin users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseClient
      .from('archived_users')
      .insert({
        original_user_id: userId,
        user_data: userToArchive,
        organisation_id: userToArchive.organisation_id,
        archived_by: user.id,
        archived_reason: reason,
      });

    await supabaseServiceClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
      user_metadata: { archived: true, archived_at: new Date().toISOString() }
    });

    await supabaseClient
      .from('profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
      })
      .eq('id', userId);

    await supabaseClient
      .from('super_admin_audit_logs')
      .insert({
        performed_by: user.id,
        action_type: 'archive_user',
        target_user_id: userId,
        target_organisation_id: userToArchive.organisation_id,
        changes_made: {
          archived: true,
          is_active: false,
        },
        reason: reason,
        metadata: {
          user_email: userToArchive.email,
          user_name: userToArchive.full_name,
          organisation_name: userToArchive.organisations?.name,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User archived successfully. Access has been revoked immediately.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error archiving user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
