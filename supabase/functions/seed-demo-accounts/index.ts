import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_ACCOUNTS = [
  {
    email: 'demo.teacher@nyclogic.edu',
    password: 'DemoTeacher2025!',
    fullName: 'Demo Teacher',
    role: 'teacher',
  },
  {
    email: 'demo.admin@nyclogic.edu',
    password: 'DemoAdmin2025!',
    fullName: 'Demo Administrator',
    role: 'admin',
  },
];

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to create users
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = [];

    for (const demo of DEMO_ACCOUNTS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === demo.email);

      if (existingUser) {
        // Update the profile to ensure correct role
        await supabaseAdmin
          .from('profiles')
          .update({ role: demo.role, full_name: demo.fullName })
          .eq('id', existingUser.id);

        results.push({ email: demo.email, status: 'already_exists', userId: existingUser.id });
        continue;
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: {
          full_name: demo.fullName,
          role: demo.role,
        },
      });

      if (createError) {
        results.push({ email: demo.email, status: 'error', error: createError.message });
        continue;
      }

      // Create/update profile with correct role
      if (newUser?.user) {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: newUser.user.id,
            email: demo.email,
            full_name: demo.fullName,
            role: demo.role,
          });

        results.push({ email: demo.email, status: 'created', userId: newUser.user.id });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo accounts processed',
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error seeding demo accounts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
