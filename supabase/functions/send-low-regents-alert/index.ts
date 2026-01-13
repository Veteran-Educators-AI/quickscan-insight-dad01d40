import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LowRegentsAlertRequest {
  studentId: string;
  studentName: string;
  regentsScore: number;
  grade: number;
  topicName: string;
  nysStandard?: string;
  teacherEmail: string;
  teacherName: string;
  threshold: number;
  feedback?: string;
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getRegentsScoreLabel(score: number): string {
  if (score >= 4) return "Thorough Understanding";
  if (score >= 3) return "Complete and Correct";
  if (score >= 2) return "Partial Understanding";
  if (score >= 1) return "Minimal Understanding";
  return "No Understanding";
}

async function sendLowRegentsAlert(request: LowRegentsAlertRequest): Promise<Response> {
  const { 
    studentId, 
    studentName, 
    regentsScore,
    grade,
    topicName, 
    nysStandard,
    teacherEmail, 
    teacherName,
    threshold,
    feedback
  } = request;

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY not configured");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subject = `⚠️ Low Regents Score Alert: ${studentName} scored ${regentsScore}/4`;
  const scoreLabel = getRegentsScoreLabel(regentsScore);

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
      <h1 style="color: #991B1B; margin: 0; font-size: 24px;">Low Regents Score Alert</h1>
    </div>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${teacherName || 'Teacher'},</p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      <strong>${studentName}</strong> received a Regents score below your threshold of <strong>${threshold}</strong> on a recent assessment.
    </p>

    <div style="background-color: #FEF2F2; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <div style="display: inline-block; background-color: #DC2626; color: white; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 32px; font-weight: bold; margin-bottom: 12px;">
        ${regentsScore}
      </div>
      <p style="color: #991B1B; font-size: 18px; font-weight: 600; margin: 8px 0 0 0;">${scoreLabel}</p>
      <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">out of 4 points</p>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Student:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Topic:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${topicName}</td>
        </tr>
        ${nysStandard ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">NYS Standard:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${nysStandard}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Regents Score:</td>
          <td style="padding: 8px 0; color: #DC2626; font-size: 14px; font-weight: 600; text-align: right;">${regentsScore}/4</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Grade:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${grade}%</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Alert Threshold:</td>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; text-align: right;">Below ${threshold}</td>
        </tr>
      </table>
    </div>

    ${feedback ? `
    <div style="background-color: #FFFBEB; border: 1px solid #FED7AA; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #92400E; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">AI Feedback:</p>
      <p style="color: #78350F; font-size: 14px; line-height: 1.5; margin: 0;">${feedback}</p>
    </div>
    ` : ''}

    <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #1E40AF; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">💡 Recommended Actions:</p>
      <ul style="color: #1E40AF; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
        <li>Review the student's work for common misconceptions</li>
        <li>Schedule one-on-one support or tutoring</li>
        <li>Assign targeted remediation practice</li>
        <li>Check for patterns across multiple assessments</li>
      </ul>
    </div>

    <p style="color: #9ca3af; font-size: 14px; margin-top: 32px; text-align: center;">
      This notification was sent by ScanGenius. View the Reports page for more details.
    </p>
  </div>
</body>
</html>
  `;

  try {
    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "ScanGenius", email: "noreply@lovable.dev" },
        to: [{ email: teacherEmail, name: teacherName || "Teacher" }],
        subject: subject,
        htmlContent: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Brevo API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Low Regents score alert sent successfully to:", teacherEmail);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      const body: LowRegentsAlertRequest = await req.json();
      return await sendLowRegentsAlert(body);
    }

    return new Response(JSON.stringify({ error: "Invalid request method" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-low-regents-alert:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
