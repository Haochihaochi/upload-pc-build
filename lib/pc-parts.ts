export const TABLE_NAMES = [
  "processor",
  "gpu",
  "ram",
  "motherboard",
  "storage",
  "psu",
  "casing",
  "cooler",
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

export type PcPartRow = {
  type: string;
  description: string;
  price: number;
};

export type PcPartsPayload = Partial<Record<TableName, PcPartRow[]>>;

const MAX_ROWS_PER_TABLE = 5_000;

function isPcPartRow(value: unknown): value is PcPartRow {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  return (
    typeof row.type === "string" &&
    typeof row.description === "string" &&
    typeof row.price === "number" &&
    Number.isFinite(row.price)
  );
}

export function parsePcPartsPayload(value: unknown): PcPartsPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const payload: PcPartsPayload = {};

  for (const table of TABLE_NAMES) {
    const rows = input[table];
    if (rows === undefined) continue;

    if (
      !Array.isArray(rows) ||
      rows.length > MAX_ROWS_PER_TABLE ||
      !rows.every(isPcPartRow)
    ) {
      return null;
    }

    payload[table] = rows;
  }

  return Object.keys(payload).length ? payload : null;
}
