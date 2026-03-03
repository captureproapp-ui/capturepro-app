/*
  # Allow Public Read Access to Measure Types

  1. Changes
    - Add policy allowing unauthenticated users to read measure types
    - This enables the registration/onboarding flow to display available measures
    - Only SELECT is allowed; all other operations remain restricted
  
  2. Security
    - Read-only access for anonymous users
    - measure_types is a reference table with no sensitive data
    - Write operations still require authentication and super admin privileges
*/

CREATE POLICY "Anyone can read active measure types"
  ON measure_types
  FOR SELECT
  TO anon
  USING (is_active = true);
