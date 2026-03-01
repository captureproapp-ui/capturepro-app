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

interface RemoveMeasureRequest {
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

    const { measureTypeId, testMode }: RemoveMeasureRequest = await req.json();
    if (!measureTypeId) {
      return jsonResponse({ error: "Missing measureTypeId" }, 400);
    }

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

    const { data: measure, error: measureError } = await supabaseAdmin
      .from("organisation_measures")
      .select("id, is_primary, stripe_subscription_item_id")
      .eq("organisation_id", profile.organisation_id)
      .eq("measure_type_id", measureTypeId)
      .maybeSingle();

    if (measureError) {
      console.error("Error fetching measure:", measureError);
      return jsonResponse({ error: "Failed to fetch measure" }, 500);
    }

    if (!measure) {
      return jsonResponse({ error: "Measure not found for this organisation" }, 404);
    }

    if (measure.is_primary) {
      return jsonResponse({ error: "Cannot remove primary measure" }, 400);
    }

    if (measure.stripe_subscription_item_id && !testMode) {
      try {
        const stripe = getStripeClient();
        await stripe.subscriptionItems.del(measure.stripe_subscription_item_id);
      } catch (stripeError) {
        console.error("Stripe error removing subscription item:", stripeError);
        const message = stripeError instanceof Error ? stripeError.message : "Payment provider error";
        return jsonResponse({ error: `Failed to update subscription: ${message}` }, 502);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("organisation_measures")
      .delete()
      .eq("id", measure.id);

    if (deleteError) {
      console.error("Error deleting measure:", deleteError);
      return jsonResponse({ error: "Failed to remove measure from organisation" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error removing measure:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return jsonResponse({ error: message }, 500);
  }
});
