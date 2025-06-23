import * as XLSX from "https://esm.sh/xlsx@0.18.5";

export async function extractRam(sheet: XLSX.WorkSheet) {
  const merges = sheet["!merges"] || [];
  const rowsToInsert: { type: string; description: string; price: number }[] = [];

  for (const merge of merges) {
    const startCol = merge.s.c;
    const startRow = merge.s.r;
    const endRow = merge.e.r;

    const typeCell = sheet[XLSX.utils.encode_cell({ r: startRow, c: startCol })];
    const type = typeCell?.v?.toString().trim() ?? "";

    for (let r = startRow + 1; r <= endRow; r++) {
      const desc = sheet[XLSX.utils.encode_cell({ r, c: startCol + 2 })]?.v?.toString().trim() ?? "";
      const cost = sheet[XLSX.utils.encode_cell({ r, c: startCol + 3 })]?.v?.toString().trim() ?? "";

      if (!cost || cost.toUpperCase() === "NS") continue;

      const cleanedPrice = cost.replace(/[^0-9.]/g, "");
      if (!cleanedPrice) continue;

      const price = parseFloat(cleanedPrice) + 30;

      rowsToInsert.push({
        type,
        description: desc,
        price: price,
      });
    }
  }

  return rowsToInsert;
}
