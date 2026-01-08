import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for recovery codes
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's token to get their ID
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: "Recovery code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize code (remove spaces/dashes, uppercase)
    const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
    const codeHash = await hashCode(normalizedCode);

    // Use service role to check and update recovery codes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find matching unused recovery code
    const { data: recoveryCode, error: findError } = await supabaseAdmin
      .from('mfa_recovery_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .single();

    if (findError || !recoveryCode) {
      return new Response(
        JSON.stringify({ error: "Invalid or already used recovery code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as used
    await supabaseAdmin
      .from('mfa_recovery_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', recoveryCode.id);

    // Unenroll all MFA factors for this user
    const { data: factors } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
    
    for (const factor of factors?.factors || []) {
      await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId: user.id,
        id: factor.id,
      });
    }

    // Log the recovery code usage
    await supabaseAdmin.from('ferpa_audit_log').insert({
      teacher_id: user.id,
      action: 'used_recovery_code',
      user_agent: req.headers.get('user-agent') || null,
    });

    return new Response(
      JSON.stringify({ success: true, message: "MFA has been reset. Please set up 2FA again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error verifying recovery code:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
