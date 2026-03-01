/*
  # Add Super Admin RLS Policies for Analytics

  ## Problem
  Super admins cannot access platform analytics because they lack RLS policies
  to read the tables required for analytics calculations. This causes the 
  Platform Analytics dashboard to hang indefinitely.

  ## Changes
  Add SELECT policies for super admins on all tables needed for analytics:
  
  1. **Properties** - For property analytics and counts
  2. **Photos** - For photo analytics and storage calculations  
  3. **PDF Reports** - For report analytics and metrics
  4. **Areas** - For area statistics per property
  5. **Openings** - For opening statistics per property
  6. **Property Evidence Requirements** - For evidence completion tracking
  7. **Archived Properties** - For historical property data
  8. **Measure Types** - For measure type analytics
  9. **Organisation Measures** - For subscription measure tracking
  10. **Property Measures** - For property-specific measures
  11. **Evidence Item Templates** - For evidence template analytics
  12. **Notifications** - For notification analytics (if needed)
  13. **Property Elevations** - For elevation checklist data

  ## Security
  All policies check `is_super_admin()` function which verifies the user
  has the super_admin flag set to true in their profile.
*/

-- Super admins can read all properties
CREATE POLICY "Super admins can read all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all photos
CREATE POLICY "Super admins can read all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all PDF reports
CREATE POLICY "Super admins can read all pdf_reports"
  ON pdf_reports FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all areas
CREATE POLICY "Super admins can read all areas"
  ON areas FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all openings
CREATE POLICY "Super admins can read all openings"
  ON openings FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all property evidence requirements
CREATE POLICY "Super admins can read all property_evidence_requirements"
  ON property_evidence_requirements FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all archived properties
CREATE POLICY "Super admins can read all archived_properties"
  ON archived_properties FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all measure types
CREATE POLICY "Super admins can read all measure_types"
  ON measure_types FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all organisation measures
CREATE POLICY "Super admins can read all organisation_measures"
  ON organisation_measures FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all property measures
CREATE POLICY "Super admins can read all property_measures"
  ON property_measures FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all evidence item templates
CREATE POLICY "Super admins can read all evidence_item_templates"
  ON evidence_item_templates FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all notifications
CREATE POLICY "Super admins can read all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can read all property elevations
CREATE POLICY "Super admins can read all property_elevations"
  ON property_elevations FOR SELECT
  TO authenticated
  USING (is_super_admin());
