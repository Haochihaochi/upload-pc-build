import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const functionSecret = Deno.env.get("FUNCTION_SECRET");

console.log("[TEST] SUPABASE_URL loaded:", !!supabaseUrl);
console.log("[TEST] SERVICE_ROLE_KEY loaded:", !!serviceRoleKey);
console.log("[TEST] FUNCTION_SECRET loaded:", !!functionSecret);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-function-secret, content-type",
};

serve(async (req) => {
  const received = req.headers.get("x-function-secret");
  console.log("[TEST] Received x-function-secret:", received);

  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const isAuthorized = received === functionSecret;

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        expectedSecretStart: functionSecret?.slice(0, 6) + "...",
        receivedSecret: received,
      }),
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  // Handle file upload
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: "No file uploaded." }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      message: "File received successfully!",
      fileName: file.name,
      size: file.size,
    }),
    {
      status: 200,
      headers: corsHeaders,
    }
  );
});
