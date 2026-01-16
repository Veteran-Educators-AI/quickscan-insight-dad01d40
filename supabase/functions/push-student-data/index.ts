import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushDataRequest {
  eventType: 'scan_analysis' | 'diagnostic_results';
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  data: Record<string, unknown>;
  teacherId: string;
}

// Helper to check for low scores or misconceptions
function checkForAlerts(data: Record<string, unknown>): { hasLowScore: boolean; hasMisconceptions: boolean; score?: number; misconceptions?: string[] } {
  const score = typeof data.totalScore === 'number' ? data.totalScore : 
                typeof data.grade === 'number' ? data.grade : undefined;
  const misconceptions = Array.isArray(data.misconceptions) ? data.misconceptions : [];
  
  return {
    hasLowScore: score !== undefined && score < 65,
    hasMisconceptions: misconceptions.length > 0,
    score,
    misconceptions: misconceptions.map((m: unknown) => typeof m === 'string' ? m : String(m)),
  };
}

// Send push notification to teacher
async function sendPushNotification(
  supabase: any,
  teacherId: string,
  title: string,
  body: string,
  _data: Record<string, unknown>
) {
  try {
    // Get teacher's push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', teacherId);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for teacher');
      return;
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not configured');
      return;
    }

    // Use the existing send-push-notification function logic
    console.log(`Would send push notification: ${title} - ${body}`);
    
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: PushDataRequest = await req.json();
    const { eventType, studentId, studentName, classId, className, data, teacherId } = requestData;

    console.log(`Processing ${eventType} push for student ${studentId}`);

    // Get teacher's webhook settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('integration_webhook_url, integration_webhook_enabled, integration_webhook_api_key')
      .eq('teacher_id', teacherId)
      .single();

    if (settingsError) {
      console.log('No settings found for teacher:', teacherId);
      return new Response(
        JSON.stringify({ success: false, message: 'No webhook configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings?.integration_webhook_enabled || !settings?.integration_webhook_url) {
      console.log('Webhook not enabled or URL not set');
      return new Response(
        JSON.stringify({ success: false, message: 'Webhook not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for alerts (low scores or misconceptions)
    const alerts = checkForAlerts(data);
    
    // Prepare payload for webhook with alert flags
    const webhookPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      source: 'nyclogic-ai',
      student: {
        id: studentId,
        name: studentName,
        class_id: classId,
        class_name: className,
      },
      data: data,
      alerts: {
        low_score: alerts.hasLowScore,
        has_misconceptions: alerts.hasMisconceptions,
        score: alerts.score,
        misconception_count: alerts.misconceptions?.length || 0,
      },
    };

    console.log('Sending to webhook:', settings.integration_webhook_url);
    console.log('Alert flags:', webhookPayload.alerts);

    // Build headers with optional API key
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.integration_webhook_api_key) {
      webhookHeaders['x-api-key'] = settings.integration_webhook_api_key;
    }

    // Send to webhook (Sentry/Zapier/n8n)
    const webhookResponse = await fetch(settings.integration_webhook_url, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await webhookResponse.text();
    let sentryResponse;
    try {
      sentryResponse = JSON.parse(responseText);
    } catch {
      sentryResponse = { raw: responseText };
    }

    if (!webhookResponse.ok) {
      console.error('Webhook error:', responseText);
      return new Response(
        JSON.stringify({ success: false, message: 'Webhook delivery failed', error: responseText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Webhook delivered successfully. Sentry response:', sentryResponse);

    // Send push notifications for alerts
    if (alerts.hasLowScore) {
      await sendPushNotification(
        supabase,
        teacherId,
        '⚠️ Low Score Alert',
        `${studentName} scored ${alerts.score}% - may need intervention`,
        { studentId, studentName, score: alerts.score }
      );
    }

    if (alerts.hasMisconceptions && alerts.misconceptions && alerts.misconceptions.length >= 2) {
      await sendPushNotification(
        supabase,
        teacherId,
        '📝 Misconceptions Detected',
        `${studentName} has ${alerts.misconceptions.length} misconceptions to address`,
        { studentId, studentName, misconceptions: alerts.misconceptions }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data pushed to Sentry successfully',
        sentry_response: sentryResponse,
        alerts_triggered: alerts.hasLowScore || alerts.hasMisconceptions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in push-student-data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
