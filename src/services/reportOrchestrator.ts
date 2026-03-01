import { collectReportData } from './reportDataCollector';
import { generatePAS2030Report } from './pdfGenerator';
import { generateWebReport } from './webReportGenerator';
import { uploadReportToStorage, downloadReport } from './reportStorage';
import { supabase } from '../lib/supabase';

export interface ReportGenerationResult {
  success: boolean;
  reportId?: string;
  fileUrl?: string;
  version?: number;
  error?: string;
}

export async function generateAndSaveReport(propertyId: string): Promise<ReportGenerationResult> {
  console.log('[REPORT] Starting report generation for property:', propertyId);

  try {
    console.log('[REPORT] Step 1: Collecting report data...');
    const data = await collectReportData(propertyId);
    console.log('[REPORT] Data collection complete. Property:', data.property.job_reference);

    console.log('[REPORT] Step 2: Generating PDF...');
    const pdfBlob = await generatePAS2030Report(data);
    console.log('[REPORT] PDF generation complete. Size:', pdfBlob.size, 'bytes');

    console.log('[REPORT] Step 2b: Generating web report...');
    const webReportHtml = generateWebReport(data);
    console.log('[REPORT] Web report generation complete. Size:', webReportHtml.length, 'characters');

    console.log('[REPORT] Step 3: Uploading to storage...');
    const { reportId, fileUrl, version, fileSizeBytes } = await uploadReportToStorage(pdfBlob, data, webReportHtml);
    console.log('[REPORT] Upload complete. Version:', version, 'Report ID:', reportId);

    console.log('[REPORT] Step 4: Downloading report...');
    await downloadReport(fileUrl, `PAS2030_${data.property.job_reference}_v${version}.pdf`);
    console.log('[REPORT] Download complete');

    console.log('[REPORT] Report generation fully complete!');
    return {
      success: true,
      reportId,
      fileUrl,
      version,
    };
  } catch (error) {
    console.error('[REPORT] Report generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function generateAndSaveWebReportOnly(propertyId: string): Promise<ReportGenerationResult> {
  console.log('[WEB-REPORT] Starting web report only generation for property:', propertyId);

  try {
    console.log('[WEB-REPORT] Step 1: Collecting report data...');
    const data = await collectReportData(propertyId);
    console.log('[WEB-REPORT] Data collection complete. Property:', data.property.job_reference);

    console.log('[WEB-REPORT] Step 2: Generating web report...');
    const webReportHtml = generateWebReport(data);
    console.log('[WEB-REPORT] Web report generation complete. Size:', webReportHtml.length, 'characters');

    console.log('[WEB-REPORT] Step 3: Saving to database...');
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

    const { data: reportRecord, error: insertError } = await supabase
      .from('pdf_reports')
      .insert({
        property_id: data.property.id,
        organisation_id: data.organisation.id,
        file_url: null,
        file_size_bytes: 0,
        version,
        generated_by: user.id,
        email_send_status: null,
        web_report_html: webReportHtml,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create report record: ${insertError.message}`);
    }

    const reportId = reportRecord.id;
    console.log('[WEB-REPORT] Database save complete. Version:', version, 'Report ID:', reportId);

    console.log('[WEB-REPORT] Web report generation fully complete!');
    return {
      success: true,
      reportId,
      version,
    };
  } catch (error) {
    console.error('[WEB-REPORT] Web report generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
