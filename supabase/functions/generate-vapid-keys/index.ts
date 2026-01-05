import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API
async function generateVAPIDKeys() {
  // Generate an ECDSA key pair using the P-256 curve
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export the public key in raw format
  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Export the private key in JWK format to get the 'd' parameter
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKeyBase64 = privateKeyJwk.d!
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating VAPID keys...');
    
    const keys = await generateVAPIDKeys();
    
    console.log('VAPID keys generated successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        keys: {
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
        },
        instructions: [
          "1. Copy the publicKey and add it as VAPID_PUBLIC_KEY secret",
          "2. Copy the privateKey and add it as VAPID_PRIVATE_KEY secret",
          "3. These keys are generated fresh - save them securely!"
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating VAPID keys:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
