import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getStripeClient(): Stripe {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    throw new Error("Stripe is not configured. Please contact support.");
  }
  return new Stripe(stripeKey, {
    apiVersion: "2024-12-18.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

interface AddMeasureRequest {
  measureTypeId: string;
  testMode?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { measureTypeId, testMode }: AddMeasureRequest = await req.json();
    if (!measureTypeId) {
      return jsonResponse({ error: "Missing measureTypeId" }, 400);
    }

    console.log(`Add measure request - User: ${user.id}, Test mode: ${testMode ? "enabled" : "disabled"}`);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organisation_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.organisation_id) {
      return jsonResponse({ error: "User profile not found" }, 404);
    }

    if (profile.role !== "admin" && profile.role !== "owner") {
      return jsonResponse({ error: "Only admin or owner can manage measures" }, 403);
    }

    const { data: organisation, error: orgError } = await supabase
      .from("organisations")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", profile.organisation_id)
      .single();

    if (orgError || !organisation) {
      return jsonResponse({ error: "Organisation not found" }, 404);
    }

    const { data: existingMeasure, error: checkError } = await supabaseAdmin
      .from("organisation_measures")
      .select("id")
      .eq("organisation_id", profile.organisation_id)
      .eq("measure_type_id", measureTypeId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing measure:", checkError);
      return jsonResponse({ error: "Failed to check existing measure" }, 500);
    }

    if (existingMeasure) {
      return jsonResponse({ error: "Measure already active for this organisation" }, 400);
    }

    let subscriptionItemId = null;

    if (testMode) {
      console.log("Test mode: Skipping Stripe subscription item creation");
    } else {
      if (!organisation.stripe_subscription_id) {
        return jsonResponse({ error: "No active subscription found. Please set up billing first." }, 400);
      }

      try {
        const stripe = getStripeClient();
        const measurePriceId = "price_1T14ptANLWYuukeoDjgPwDEs";

        const subscriptionItem = await stripe.subscriptionItems.create({
          subscription: organisation.stripe_subscription_id,
          price: measurePriceId,
          quantity: 1,
        });

        subscriptionItemId = subscriptionItem.id;
      } catch (stripeError) {
        console.error("Stripe error adding subscription item:", stripeError);
        const message = stripeError instanceof Error ? stripeError.message : "Payment provider error";
        return jsonResponse({ error: `Failed to update subscription: ${message}` }, 502);
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("organisation_measures")
      .insert({
        organisation_id: profile.organisation_id,
        measure_type_id: measureTypeId,
        is_primary: false,
        stripe_subscription_item_id: subscriptionItemId,
        created_by: user.id,
      });

    if (insertError) {
      console.error("Error inserting measure:", insertError);

      if (!testMode && subscriptionItemId) {
        try {
          const stripe = getStripeClient();
          await stripe.subscriptionItems.del(subscriptionItemId);
        } catch (rollbackError) {
          console.error("Error rolling back subscription item:", rollbackError);
        }
      }

      return jsonResponse({ error: "Failed to add measure to organisation" }, 500);
    }

    return jsonResponse({ success: true, subscriptionItemId, testMode });
  } catch (error) {
    console.error("Error adding measure:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return jsonResponse({ error: message }, 500);
  }
});
