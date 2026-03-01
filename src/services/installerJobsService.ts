import { supabase } from '../lib/supabase';

export type InstallerJob = {
  property_id: string;
  job_ref: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  property_type: string;
  installation_date: string;
  status: string;
  completion_percentage: number;
  unfinished_openings_count: number;
  total_openings_count: number;
  assigned_installer_ids: string[];
  organisation_id: string;
  created_at: string;
};

export async function getInstallerAssignedJobs(
  userId: string,
  organisationId: string | null
): Promise<InstallerJob[]> {
  let query = supabase
    .from('properties')
    .select('*')
    .contains('assigned_installer_ids', [userId]);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  query = query.neq('status', 'archived').order('installation_date', { ascending: true });

  const { data: properties, error } = await query;

  if (error) {
    console.error('Error fetching installer jobs:', error);
    return [];
  }

  if (!properties || properties.length === 0) {
    return [];
  }

  const enrichedJobs = await Promise.all(
    properties.map(async (property) => {
      const { data: completionData } = await supabase
        .from('property_completion_summary')
        .select('completion_percentage, unfinished_openings_count, total_openings_count')
        .eq('id', property.id)
        .maybeSingle();

      return {
        property_id: property.id,
        job_ref: property.job_ref,
        address_line_1: property.address_line_1,
        address_line_2: property.address_line_2,
        city: property.city,
        postcode: property.postcode,
        property_type: property.property_type,
        installation_date: property.installation_date,
        status: property.status,
        completion_percentage: completionData?.completion_percentage || 0,
        unfinished_openings_count: completionData?.unfinished_openings_count || 0,
        total_openings_count: completionData?.total_openings_count || 0,
        assigned_installer_ids: property.assigned_installer_ids,
        organisation_id: property.organisation_id,
        created_at: property.created_at,
      };
    })
  );

  return enrichedJobs;
}
