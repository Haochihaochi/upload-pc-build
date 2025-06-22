import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const functionSecret = Deno.env.get("FUNCTION_SECRET");

const supabase = createClient(supabaseUrl!, serviceRoleKey!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-function-secret, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const received = req.headers.get("x-function-secret");
  if (received !== functionSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: "No file uploaded." }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "buffer", cellStyles: true });

  const sheet = workbook.Sheets["PROCESSOR @ NUC"];
  if (!sheet) {
    return new Response(JSON.stringify({ error: "Sheet 'PROCESSOR @ NUC' not found." }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const merges = sheet["!merges"] || [];
  const rowsToInsert: { type: string; description: string; price: number }[] = [];

  for (const merge of merges) {
    const startCol = merge.s.c;
    const startRow = merge.s.r;
    const endRow = merge.e.r;

    const typeCell = sheet[XLSX.utils.encode_cell({ r: startRow, c: startCol })];
    const type = typeCell?.v?.toString().trim() ?? "";

    for (let r = startRow; r <= endRow; r++) {
      const desc = sheet[XLSX.utils.encode_cell({ r, c: startCol + 2 })]?.v?.toString().trim() ?? "";
      const priceRaw = sheet[XLSX.utils.encode_cell({ r, c: startCol + 3 })]?.v?.toString().trim() ?? "";

      if (!priceRaw || priceRaw.toUpperCase() === "NS") continue;

      const cleanedPrice = priceRaw.replace(/[^0-9.]/g, "");
      if (!cleanedPrice) continue;

      const priceWithAdd = parseFloat(cleanedPrice) + 30;

      rowsToInsert.push({
        type,
        description: desc,
        price: priceWithAdd,
      });
    }
  }

  // 🧹 Truncate the processor table to reset ID auto-increment
  const { error: truncateError } = await supabase.rpc("truncate_processor");
if (truncateError) {
  return new Response(JSON.stringify({ error: "Failed to truncate table: " + truncateError.message }), {
    status: 500,
    headers: corsHeaders,
  });
}

  // 💾 Insert new rows
  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("processor").insert(rowsToInsert);
    if (insertError) {
      return new Response(JSON.stringify({ error: "Insert failed: " + insertError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response(JSON.stringify({
    message: "Processor table reset and populated successfully.",
    rowsInserted: rowsToInsert.length,
  }), {
    status: 200,
    headers: corsHeaders,
  });
});
