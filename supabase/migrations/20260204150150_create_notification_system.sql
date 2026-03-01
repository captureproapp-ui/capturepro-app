/*
  # User Notification System

  1. New Tables
    - `notifications` - stores user notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `notification_type` (text) - type of notification (user_deactivated, user_reactivated, role_changed)
      - `message` (text) - notification message
      - `is_read` (boolean) - whether notification has been read
      - `created_at` (timestamptz)
      - `read_at` (timestamptz) - when notification was marked as read

  2. Triggers
    - Automatically create notifications when user profiles are updated by admins
    - Notify users when they are deactivated or reactivated
    - Notify users when their role changes

  3. Security
    - Enable RLS on notifications table
    - Users can view their own notifications
    - Users can update their own notifications (mark as read)
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to send notification when profile is updated
CREATE OR REPLACE FUNCTION send_profile_update_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  notification_message text;
  notification_type text;
  admin_name text;
BEGIN
  -- Only send notifications for updates made by admins to other users
  IF auth.uid() IS NULL OR OLD.id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Get admin's name
  SELECT full_name INTO admin_name
  FROM profiles
  WHERE id = auth.uid();

  -- Handle deactivation
  IF NEW.is_active = false AND OLD.is_active = true THEN
    notification_type := 'user_deactivated';
    notification_message := 'Your account has been deactivated by ' || COALESCE(admin_name, 'an administrator') || '.';
    
    INSERT INTO notifications (user_id, notification_type, message)
    VALUES (NEW.id, notification_type, notification_message);
  
  -- Handle reactivation
  ELSIF NEW.is_active = true AND OLD.is_active = false THEN
    notification_type := 'user_reactivated';
    notification_message := 'Your account has been reactivated by ' || COALESCE(admin_name, 'an administrator') || '. Welcome back!';
    
    INSERT INTO notifications (user_id, notification_type, message)
    VALUES (NEW.id, notification_type, notification_message);
  
  -- Handle role change
  ELSIF NEW.role != OLD.role THEN
    notification_type := 'role_changed';
    notification_message := 'Your role has been changed from ' || OLD.role || ' to ' || NEW.role || ' by ' || COALESCE(admin_name, 'an administrator') || '.';
    
    INSERT INTO notifications (user_id, notification_type, message)
    VALUES (NEW.id, notification_type, notification_message);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS send_profile_update_notification_trigger ON profiles;
CREATE TRIGGER send_profile_update_notification_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_profile_update_notification();
