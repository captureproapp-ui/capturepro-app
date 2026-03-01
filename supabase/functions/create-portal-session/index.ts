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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve user profile. Please try again." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!profile?.organisation_id) {
      return new Response(
        JSON.stringify({ error: "No organisation found for your account. Please contact support." }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: organisation, error: orgError } = await supabase
      .from("organisations")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("id", profile.organisation_id)
      .maybeSingle();

    if (orgError) {
      console.error("Error fetching organisation:", orgError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve organisation details. Please try again." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!organisation) {
      return new Response(
        JSON.stringify({ error: "Organisation not found. Please contact support." }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!organisation.stripe_customer_id) {
      console.error("Missing stripe_customer_id for organisation:", profile.organisation_id);
      return new Response(
        JSON.stringify({
          error: "Your billing account is not fully set up. Please contact support for assistance."
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

    if (!organisation.stripe_subscription_id) {
      return new Response(
        JSON.stringify({
          error: "No active subscription found. Please subscribe first."
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

    const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://capturepro.work";

    const session = await stripe.billingPortal.sessions.create({
      customer: organisation.stripe_customer_id,
      return_url: `${appUrl}/admin/dashboard`,
    });

    if (!session?.url) {
      console.error("No URL returned from Stripe billing portal");
      return new Response(
        JSON.stringify({
          error: "Failed to generate billing portal URL. Please try again or contact support."
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

    console.log("Billing portal session created successfully for customer:", organisation.stripe_customer_id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating portal session:", error);

    let errorMessage = "An unexpected error occurred while opening the billing portal.";

    if (error instanceof Error) {
      if (error.message.includes("customer")) {
        errorMessage = "Invalid billing account. Please contact support.";
      } else if (error.message.includes("api_key")) {
        errorMessage = "Billing system configuration error. Please contact support.";
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
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
