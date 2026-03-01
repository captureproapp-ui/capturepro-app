import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@14"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!webhookSecret || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables")
}

Deno.serve(async (req: Request) => {
  try {
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400 })
    }

    const body = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      )
    } catch (err) {
      console.error("Invalid webhook signature", err)
      return new Response("Invalid signature", { status: 400 })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    switch (event.type) {
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price.id

        const updateData: any = {
          subscription_status: subscription.status,
        }

        if (subscription.cancel_at_period_end) {
          updateData.pending_cancellation = true
          updateData.cancellation_scheduled_for = new Date(subscription.current_period_end * 1000).toISOString()
        } else {
          updateData.pending_cancellation = false
          updateData.cancellation_scheduled_for = null
        }

        if (priceId) {
          updateData.stripe_price_id = priceId
        }

        const { data: org } = await supabaseAdmin
          .from("organisations")
          .select("id, pending_plan_change")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        if (org?.pending_plan_change) {
          const pendingChange = org.pending_plan_change as any
          const effectiveDate = new Date(pendingChange.effective_date)
          const now = new Date()

          if (now >= effectiveDate && priceId === pendingChange.new_price_id) {
            updateData.subscription_plan_tier = pendingChange.new_tier
            updateData.pending_plan_change = null
          }
        }

        await supabaseAdmin
          .from("organisations")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id)

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        await supabaseAdmin
          .from("organisations")
          .update({
            subscription_status: 'cancelled',
            subscription_ended_at: new Date().toISOString(),
            pending_cancellation: false,
            cancellation_scheduled_for: null,
          })
          .eq("stripe_subscription_id", subscription.id)

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          await supabaseAdmin
            .from("organisations")
            .update({
              subscription_status: "past_due",
            })
            .eq("stripe_subscription_id", invoice.subscription)
        }

        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          await supabaseAdmin
            .from("organisations")
            .update({
              subscription_status: "active",
            })
            .eq("stripe_subscription_id", invoice.subscription)
        }

        break
      }

      default:
        console.log("Unhandled event:", event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return new Response("Webhook failed", { status: 400 })
  }
})