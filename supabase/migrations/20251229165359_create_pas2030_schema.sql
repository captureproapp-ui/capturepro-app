/*
  # PAS2030 Photo Evidence System - Core Schema

  ## Overview
  Multi-tenant SaaS system for managing window installation photo evidence with
  organisations, role-based access, properties, rooms, openings, and photos.

  ## New Tables

  ### 1. organisations
  - `id` (uuid, primary key) - Unique organisation identifier
  - `name` (text) - Organisation name
  - `created_at` (timestamptz) - Creation timestamp
  - `owner_user_id` (uuid) - Reference to platform owner
  - `settings` (jsonb) - Organisation-specific settings

  ### 2. profiles
  - `id` (uuid, primary key, references auth.users) - User ID from Supabase Auth
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: owner/admin/installer
  - `organisation_id` (uuid) - Foreign key to organisations
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. properties
  - `id` (uuid, primary key) - Unique property identifier
  - `organisation_id` (uuid) - Foreign key to organisations
  - `job_ref` (text, unique) - Job reference number
  - `address_line_1` (text) - First line of address
  - `address_line_2` (text) - Second line of address
  - `city` (text) - City name
  - `postcode` (text) - Postal code
  - `installation_date` (date) - Scheduled installation date
  - `property_type` (text) - Enum: mid_terrace/end_terrace/detached/semi_detached
  - `status` (text) - Enum: in_progress/completed/reopened
  - `assigned_installer_ids` (uuid[]) - Array of installer user IDs
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `created_by` (uuid) - User who created the property

  ### 4. areas
  - `id` (uuid, primary key) - Unique area identifier
  - `property_id` (uuid) - Foreign key to properties
  - `area_name` (text) - Name of the area (e.g., "External", "Living Room")
  - `area_type` (text) - Type: external/room
  - `custom_room_name` (text) - Custom name if "Other" is selected
  - `windows_to_replace_count` (int) - Number of windows to replace
  - `doors_to_replace_count` (int) - Number of doors to replace
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. openings
  - `id` (uuid, primary key) - Unique opening identifier
  - `area_id` (uuid) - Foreign key to areas
  - `opening_type` (text) - Type: window/door
  - `opening_number` (int) - Sequential number (Window 1, Window 2, etc.)
  - `notes` (text) - Optional notes about the opening
  - `created_at` (timestamptz) - Creation timestamp

  ### 6. photos
  - `id` (uuid, primary key) - Unique photo identifier
  - `opening_id` (uuid) - Foreign key to openings
  - `file_url` (text) - Storage URL for the photo
  - `file_name` (text) - Original file name
  - `photo_type` (text) - Type: before/during/after/detail
  - `metadata` (jsonb) - EXIF data, GPS coordinates, device info
  - `latitude` (numeric) - GPS latitude
  - `longitude` (numeric) - GPS longitude
  - `captured_at` (timestamptz) - When photo was taken
  - `uploaded_at` (timestamptz) - When photo was uploaded
  - `uploaded_by` (uuid) - User who uploaded the photo
  - `display_order` (int) - Order for display (1-45)

  ### 7. checklist_templates
  - `id` (uuid, primary key) - Unique template identifier
  - `organisation_id` (uuid) - Foreign key to organisations
  - `template_name` (text) - Name of the checklist template
  - `description` (text) - Template description
  - `applicability_rules` (jsonb) - Rules for when template applies
  - `checklist_items` (jsonb) - Array of checklist items
  - `is_active` (boolean) - Whether template is active
  - `created_at` (timestamptz) - Creation timestamp
  - `created_by` (uuid) - User who created the template

  ### 8. checklist_completions
  - `id` (uuid, primary key) - Unique completion identifier
  - `property_id` (uuid) - Foreign key to properties
  - `template_id` (uuid) - Foreign key to checklist_templates
  - `completed_items` (jsonb) - Completion status for each item
  - `completion_percentage` (numeric) - Percentage complete
  - `completed_at` (timestamptz) - When fully completed
  - `completed_by` (uuid) - User who completed
  - `updated_at` (timestamptz) - Last update timestamp

  ### 9. archived_properties
  - `id` (uuid, primary key) - Unique archive identifier
  - `original_property_id` (uuid) - Original property ID
  - `property_data` (jsonb) - Full property data snapshot
  - `archived_at` (timestamptz) - When archived
  - `archived_by` (uuid) - User who archived
  - `auto_delete_at` (timestamptz) - When to auto-delete (30 days)

  ### 10. pdf_reports
  - `id` (uuid, primary key) - Unique report identifier
  - `property_id` (uuid) - Foreign key to properties
  - `file_url` (text) - Storage URL for PDF
  - `version` (int) - Report version number
  - `generated_at` (timestamptz) - Generation timestamp
  - `generated_by` (uuid) - User who generated the report

  ## Security
  - Enable RLS on all tables
  - Policies enforce organisation-level data isolation
  - Role-based access control for different user types
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'installer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM ('mid_terrace', 'end_terrace', 'detached', 'semi_detached', 'bungalow', 'flat', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE property_status AS ENUM ('in_progress', 'completed', 'reopened', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE area_type AS ENUM ('external', 'room');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE opening_type AS ENUM ('window', 'door');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE photo_type AS ENUM ('before', 'during', 'after', 'detail');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  owner_user_id uuid,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'installer',
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_ref text NOT NULL UNIQUE,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  postcode text NOT NULL,
  installation_date date NOT NULL,
  property_type property_type NOT NULL,
  status property_status NOT NULL DEFAULT 'in_progress',
  assigned_installer_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  area_name text NOT NULL,
  area_type area_type NOT NULL,
  custom_room_name text,
  windows_to_replace_count int DEFAULT 0,
  doors_to_replace_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_counts CHECK (windows_to_replace_count >= 0 AND doors_to_replace_count >= 0),
  CONSTRAINT room_has_openings CHECK (
    area_type = 'external' OR 
    (windows_to_replace_count > 0 OR doors_to_replace_count > 0)
  )
);

-- Create openings table
CREATE TABLE IF NOT EXISTS openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  opening_type opening_type NOT NULL,
  opening_number int NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_opening_per_area UNIQUE (area_id, opening_type, opening_number)
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id uuid NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  photo_type photo_type NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  captured_at timestamptz DEFAULT now(),
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  display_order int NOT NULL DEFAULT 1,
  CONSTRAINT valid_display_order CHECK (display_order >= 1 AND display_order <= 45)
);

-- Create checklist_templates table
CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  description text,
  applicability_rules jsonb DEFAULT '{}'::jsonb,
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create checklist_completions table
CREATE TABLE IF NOT EXISTS checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  completed_items jsonb DEFAULT '{}'::jsonb,
  completion_percentage numeric(5, 2) DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_checklist_per_property UNIQUE (property_id, template_id)
);

-- Create archived_properties table
CREATE TABLE IF NOT EXISTS archived_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_property_id uuid NOT NULL,
  property_data jsonb NOT NULL,
  archived_at timestamptz DEFAULT now(),
  archived_by uuid REFERENCES auth.users(id),
  auto_delete_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Create pdf_reports table
CREATE TABLE IF NOT EXISTS pdf_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  version int NOT NULL DEFAULT 1,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_organisation ON profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_properties_organisation ON properties(organisation_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_job_ref ON properties(job_ref);
CREATE INDEX IF NOT EXISTS idx_properties_assigned_installers ON properties USING gin(assigned_installer_ids);
CREATE INDEX IF NOT EXISTS idx_areas_property ON areas(property_id);
CREATE INDEX IF NOT EXISTS idx_openings_area ON openings(area_id);
CREATE INDEX IF NOT EXISTS idx_photos_opening ON photos(opening_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON checklist_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_property ON checklist_completions(property_id);
CREATE INDEX IF NOT EXISTS idx_archived_properties_auto_delete ON archived_properties(auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_property ON pdf_reports(property_id);

-- Enable Row Level Security on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organisations
CREATE POLICY "Users can view their own organisation"
  ON organisations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can view all organisations"
  ON organisations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can create organisations"
  ON organisations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners and admins can update their organisation"
  ON organisations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organisation_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their organisation"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can create profiles in their organisation"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for properties
CREATE POLICY "Users can view properties in their organisation"
  ON properties FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins and assigned installers can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR auth.uid() = ANY(assigned_installer_ids)
  );

-- RLS Policies for areas
CREATE POLICY "Users can view areas for properties in their organisation"
  ON areas FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and assigned installers can create areas"
  ON areas FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
      OR auth.uid() = ANY(assigned_installer_ids)
    )
  );

CREATE POLICY "Admins and assigned installers can update areas"
  ON areas FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
      OR auth.uid() = ANY(assigned_installer_ids)
    )
  );

-- RLS Policies for openings
CREATE POLICY "Users can view openings for properties in their organisation"
  ON openings FOR SELECT
  TO authenticated
  USING (
    area_id IN (
      SELECT a.id FROM areas a
      JOIN properties p ON p.id = a.property_id
      WHERE p.organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and assigned installers can create openings"
  ON openings FOR INSERT
  TO authenticated
  WITH CHECK (
    area_id IN (
      SELECT a.id FROM areas a
      JOIN properties p ON p.id = a.property_id
      WHERE p.organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
      OR auth.uid() = ANY(p.assigned_installer_ids)
    )
  );

-- RLS Policies for photos
CREATE POLICY "Users can view photos for properties in their organisation"
  ON photos FOR SELECT
  TO authenticated
  USING (
    opening_id IN (
      SELECT o.id FROM openings o
      JOIN areas a ON a.id = o.area_id
      JOIN properties p ON p.id = a.property_id
      WHERE p.organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Assigned installers can upload photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    opening_id IN (
      SELECT o.id FROM openings o
      JOIN areas a ON a.id = o.area_id
      JOIN properties p ON p.id = a.property_id
      WHERE auth.uid() = ANY(p.assigned_installer_ids)
      OR p.organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Users can delete their own photos"
  ON photos FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- RLS Policies for checklist_templates
CREATE POLICY "Users can view templates in their organisation"
  ON checklist_templates FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can create templates"
  ON checklist_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update templates"
  ON checklist_templates FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for checklist_completions
CREATE POLICY "Users can view checklist completions in their organisation"
  ON checklist_completions FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Assigned installers can create/update checklist completions"
  ON checklist_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties 
      WHERE auth.uid() = ANY(assigned_installer_ids)
      OR organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Assigned installers can update checklist completions"
  ON checklist_completions FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE auth.uid() = ANY(assigned_installer_ids)
      OR organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- RLS Policies for archived_properties
CREATE POLICY "Users can view archived properties in their organisation"
  ON archived_properties FOR SELECT
  TO authenticated
  USING (
    (property_data->>'organisation_id')::uuid IN (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can archive properties"
  ON archived_properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for pdf_reports
CREATE POLICY "Users can view PDF reports in their organisation"
  ON pdf_reports FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and assigned installers can generate PDF reports"
  ON pdf_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties 
      WHERE organisation_id IN (
        SELECT organisation_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
      OR auth.uid() = ANY(assigned_installer_ids)
    )
  );

-- Create function to auto-create external area on property creation
CREATE OR REPLACE FUNCTION create_external_area()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO areas (property_id, area_name, area_type, windows_to_replace_count, doors_to_replace_count)
  VALUES (NEW.id, 'External', 'external', 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating external area
DROP TRIGGER IF EXISTS auto_create_external_area ON properties;
CREATE TRIGGER auto_create_external_area
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION create_external_area();

-- Create function to auto-create openings when area is created/updated
CREATE OR REPLACE FUNCTION create_openings_for_area()
RETURNS TRIGGER AS $$
DECLARE
  i int;
BEGIN
  -- Delete existing openings if counts changed
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM openings WHERE area_id = NEW.id;
  END IF;

  -- Create window openings
  FOR i IN 1..NEW.windows_to_replace_count LOOP
    INSERT INTO openings (area_id, opening_type, opening_number)
    VALUES (NEW.id, 'window', i)
    ON CONFLICT (area_id, opening_type, opening_number) DO NOTHING;
  END LOOP;

  -- Create door openings
  FOR i IN 1..NEW.doors_to_replace_count LOOP
    INSERT INTO openings (area_id, opening_type, opening_number)
    VALUES (NEW.id, 'door', i)
    ON CONFLICT (area_id, opening_type, opening_number) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating openings
DROP TRIGGER IF EXISTS auto_create_openings ON areas;
CREATE TRIGGER auto_create_openings
  AFTER INSERT OR UPDATE OF windows_to_replace_count, doors_to_replace_count ON areas
  FOR EACH ROW
  WHEN (NEW.windows_to_replace_count > 0 OR NEW.doors_to_replace_count > 0)
  EXECUTE FUNCTION create_openings_for_area();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_areas_updated_at ON areas;
CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_completions_updated_at ON checklist_completions;
CREATE TRIGGER update_checklist_completions_updated_at
  BEFORE UPDATE ON checklist_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();