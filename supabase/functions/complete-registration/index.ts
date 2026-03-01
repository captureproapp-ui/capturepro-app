import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url)

    // Parse body ONCE if POST
    let body: any = null
    if (req.method === "POST") {
      body = await req.json()
    }

    const sessionId =
      req.method === "GET"
        ? (url.searchParams.get("sessionId") || url.searchParams.get("session_id"))
        : (body?.sessionId || body?.session_id)

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId" }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Retrieve Stripe session
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      })
    } catch {
      return new Response(
        JSON.stringify({ error: "Stripe session not found" }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Validate Stripe session
    if (
      session.status !== "complete" ||
      session.mode !== "subscription" ||
      !session.subscription
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid or incomplete Stripe session" }),
        { status: 400, headers: corsHeaders }
      )
    }

    const email = session.customer_details?.email
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing customer email in Stripe session" }),
        { status: 400, headers: corsHeaders }
      )
    }

    const metaOrgName = session.metadata?.organisation_name || ""
    const fullName = session.metadata?.admin_full_name || ""
    const measureTypeId = session.metadata?.measure_type_id || null

    const seatLimitRaw = parseInt(session.metadata?.seat_limit || "1")
    const seatLimit = Number.isFinite(seatLimitRaw) ? seatLimitRaw : 1

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id

    const stripePriceId = typeof session.subscription === "string"
      ? null
      : session.subscription?.items?.data?.[0]?.price?.id || null

    const subscriptionPlan = stripePriceId
      ? (stripePriceId.toLowerCase().includes("pro") ? "professional"
        : stripePriceId.toLowerCase().includes("starter") ? "starter"
        : stripePriceId.toLowerCase().includes("enterprise") ? "enterprise"
        : "starter")
      : "starter"

    // ============================
    // GET → Prefill Data
    // ============================
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          email,
          organisationName,
          fullName,
          seatLimit,
          measureTypeId,
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    // ============================
    // POST → Complete Registration
    // ============================

    const password = body?.password
    const bodyOrgName = body?.organisationName || ""
    const organisationName = bodyOrgName.trim() || metaOrgName

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({
          error: "Password must be at least 8 characters",
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Check duplicate user
    const { data: existingUsersData } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })

    const existingUser = existingUsersData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: "Account already exists for this email",
        }),
        { status: 409, headers: corsHeaders }
      )
    }

    // Idempotency: check duplicate subscription
    const { data: existingOrg } = await supabaseAdmin
      .from("organisations")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle()

    if (existingOrg) {
      // Check if auth user already exists for this org - if so it's a true duplicate
      // If not, the org was created but user was deleted - allow re-registration by cleaning up
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("organisation_id", existingOrg.id)
        .maybeSingle()

      if (existingProfile) {
        return new Response(
          JSON.stringify({
            error: "An account already exists for this subscription. Please log in instead.",
          }),
          { status: 409, headers: corsHeaders }
        )
      }

      // Orphaned org (no profile) - delete it so registration can proceed
      await supabaseAdmin
        .from("organisation_measures")
        .delete()
        .eq("organisation_id", existingOrg.id)

      await supabaseAdmin
        .from("organisations")
        .delete()
        .eq("id", existingOrg.id)
    }

    // Create organisation
    const { data: organisation, error: orgError } =
      await supabaseAdmin
        .from("organisations")
        .insert({
          name: organisationName,
          seat_limit: seatLimit,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: stripePriceId,
          subscription_plan: subscriptionPlan,
          subscription_status: "active",
          subscription_started_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (orgError) throw orgError

    // Optional measure creation
    if (measureTypeId) {
      await supabaseAdmin.from("organisation_measures").insert({
        organisation_id: organisation.id,
        measure_type_id: measureTypeId,
        is_primary: true,
        stripe_subscription_item_id: null,
      })
    }

    // Create auth user
    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (createUserError) throw createUserError

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdUser.user.id,
        email,
        full_name: fullName,
        role: "owner",
        organisation_id: organisation.id,
        is_active: true,
      })

    if (profileError) throw profileError

    // Sign user in using anon key
    const anonKey = req.headers.get("apikey")
    if (!anonKey) {
      return new Response(
        JSON.stringify({ error: "Missing apikey header" }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseClient = createClient(SUPABASE_URL, anonKey)

    const { data: signInData, error: signInError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError) throw signInError

    return new Response(
      JSON.stringify({
        session: signInData.session,
        user: signInData.user,
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error("Complete registration error:", error)

    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    )
  }
})