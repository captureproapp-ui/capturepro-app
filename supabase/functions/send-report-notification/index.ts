import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRecipient {
  email: string;
  name: string;
}

interface RequestBody {
  reportId: string;
  fileUrl: string;
  webReportUrl?: string;
  propertyName?: string;
  jobRef?: string;
  recipients: EmailRecipient[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { reportId, fileUrl, webReportUrl, propertyName, jobRef, recipients }: RequestBody = await req.json();

    if (!reportId || !fileUrl || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Sending report notification for ${reportId} to ${recipients.length} recipients`);
    console.log(`Property: ${propertyName} (${jobRef})`);
    console.log(`Web Report URL: ${webReportUrl}`);
    console.log(`PDF URL: ${fileUrl}`);
    console.log(`Recipients: ${recipients.map(r => r.email).join(", ")}`);

    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    for (const recipient of recipients) {
      try {
        console.log(`Email would be sent to ${recipient.name} (${recipient.email})`);
        console.log(`  - View Online: ${webReportUrl}`);
        console.log(`  - Download PDF: ${fileUrl}`);
        emailsSent.push(recipient.email);
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        emailsFailed.push(recipient.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsFailed,
        message: `Notification logged for ${emailsSent.length} recipients`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});