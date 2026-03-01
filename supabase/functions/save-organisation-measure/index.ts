import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.10.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SaveMeasureRequest {
  sessionId: string;
  measureTypeId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sessionId, measureTypeId }: SaveMeasureRequest = await req.json();

    if (!sessionId || !measureTypeId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer_details"],
    });

    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Invalid session or no email found" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, organisation_id, role")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw profileError;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "Profile not found. Please complete registration first.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!profile.organisation_id) {
      return new Response(
        JSON.stringify({
          error: "Organisation not found for this user.",
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

    const { data: measureType, error: measureError } = await supabaseAdmin
      .from("measure_types")
      .select("id, name")
      .eq("id", measureTypeId)
      .eq("is_active", true)
      .maybeSingle();

    if (measureError || !measureType) {
      return new Response(
        JSON.stringify({
          error: "Invalid measure type selected.",
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

    const { error: insertError } = await supabaseAdmin
      .from("organisation_measures")
      .insert({
        organisation_id: profile.organisation_id,
        measure_type_id: measureTypeId,
        is_primary: true,
        created_by: profile.id,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "This measure has already been added to your organisation.",
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

      console.error("Error inserting organisation measure:", insertError);
      throw insertError;
    }

    console.log(
      `Measure ${measureType.name} added to organisation ${profile.organisation_id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Measure successfully added to your organisation.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error saving organisation measure:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to save measure selection",
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
