/*
  # Add Stripe Subscription Item Tracking to Organisation Measures

  1. Changes
    - Add `stripe_subscription_item_id` column to `organisation_measures` table
    - This column tracks the Stripe subscription item ID for each additional measure
    - Allows syncing between Stripe billing and our database
    
  2. Notes
    - The column is nullable because primary measures may not have subscription items
    - Additional measures added through Stripe will have this populated
    - Used for managing measure lifecycle (add/remove from subscription)
*/

-- Add stripe_subscription_item_id column to organisation_measures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisation_measures' AND column_name = 'stripe_subscription_item_id'
  ) THEN
    ALTER TABLE organisation_measures 
    ADD COLUMN stripe_subscription_item_id text;
    
    -- Add index for faster lookups when syncing with Stripe
    CREATE INDEX IF NOT EXISTS idx_organisation_measures_stripe_item 
    ON organisation_measures(stripe_subscription_item_id);
  END IF;
END $$;
