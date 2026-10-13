"use client"
import { useState, useRef } from "react";
import Papa from "papaparse";
import axios from "axios";
import styles from "./Form.module.css";

// 1. Interface updated to match Prisma PascalCase
interface RowEntry {
  index: number;
  data: {
    Manufacturer: string;
    Operator: string;
    Latitude: number;
    Longitude: number;
  };
  error?: string;
}

export default function FlockTableComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validRows, setValidRows] = useState<RowEntry[]>([]);
  const [invalidRows, setInvalidRows] = useState<RowEntry[]>([]);
  const [submitErrors, setSubmitErrors] = useState<RowEntry[]>([]);
  const [step, setStep] = useState<"idle" | "review" | "submitting" | "done">("idle");
  const [userMessage, setUserMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const parseAndValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        const tempValid: RowEntry[] = [];
        const tempInvalid: RowEntry[] = [];

        result.data.forEach((row: any, idx: number) => {
          // 2. Map CSV lowercase headers to PascalCase for the API
          const lat = row.latitude;
          const lon = row.longitude;
          const mfr = row.manufacturer || "Unknown";
          const opr = row.operator || "Massachusetts";

          if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
            tempValid.push({
              index: idx + 2,
              data: { 
                Manufacturer: mfr, 
                Operator: opr, 
                Latitude: lat, 
                Longitude: lon 
              }
            });
          } else {
            tempInvalid.push({
              index: idx + 2,
              data: { Manufacturer: mfr, Operator: opr, Latitude: 0, Longitude: 0 },
              error: "Missing or Invalid Coordinates"
            });
          }
        });

        setValidRows(tempValid);
        setInvalidRows(tempInvalid);
        setStep("review");
        setIsLoading(false);
      }
    });
  };

  const handleFinalSubmit = async () => {
    setStep("submitting");
    const errors: RowEntry[] = [];

    // 3. Post data using the keys the API expects
    const tasks = validRows.map(async (entry) => {
      try {
        await axios.post("/api/flock", entry.data);
      } catch (err: any) {
        errors.push({
          index: entry.index,
          data: entry.data,
          error: err.response?.data?.error || "Submission failed",
        });
      }
    });

    await Promise.allSettled(tasks);
    setSubmitErrors(errors);
    setStep("done");
    setUserMessage(errors.length === 0 ? "Successfully uploaded all points!" : "Upload complete with some errors.");
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.wrapper}>
        <h1 className={styles.header}>Massachusetts Flock Camera Uploader</h1>

        {userMessage && <div className="p-4 mb-4 bg-blue-50 text-blue-800 rounded">{userMessage}</div>}

        <div className={styles.content}>
          {step === "idle" && (
            <form onSubmit={parseAndValidate} className="flex flex-col gap-4">
              <input type="file" accept=".csv" onChange={handleFileChange} className="border p-2" />
              <button className={styles.button} disabled={isLoading}>
                {isLoading ? "Validating..." : "Analyze Massachusetts CSV"}
              </button>
            </form>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <h3 className="font-bold">Ready to upload: {validRows.length} Points</h3>
              <div className="max-h-60 overflow-auto border text-xs">
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 border text-left">Manufacturer</th>
                      <th className="p-2 border text-left">Operator</th>
                      <th className="p-2 border text-left">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 border">{row.data.Manufacturer}</td>
                        <td className="p-2 border">{row.data.Operator}</td>
                        <td className="p-2 border font-mono">
                          {row.data.Latitude.toFixed(4)}, {row.data.Longitude.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button className={styles.button} onClick={handleFinalSubmit}>Push to Database</button>
                <button className="p-2 bg-gray-200 rounded" onClick={() => setStep("idle")}>Cancel</button>
              </div>
            </div>
          )}

          {step === "submitting" && (
            <div className="py-10 text-center animate-pulse">
              Uploading points to Flock_Camera table...
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4">
               {submitErrors.length > 0 && (
                 <div className="text-red-600 text-sm font-medium">
                   {submitErrors.length} rows failed (duplicates or API errors).
                 </div>
               )}
               <button className={styles.button} onClick={() => { setStep("idle"); setFile(null); setUserMessage(""); }}>
                 Upload Another File
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}