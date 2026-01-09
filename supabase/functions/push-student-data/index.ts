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
      .select('integration_webhook_url, integration_webhook_enabled')
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

    // Prepare payload for webhook
    const webhookPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      source: 'scan-genius',
      student: {
        id: studentId,
        name: studentName,
        class_id: classId,
        class_name: className,
      },
      data: data,
    };

    console.log('Sending to webhook:', settings.integration_webhook_url);

    // Send to webhook (Zapier/n8n)
    const webhookResponse = await fetch(settings.integration_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', errorText);
      return new Response(
        JSON.stringify({ success: false, message: 'Webhook delivery failed', error: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Webhook delivered successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Data pushed successfully' }),
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
