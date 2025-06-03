// supabase/functions/upload-excel/index.ts
// @ts-ignore: Deno import - works in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno-compatible xlsx lib
import * as xlsx from "https://esm.sh/xlsx";


serve(async (req: Request): Promise<Response> => {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), {
      status: 400,
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = xlsx.read(arrayBuffer, { type: "array" });

  // Just example logic - replace with your own Excel processing
  const sheetNames = workbook.SheetNames;
  const sheetData = xlsx.utils.sheet_to_json(
    workbook.Sheets[sheetNames[0]]
  );

  return new Response(JSON.stringify({ sheetNames, data: sheetData }), {
    headers: { "Content-Type": "application/json" },
  });
});
