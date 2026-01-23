import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface InviteRequest {
  student_name?: string;
  student_email?: string;
  external_ref?: string;
  class_id?: string;
  expires_days?: number;
}

interface BulkInviteRequest {
  students: Array<{
    name?: string;
    email?: string;
    external_ref?: string;
  }>;
  class_id?: string;
  expires_days?: number;
}

// Generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (const byte of array) {
    token += chars[byte % chars.length];
  }
  return token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API token and get teacher ID
    const tokenHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(apiKey)
    );
    const hashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: tokenData, error: tokenError } = await supabase
      .from('integration_tokens')
      .select('id, created_by, is_active')
      .eq('token_hash', hashHex)
      .single();

    if (tokenError || !tokenData?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use created_by if set, otherwise use the token's own ID as a system identifier
    // This allows API-only integrations without requiring a teacher account in ScholarQuest
    const teacherId = tokenData.created_by || tokenData.id;
    const body = await req.json();
    const action = body.action || 'generate';
    
    // Get base URL for invite links
    const baseUrl = Deno.env.get('INVITE_BASE_URL') || 'https://scholar-quest-rewards.lovable.app';

    if (action === 'generate') {
      // Single invite generation
      const { student_name, student_email, external_ref, class_id, expires_days = 30 } = body as InviteRequest;
      
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_days);

      const { data: invite, error } = await supabase
        .from('student_invite_links')
        .insert({
          token,
          teacher_id: teacherId,
          student_name,
          student_email,
          external_ref,
          class_id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create invite: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          invite: {
            id: invite.id,
            token: invite.token,
            invite_url: `${baseUrl}/invite/${invite.token}`,
            student_name: invite.student_name,
            expires_at: invite.expires_at,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'bulk_generate') {
      // Bulk invite generation
      const { students, class_id, expires_days = 30 } = body as BulkInviteRequest;
      
      if (!students || !Array.isArray(students) || students.length === 0) {
        return new Response(
          JSON.stringify({ error: 'students array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_days);

      const invites = students.map(student => ({
        token: generateToken(),
        teacher_id: teacherId,
        student_name: student.name,
        student_email: student.email,
        external_ref: student.external_ref,
        class_id,
        expires_at: expiresAt.toISOString(),
      }));

      const { data: createdInvites, error } = await supabase
        .from('student_invite_links')
        .insert(invites)
        .select();

      if (error) {
        throw new Error(`Failed to create invites: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: createdInvites.length,
          invites: createdInvites.map(inv => ({
            id: inv.id,
            token: inv.token,
            invite_url: `${baseUrl}/invite/${inv.token}`,
            student_name: inv.student_name,
            student_email: inv.student_email,
            expires_at: inv.expires_at,
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'list') {
      // List teacher's invite links
      const { data: invites, error } = await supabase
        .from('student_invite_links')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch invites: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          invites: invites.map(inv => ({
            ...inv,
            invite_url: `${baseUrl}/invite/${inv.token}`,
            is_valid: !inv.used_at && new Date(inv.expires_at) > new Date(),
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'revoke') {
      // Revoke an invite link
      const { token, id } = body;
      
      if (!token && !id) {
        return new Response(
          JSON.stringify({ error: 'token or id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const query = supabase
        .from('student_invite_links')
        .delete()
        .eq('teacher_id', teacherId);

      if (id) {
        query.eq('id', id);
      } else {
        query.eq('token', token);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to revoke invite: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Invite revoked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
