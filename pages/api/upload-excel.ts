import type { NextApiRequest, NextApiResponse } from "next";

import { parsePcPartsPayload } from "@/lib/pc-parts";

type ApiResponse = Record<string, unknown>;

const EDGE_FUNCTION_URL =
  "https://jioosrbwgchukicvocls.supabase.co/functions/v1/upload-excel";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const receivedSecret = req.headers["x-upload-secret"];
  if (typeof receivedSecret !== "string" || !receivedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const tables = parsePcPartsPayload(req.body?.tables);
  if (!tables) {
    return res.status(400).json({ error: "Invalid or empty parts data" });
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-function-secret": receivedSecret,
        },
        body: JSON.stringify({ tables }),
      });

    const body = await response.text();
    let result: ApiResponse;

    try {
      result = JSON.parse(body) as ApiResponse;
    } catch {
      result = { error: body || "Edge Function returned an invalid response" };
    }

    return res.status(response.status).json(result);
  } catch (error) {
    console.error("Edge Function request failed", error);
    return res.status(502).json({ error: "Unable to reach the Edge Function" });
  }
}
