import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const functionSecret = Deno.env.get("FUNCTION_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-function-secret, content-type",
  "Content-Type": "application/json",
};

const supportedTables = [
  { table: "processor", truncateFn: "truncate_processor" },
  { table: "gpu", truncateFn: "truncate_gpu" },
  { table: "ram", truncateFn: "truncate_ram" },
  { table: "motherboard", truncateFn: "truncate_motherboard" },
  { table: "storage", truncateFn: "truncate_storage" },
  { table: "psu", truncateFn: "truncate_psu" },
  { table: "casing", truncateFn: "truncate_casing" },
  { table: "cooler", truncateFn: "truncate_cooler" },
] as const;

type Row = { type: string; description: string; price: number };

function isRow(value: unknown): value is Row {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;

  return (
    typeof row.type === "string" &&
    typeof row.description === "string" &&
    typeof row.price === "number" &&
    Number.isFinite(row.price)
  );
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const received = req.headers.get("x-function-secret");
  if (received !== functionSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase environment variables are missing");
    return jsonResponse({ error: "Server is not configured" }, 500);
  }

  try {
    const body = await req.json();
    const tables = body?.tables;

    if (!tables || typeof tables !== "object" || Array.isArray(tables)) {
      return jsonResponse({ error: "Invalid or empty parts data" }, 400);
    }

    const validated = new Map<string, Row[]>();
    for (const { table } of supportedTables) {
      const rows = (tables as Record<string, unknown>)[table];
      if (rows === undefined) continue;

      if (!Array.isArray(rows) || rows.length > 5_000 || !rows.every(isRow)) {
        return jsonResponse({ error: `Invalid rows for ${table}` }, 400);
      }

      if (rows.length) validated.set(table, rows);
    }

    if (!validated.size) {
      return jsonResponse({ error: "No populated tables were provided" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const results: Record<string, unknown>[] = [];

    for (const { table, truncateFn } of supportedTables) {
      const rows = validated.get(table);
      if (!rows) continue;

      const { error: truncateError } = await supabase.rpc(truncateFn);
      if (truncateError) {
        results.push({
          table,
          status: "error",
          message: "Truncate failed",
          error: truncateError.message,
        });
        continue;
      }

      const { error: insertError } = await supabase.from(table).insert(rows);
      if (insertError) {
        results.push({
          table,
          status: "error",
          message: "Insert failed",
          error: insertError.message,
        });
      } else {
        results.push({ table, status: "success", inserted: rows.length });
      }
    }

    const hasErrors = results.some((result) => result.status === "error");
    return jsonResponse(
      { message: "Upload processed.", results },
      hasErrors ? 500 : 200,
    );
  } catch (error) {
    console.error("Upload processing failed", error);
    return jsonResponse({ error: "Invalid JSON request" }, 400);
  }
});
