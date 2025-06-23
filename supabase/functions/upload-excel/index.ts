import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { extractProcessor } from "./extract/processor.ts";
import { extractGpu } from "./extract/gpu.ts";
import { extractRam } from "./extract/ram.ts";
import { extractMobo } from "./extract/mobo.ts";
import { extractStorage } from "./extract/storage.ts";
import { extractPsu } from "./extract/psu.ts";
import { extractCasing } from "./extract/casing.ts";
import { extractCooler } from "./extract/cooler.ts";

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

  const supportedSheets = [
    { name: "PROCESSOR @ NUC", table: "processor", extractor: extractProcessor, truncateFn: "truncate_processor" },
    { name: "VGA", table: "gpu", extractor: extractGpu, truncateFn: "truncate_gpu" },
    { name: "RAM", table: "ram", extractor: extractRam, truncateFn: "truncate_ram" },
    { name: "MOTHERBOARD", table: "motherboard", extractor: extractMobo, truncateFn: "truncate_motherboard" },
    { name: "SSD & HDD", table: "storage", extractor: extractStorage, truncateFn: "truncate_storage" },
    { name: "PSU", table: "psu", extractor: extractPsu, truncateFn: "truncate_psu" },
    { name: "CASING", table: "casing", extractor: extractCasing, truncateFn: "truncate_casing" },
    { name: "FAN", table: "cooler", extractor: extractCooler, truncateFn: "truncate_cooler" },
  ];

  const results: any[] = [];

  for (const { name, table, extractor, truncateFn } of supportedSheets) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    // Truncate table
    const { error: truncateError } = await supabase.rpc(truncateFn);
    if (truncateError) {
      results.push({ table, status: "error", message: "Truncate failed", error: truncateError.message });
      continue;
    }

    // Extract data
    const rowsToInsert = await extractor(sheet);
    if (!rowsToInsert.length) {
      results.push({ table, status: "warning", message: "No rows extracted" });
      continue;
    }

    // Insert into Supabase
    const { error: insertError } = await supabase.from(table).insert(rowsToInsert);
    if (insertError) {
      results.push({ table, status: "error", message: "Insert failed", error: insertError.message });
    } else {
      results.push({ table, status: "success", inserted: rowsToInsert.length });
    }
  }

  return new Response(JSON.stringify({
    message: "Upload processed.",
    results,
  }), {
    status: 200,
    headers: corsHeaders,
  });
});
