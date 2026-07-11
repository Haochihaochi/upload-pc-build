import type * as XLSX from "xlsx";

import type { PcPartRow, PcPartsPayload, TableName } from "./pc-parts";

type XlsxModule = typeof XLSX;

type SheetConfig = {
  name: string;
  table: TableName;
  descriptionOffset: number;
  priceOffset: number;
  markup: number;
};

const SHEETS: SheetConfig[] = [
  {
    name: "PROCESSOR @ NUC",
    table: "processor",
    descriptionOffset: 2,
    priceOffset: 3,
    markup: 30,
  },
  {
    name: "VGA",
    table: "gpu",
    descriptionOffset: 2,
    priceOffset: 3,
    markup: 30,
  },
  {
    name: "RAM",
    table: "ram",
    descriptionOffset: 2,
    priceOffset: 3,
    markup: 30,
  },
  {
    name: "MOTHERBOARD",
    table: "motherboard",
    descriptionOffset: 2,
    priceOffset: 3,
    markup: 30,
  },
  {
    name: "SSD & HDD",
    table: "storage",
    descriptionOffset: 2,
    priceOffset: 3,
    markup: 30,
  },
  {
    name: "PSU",
    table: "psu",
    descriptionOffset: 3,
    priceOffset: 4,
    markup: 30,
  },
  {
    name: "CASING",
    table: "casing",
    descriptionOffset: 3,
    priceOffset: 4,
    markup: 20,
  },
  {
    name: "FAN",
    table: "cooler",
    descriptionOffset: 3,
    priceOffset: 4,
    markup: 10,
  },
];

function getCellText(
  sheet: XLSX.WorkSheet,
  xlsx: XlsxModule,
  row: number,
  column: number,
) {
  return (
    sheet[xlsx.utils.encode_cell({ r: row, c: column })]?.v
      ?.toString()
      .trim() ?? ""
  );
}

function parsePrice(value: string, markup: number) {
  if (!value || value.toUpperCase() === "NS") return null;

  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  const price = Number.parseFloat(cleaned);
  return Number.isFinite(price) ? price + markup : null;
}

function extractMergedRows(
  sheet: XLSX.WorkSheet,
  xlsx: XlsxModule,
  config: SheetConfig,
) {
  const rows: PcPartRow[] = [];

  for (const merge of sheet["!merges"] ?? []) {
    const startColumn = merge.s.c;
    const type = getCellText(sheet, xlsx, merge.s.r, startColumn);

    for (let row = merge.s.r + 1; row <= merge.e.r; row += 1) {
      const description = getCellText(
        sheet,
        xlsx,
        row,
        startColumn + config.descriptionOffset,
      );
      const price = parsePrice(
        getCellText(sheet, xlsx, row, startColumn + config.priceOffset),
        config.markup,
      );

      if (price === null) continue;
      rows.push({ type, description, price });
    }
  }

  return rows;
}

function extractProcessorManualRows(
  sheet: XLSX.WorkSheet,
  xlsx: XlsxModule,
) {
  const rows: PcPartRow[] = [];

  for (let row = 2; row <= 6; row += 1) {
    const description = getCellText(sheet, xlsx, row, 3);
    const price = parsePrice(getCellText(sheet, xlsx, row, 5), 30);

    if (price === null) continue;
    rows.push({
      type: row < 5 ? "INTEL" : "AMD",
      description,
      price,
    });
  }

  return rows;
}

export function extractWorkbook(
  workbook: XLSX.WorkBook,
  xlsx: XlsxModule,
): PcPartsPayload {
  const payload: PcPartsPayload = {};

  for (const config of SHEETS) {
    const sheet = workbook.Sheets[config.name];
    if (!sheet) continue;

    const rows = extractMergedRows(sheet, xlsx, config);
    if (config.table === "processor") {
      rows.push(...extractProcessorManualRows(sheet, xlsx));
    }

    if (rows.length) payload[config.table] = rows;
  }

  return payload;
}
