/*
  # Make file_url nullable for web-only reports

  1. Changes
    - Alter `pdf_reports.file_url` column to allow NULL values
    - This enables web-only report generation without requiring a PDF file
  
  2. Rationale
    - Web reports can exist independently without PDF files
    - Users can choose to generate "Web Only" reports to save storage
    - The application already handles both scenarios in the code
  
  3. Impact
    - Existing reports with file_url will remain unchanged
    - New web-only reports can be created with file_url = NULL
    - At least one of file_url or web_report_html should always exist
*/

-- Make file_url nullable to support web-only reports
ALTER TABLE pdf_reports 
ALTER COLUMN file_url DROP NOT NULL;

-- Add a check constraint to ensure at least one report format exists
ALTER TABLE pdf_reports 
ADD CONSTRAINT at_least_one_report_format 
CHECK (file_url IS NOT NULL OR web_report_html IS NOT NULL);
