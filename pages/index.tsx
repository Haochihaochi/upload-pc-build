import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0]);
    else setFile(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    console.log("Sending function secret:", process.env.NEXT_PUBLIC_FUNCTION_SECRET);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        "https://jioosrbwgchukicvocls.supabase.co/functions/v1/upload-excel",
        {
          method: "POST",
          headers: {
            "x-function-secret": process.env.NEXT_PUBLIC_FUNCTION_SECRET || "",
          },
          body: formData,
        }
      );

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
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition"
      >
        Submit
      </button>

      {result && (
        <pre className="mt-8 w-full max-w-xl bg-gray-900 p-4 rounded-md overflow-auto text-sm">
          {result}
        </pre>
      )}
    </main>
  );
}
