import { supabase } from '../lib/supabase';

export interface ArchiveResult {
  success: boolean;
  propertyId: string;
  jobRef?: string;
  error?: string;
}

export interface BulkArchiveResult {
  successful: ArchiveResult[];
  failed: ArchiveResult[];
  totalCount: number;
}

async function getLatestReportForProperty(propertyId: string): Promise<{ id: string; version: number } | null> {
  try {
    const { data, error } = await supabase
      .from('pdf_reports')
      .select('id, version')
      .eq('property_id', propertyId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest report:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching latest report:', error);
    return null;
  }
}

async function getPropertyDetails(propertyId: string) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, job_ref, status, completion_percentage, organisation_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching property details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching property details:', error);
    return null;
  }
}

export async function archiveProperty(
  propertyId: string,
  userId: string,
  organisationId: string
): Promise<ArchiveResult> {
  try {
    const property = await getPropertyDetails(propertyId);

    if (!property) {
      return {
        success: false,
        propertyId,
        error: 'Property not found',
      };
    }

    if (property.completion_percentage !== 100) {
      return {
        success: false,
        propertyId,
        jobRef: property.job_ref,
        error: 'Property must be 100% complete',
      };
    }

    if (property.status !== 'completed') {
      return {
        success: false,
        propertyId,
        jobRef: property.job_ref,
        error: 'Property must have completed status',
      };
    }

    const latestReport = await getLatestReportForProperty(propertyId);

    if (!latestReport) {
      return {
        success: false,
        propertyId,
        jobRef: property.job_ref,
        error: 'No report found - generate report first',
      };
    }

    const { error: archiveError } = await supabase.rpc('archive_property_with_report', {
      p_property_id: propertyId,
      p_pdf_report_id: latestReport.id,
      p_archived_by: userId,
    });

    if (archiveError) {
      console.error('Error archiving property:', archiveError);
      return {
        success: false,
        propertyId,
        jobRef: property.job_ref,
        error: archiveError.message || 'Failed to archive property',
      };
    }

    return {
      success: true,
      propertyId,
      jobRef: property.job_ref,
    };
  } catch (error) {
    console.error('Exception archiving property:', error);
    return {
      success: false,
      propertyId,
      error: 'An unexpected error occurred',
    };
  }
}

export async function bulkArchiveProperties(
  propertyIds: string[],
  userId: string,
  organisationId: string
): Promise<BulkArchiveResult> {
  const results: ArchiveResult[] = [];

  for (const propertyId of propertyIds) {
    const result = await archiveProperty(propertyId, userId, organisationId);
    results.push(result);
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return {
    successful,
    failed,
    totalCount: propertyIds.length,
  };
}

export async function canArchiveProperty(propertyId: string): Promise<{
  canArchive: boolean;
  reason?: string;
}> {
  const property = await getPropertyDetails(propertyId);

  if (!property) {
    return { canArchive: false, reason: 'Property not found' };
  }

  if (property.status === 'archived') {
    return { canArchive: false, reason: 'Property is already archived' };
  }

  if (property.completion_percentage !== 100) {
    return { canArchive: false, reason: 'Property must be 100% complete' };
  }

  if (property.status !== 'completed') {
    return { canArchive: false, reason: 'Property must have completed status' };
  }

  const latestReport = await getLatestReportForProperty(propertyId);

  if (!latestReport) {
    return { canArchive: false, reason: 'No report found - generate report first' };
  }

  return { canArchive: true };
}
