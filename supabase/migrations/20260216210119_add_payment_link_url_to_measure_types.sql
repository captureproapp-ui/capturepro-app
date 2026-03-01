/*
  # Add Payment Link URL to Measure Types

  1. Schema Changes
    - Add `stripe_payment_link_url` column to `measure_types` table
    - This stores the Stripe Payment Link URL for each purchasable measure type

  2. Data Updates
    - Set the payment link URL for Windows and Doors measure type

  3. Notes
    - Payment links allow direct Stripe checkout without complex API calls
    - Each measure type can have its own payment link URL
*/

-- Add payment link URL column to measure_types
ALTER TABLE measure_types
ADD COLUMN IF NOT EXISTS stripe_payment_link_url text;

-- Add comment for documentation
COMMENT ON COLUMN measure_types.stripe_payment_link_url IS 'Stripe Payment Link URL for purchasing this measure type';

-- Update Windows and Doors with the payment link URL
UPDATE measure_types
SET stripe_payment_link_url = 'https://buy.stripe.com/bJe7sKerW3oy5Nuemb3ZK02'
WHERE code = 'windows_doors';