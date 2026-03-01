import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AcceptInvitationRequest {
  token: string;
  password: string;
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

    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Missing token" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, organisation_id, invitation_status, invitation_expires_at, invitation_link_used")
        .eq("id", token)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired invitation" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired invitation" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (profile.invitation_status === "accepted") {
        return new Response(
          JSON.stringify({ error: "This invitation has already been accepted" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (profile.invitation_link_used) {
        return new Response(
          JSON.stringify({ error: "This invitation link has already been used" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (profile.invitation_expires_at) {
        const expiresAt = new Date(profile.invitation_expires_at);
        const now = new Date();

        if (expiresAt < now) {
          return new Response(
            JSON.stringify({ error: "This invitation link has expired. Please contact your administrator for a new invitation." }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }

      let organisationName = "your organisation";
      if (profile.organisation_id) {
        const { data: org } = await supabaseAdmin
          .from("organisations")
          .select("name")
          .eq("id", profile.organisation_id)
          .maybeSingle();

        if (org) {
          organisationName = org.name;
        }
      }

      const expiresAt = profile.invitation_expires_at ? new Date(profile.invitation_expires_at) : null;

      return new Response(
        JSON.stringify({
          email: profile.email,
          fullName: profile.full_name,
          organisationName,
          expiresAt: expiresAt?.toISOString(),
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (req.method === "POST") {
      const body: AcceptInvitationRequest = await req.json();
      const { token, password } = body;

      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: "Missing token or password" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters long" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, invitation_status, invitation_expires_at, invitation_link_used, organisation_id")
        .eq("id", token)
        .maybeSingle();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired invitation" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (profile.invitation_status === "accepted") {
        return new Response(
          JSON.stringify({ error: "This invitation has already been accepted" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (profile.invitation_link_used) {
        return new Response(
          JSON.stringify({ error: "This invitation link has already been used. Please contact your administrator for a new invitation." }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (profile.invitation_expires_at) {
        const expiresAt = new Date(profile.invitation_expires_at);
        const now = new Date();

        if (expiresAt < now) {
          await supabaseAdmin
            .from("profiles")
            .update({ invitation_status: "expired" })
            .eq("id", token);

          return new Response(
            JSON.stringify({ error: "This invitation link has expired. Please contact your administrator for a new invitation." }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }

      const { data: organisation } = await supabaseAdmin
        .from("organisations")
        .select("seat_limit")
        .eq("id", profile.organisation_id)
        .maybeSingle();

      if (organisation) {
        const { data: existingProfiles } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("organisation_id", profile.organisation_id)
          .eq("is_active", true);

        const currentActiveUsers = existingProfiles?.length || 0;

        if (currentActiveUsers >= organisation.seat_limit) {
          return new Response(
            JSON.stringify({
              error: "This organisation has reached its user limit. Please contact your administrator to upgrade the plan."
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
      }

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        token,
        {
          password,
          email_confirm: true,
        }
      );

      if (passwordError) {
        console.error("Error setting password:", passwordError);
        throw passwordError;
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          invitation_status: "accepted",
          invitation_accepted_at: new Date().toISOString(),
          is_active: true,
          invitation_link_used: true,
        })
        .eq("id", token);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw updateError;
      }

      console.log("Invitation accepted for user:", profile.id);

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Accept invitation error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to accept invitation",
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
