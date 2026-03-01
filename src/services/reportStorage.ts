import { supabase } from '../lib/supabase';
import { PropertyReportData } from './reportDataCollector';

interface ReportMetadata {
  reportId: string;
  fileUrl: string;
  version: number;
  fileSizeBytes: number;
}

function sanitizeFilename(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

function generateFilename(data: PropertyReportData, version: number): string {
  const propertyName = data.property.property_name || 'Property';
  const jobRef = data.property.job_reference;
  const installDate = new Date(data.property.installation_date).toISOString().split('T')[0];
  const installerName = data.property.assigned_installer_name || 'Unassigned';

  const sanitizedProperty = sanitizeFilename(propertyName);
  const sanitizedJobRef = sanitizeFilename(jobRef);
  const sanitizedInstaller = sanitizeFilename(installerName);

  return `${sanitizedProperty}_${sanitizedJobRef}_${installDate}_${sanitizedInstaller}_v${version}.pdf`;
}

export async function uploadReportToStorage(
  pdfBlob: Blob,
  data: PropertyReportData,
  webReportHtml?: string
): Promise<ReportMetadata> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: versionData, error: versionError } = await supabase
    .rpc('get_next_report_version', { p_property_id: data.property.id });

  if (versionError) {
    throw new Error(`Failed to get report version: ${versionError.message}`);
  }

  const version = versionData || 1;
  const filename = generateFilename(data, version);
  const storagePath = `org/${data.organisation.id}/properties/${data.property.id}/reports/v${version}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('reports')
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to generate public URL');
  }

  const insertData: any = {
    property_id: data.property.id,
    organisation_id: data.organisation.id,
    file_url: urlData.publicUrl,
    file_size_bytes: pdfBlob.size,
    version,
    generated_by: user.id,
    email_send_status: 'pending',
  };

  if (webReportHtml) {
    insertData.web_report_html = webReportHtml;
  }

  const { data: reportRecord, error: insertError } = await supabase
    .from('pdf_reports')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from('reports').remove([storagePath]);
    throw new Error(`Failed to create report record: ${insertError.message}`);
  }

  return {
    reportId: reportRecord.id,
    fileUrl: urlData.publicUrl,
    version,
    fileSizeBytes: pdfBlob.size,
  };
}

export async function getPropertyReports(propertyId: string) {
  const { data, error } = await supabase
    .from('pdf_reports')
    .select(`
      id,
      file_url,
      version,
      file_size_bytes,
      generated_at,
      email_sent_at,
      email_send_status,
      generated_by,
      web_report_html,
      profiles!pdf_reports_generated_by_profiles_fkey(full_name, email)
    `)
    .eq('property_id', propertyId)
    .order('version', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return data;
}

export async function getOrganisationReports(organisationId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('pdf_reports')
    .select(`
      id,
      property_id,
      file_url,
      version,
      file_size_bytes,
      generated_at,
      email_sent_at,
      email_send_status,
      generated_by,
      web_report_html,
      share_token,
      is_public,
      archived_at,
      auto_delete_at,
      properties!inner(
        job_ref,
        property_name,
        address_line_1,
        city,
        postcode,
        status
      ),
      profiles!pdf_reports_generated_by_profiles_fkey(full_name, email)
    `)
    .eq('organisation_id', organisationId)
    .gte('generated_at', thirtyDaysAgo.toISOString())
    .neq('properties.status', 'archived')
    .order('property_id')
    .order('generated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch organisation reports: ${error.message}`);
  }

  const uniqueReports = new Map();
  data?.forEach((report) => {
    if (!uniqueReports.has(report.property_id) ||
        new Date(report.generated_at) > new Date(uniqueReports.get(report.property_id).generated_at)) {
      uniqueReports.set(report.property_id, report);
    }
  });

  return Array.from(uniqueReports.values()).sort((a, b) =>
    new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
  );
}

export async function downloadReport(fileUrl: string, filename?: string): Promise<void> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'PAS2030_Report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download report');
  }
}

export async function updateEmailStatus(
  reportId: string,
  status: 'sent' | 'failed',
  recipients?: string[]
): Promise<void> {
  const updateData: any = {
    email_send_status: status,
  };

  if (status === 'sent') {
    updateData.email_sent_at = new Date().toISOString();
    if (recipients) {
      updateData.email_sent_to = recipients;
    }
  }

  const { error } = await supabase
    .from('pdf_reports')
    .update(updateData)
    .eq('id', reportId);

  if (error) {
    throw new Error(`Failed to update email status: ${error.message}`);
  }
}

export async function getWebReportContent(reportId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('pdf_reports')
    .select('web_report_html')
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch web report: ${error.message}`);
  }

  return data?.web_report_html || null;
}

export async function getReportById(reportId: string) {
  const { data, error } = await supabase
    .from('pdf_reports')
    .select(`
      id,
      property_id,
      file_url,
      version,
      file_size_bytes,
      generated_at,
      email_sent_at,
      email_send_status,
      generated_by,
      view_count,
      last_viewed_at,
      web_report_html,
      share_token,
      is_public,
      archived_at,
      auto_delete_at,
      properties(
        job_ref,
        property_name,
        address_line_1,
        city,
        postcode
      ),
      profiles!pdf_reports_generated_by_profiles_fkey(full_name, email)
    `)
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  return data;
}

export async function incrementReportViewCount(reportId: string): Promise<void> {
  const { error } = await supabase
    .rpc('increment_report_view_count', { report_id: reportId });

  if (error) {
    console.error('Failed to increment view count:', error);
  }
}

export async function getReportByShareToken(shareToken: string) {
  const { data, error } = await supabase
    .from('pdf_reports')
    .select(`
      id,
      property_id,
      file_url,
      version,
      file_size_bytes,
      generated_at,
      is_public,
      auto_delete_at,
      web_report_html,
      properties(
        job_ref,
        property_name,
        address_line_1,
        city,
        postcode
      ),
      profiles!pdf_reports_generated_by_profiles_fkey(full_name)
    `)
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (data.auto_delete_at && new Date(data.auto_delete_at) < new Date()) {
    return null;
  }

  return data;
}

export async function toggleReportPublicAccess(reportId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('pdf_reports')
    .update({ is_public: isPublic })
    .eq('id', reportId);

  if (error) {
    throw new Error(`Failed to update report visibility: ${error.message}`);
  }
}
