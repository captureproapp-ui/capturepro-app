/*
  # Add Subscription Plan Management Fields

  1. Changes to organisations table
    - `subscription_plan_tier` (text) - Current active plan tier (e.g., 'starter', 'professional', 'enterprise')
    - `pending_plan_change` (jsonb) - Stores pending plan change details until next billing cycle
    - `pending_cancellation` (boolean) - Flag indicating subscription will cancel at period end
    - `cancellation_scheduled_for` (timestamptz) - When the cancellation will take effect
    
  2. Security
    - Existing RLS policies cover these new columns
    - Super admin access only via existing policies
*/

-- Add subscription plan management fields to organisations table
DO $$
BEGIN
  -- Add subscription_plan_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'subscription_plan_tier'
  ) THEN
    ALTER TABLE organisations ADD COLUMN subscription_plan_tier text;
    COMMENT ON COLUMN organisations.subscription_plan_tier IS 'Current active plan tier (e.g., starter, professional, enterprise)';
  END IF;

  -- Add pending_plan_change column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'pending_plan_change'
  ) THEN
    ALTER TABLE organisations ADD COLUMN pending_plan_change jsonb;
    COMMENT ON COLUMN organisations.pending_plan_change IS 'Stores pending plan change details: {new_tier, new_price_id, effective_date, reason}';
  END IF;

  -- Add pending_cancellation column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'pending_cancellation'
  ) THEN
    ALTER TABLE organisations ADD COLUMN pending_cancellation boolean DEFAULT false;
    COMMENT ON COLUMN organisations.pending_cancellation IS 'Flag indicating subscription will cancel at period end';
  END IF;

  -- Add cancellation_scheduled_for column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'cancellation_scheduled_for'
  ) THEN
    ALTER TABLE organisations ADD COLUMN cancellation_scheduled_for timestamptz;
    COMMENT ON COLUMN organisations.cancellation_scheduled_for IS 'Timestamp when the subscription cancellation will take effect';
  END IF;
END $$;