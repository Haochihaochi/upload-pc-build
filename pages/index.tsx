import { useState } from "react";

import { extractWorkbook } from "@/lib/extract-workbook";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0]);
    else setFile(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setResult("Error: Please select an Excel file first.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setResult("Error: The Excel file must be 5 MB or smaller.");
      return;
    }

    setIsUploading(true);
    setResult("");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
        type: "array",
        cellStyles: false,
      });
      const tables = extractWorkbook(workbook, XLSX);

      if (!Object.keys(tables).length) {
        setResult("Error: The workbook contains no supported parts sheets.");
        return;
      }

      const res = await fetch("/api/upload-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-upload-secret": process.env.NEXT_PUBLIC_FUNCTION_SECRET || "",
        },
        body: JSON.stringify({ tables }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Server error:", json);
        setResult(`Error: ${json.error || json.message || "Unknown error"}`);
        return;
      }

      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      console.error("Fetch error:", error);
      setResult("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-3xl font-bold mb-8">Upload Excel File</h1>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="mb-6 text-gray-300 file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-gray-700 file:text-white
          hover:file:bg-gray-600
          cursor-pointer"
      />

      <button
        onClick={handleSubmit}
        disabled={isUploading}
        className="bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700 text-white font-semibold py-2 px-6 rounded-md transition"
      >
        {isUploading ? "Processing..." : "Submit"}
      </button>

      {result && (
        <pre className="mt-8 w-full max-w-xl bg-gray-900 p-4 rounded-md overflow-auto text-sm">
          {result}
        </pre>
      )}
    </main>
  );
}
