import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteUserRequest {
  email: string;
  fullName: string;
  role: string;
  organisationId: string;
  invitedBy: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { email, fullName, role, organisationId, invitedBy }: InviteUserRequest = await req.json();

    if (!email || !fullName || !role || !organisationId || !invitedBy) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Creating user: ${email} as ${role}`);

    const { data: organisation } = await supabaseAdmin
      .from("organisations")
      .select("seat_limit, name")
      .eq("id", organisationId)
      .maybeSingle();

    if (!organisation) {
      return new Response(
        JSON.stringify({ success: false, error: "Organisation not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("is_active", true);

    const currentSeatUsage = existingProfiles?.length || 0;

    if (currentSeatUsage >= organisation.seat_limit) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Seat limit reached. Your plan allows ${organisation.seat_limit} seats and you have ${currentSeatUsage} active/pending users.`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users.find((u) => u.email === email);

    let userId: string;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

    if (userExists) {
      console.log(`User already exists: ${userExists.id}, updating invitation`);
      userId = userExists.id;

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: fullName,
          role,
          organisation_id: organisationId,
          is_active: true,
          invitation_status: "pending",
          invited_at: new Date().toISOString(),
          invited_by: invitedBy,
          invitation_expires_at: invitationExpiresAt.toISOString(),
          invitation_link_used: false,
        })
        .eq("id", userId);

      if (profileUpdateError) {
        console.error("Profile update error:", profileUpdateError);
        throw profileUpdateError;
      }
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          role,
          organisation_id: organisationId,
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error("No user returned from create");
      }

      userId = authData.user.id;
      console.log(`User created: ${userId}`);

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
        role,
        organisation_id: organisationId,
        is_active: true,
        invitation_status: "pending",
        invited_at: new Date().toISOString(),
        invited_by: invitedBy,
        invitation_expires_at: invitationExpiresAt.toISOString(),
        invitation_link_used: false,
      });

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }
    }

    const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://capturepro.work";
    const inviteToken = userId;
    const acceptInviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    const seatsRemaining = organisation.seat_limit - (currentSeatUsage + 1);

    console.log(`User created successfully. Seats remaining: ${seatsRemaining}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        invitationUrl: acceptInviteUrl,
        expiresAt: invitationExpiresAt.toISOString(),
        seatsRemaining,
        message: "User created successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create user",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
