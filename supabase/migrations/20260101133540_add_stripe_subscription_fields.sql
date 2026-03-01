/*
  # Add Stripe Subscription Fields to Organisations

  1. Changes
    - Add `stripe_customer_id` to organisations table for Stripe customer tracking
    - Add `stripe_subscription_id` to organisations table for subscription tracking
    - Add `subscription_status` to track active/canceled/past_due subscriptions
    - Add `subscription_plan` to track which pricing plan the organisation is on
    - Add indexes for efficient Stripe webhook lookups

  2. Security
    - No RLS changes needed (organisations already has RLS enabled)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE organisations ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE organisations ADD COLUMN stripe_subscription_id text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE organisations ADD COLUMN subscription_status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE organisations ADD COLUMN subscription_plan text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organisations_stripe_customer_id
  ON organisations(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_organisations_stripe_subscription_id
  ON organisations(stripe_subscription_id);
