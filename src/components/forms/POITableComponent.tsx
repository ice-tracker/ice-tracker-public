"use client"
import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import axios from "axios";
import styles from "./Form.module.css";


// Submission Format
interface POI {
  Name: string;
  Address: string;
  Latitude: number;
  Longitude: number;
}

// Entry For Each Row
interface RowEntry {
  index: number;
  data: any;
  error?: string;
}

export default function POITableComponent() {
  //File to read
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  //Lists of Valid/Invalid Rows, and Error Messages
  const [validRows, setValidRows] = useState<RowEntry[]>([]);
  const [invalidRows, setInvalidRows] = useState<RowEntry[]>([]);
  const [submitErrors, setSubmitErrors] = useState<RowEntry[]>([]);

  const [step, setStep] = useState<"idle" | "review" | "submitting" | "done">(
    "idle"
  );

  const [userMessage, setUserMessage] = useState("");
  const [isErrorMessage, setIsErrorMessage] = useState(false);

  const messageRef = useRef<HTMLDivElement | null>(null);

  //User Message for User
  useEffect(() => {
    if (userMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [userMessage]);

  const apiUrl = "/api/geocode";

  const displayMessage = (msg: string, error = false) => {
    setUserMessage(msg);
    setIsErrorMessage(error);
  };

  //Handles File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  //Handles CSV Parsing
  const parseCSV = (file: File) =>
    new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    });

  //Converts CSV to Places of Interest
  const mapCsvRowToPOI = (row: any) => {
    return {
      Name: row["Name"]?.trim() || "",
      Address: row["Address"]?.trim() || "",
    };
  };

  //Submission Process
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      displayMessage("Please select a CSV file.", true);
      return;
    }

    setIsLoading(true);
    setUserMessage("");
    setValidRows([]);
    setInvalidRows([]);

    try {
      const result = await parseCSV(file);

      const tempValid: RowEntry[] = [];
      const tempInvalid: RowEntry[] = [];

      const tasks = result.data.map(async (row: any, idx: number) => {
        const base = mapCsvRowToPOI(row);

        // Validate required fields
        if (!base.Name) {
          tempInvalid.push({
            index: idx + 1,
            data: base,
            error: "Missing Name",
          });
          return;
        }

        if (!base.Address) {
          tempInvalid.push({
            index: idx + 1,
            data: base,
            error: "Missing Address",
          });
          return;
        }

        try {
          const response = await axios.get(apiUrl, {
            params: { address: base.Address },
          });

          const results = response.data.results;
          if (!results?.length) {
            tempInvalid.push({
              index: idx + 1,
              data: base,
              error: "Geocoding failed (no results)",
            });
            return;
          }

          const { lat, lng } = results[0].geometry.location;

          tempValid.push({
            index: idx + 1,
            data: {
              Name: base.Name,
              Address: base.Address,
              Latitude: lat,
              Longitude: lng,
            },
          });
        } catch (err: any) {
          tempInvalid.push({
            index: idx + 1,
            data: base,
            error: err.message || "Unknown geocoding error",
          });
        }
      });

      await Promise.allSettled(tasks);

      setValidRows(tempValid);
      setInvalidRows(tempInvalid);
      setStep("review");
    } catch (err) {
      displayMessage("Unable to read CSV file.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setStep("submitting");

    const errors: RowEntry[] = [];

    const tasks = validRows.map(async (entry) => {
      try {
        await axios.post("/api/poi", entry.data);
      } catch (err: any) {
        errors.push({
          index: entry.index,
          data: entry.data,
          error: err.response?.data?.message || "Submission error",
        });
      }
    });

    await Promise.allSettled(tasks);

    setSubmitErrors(errors);
    setStep("done");

    if (errors.length > 0)
      displayMessage(`${errors.length} rows failed to submit.`, true);
    else displayMessage("All rows successfully uploaded!");
  };


  return (
    <div className={styles.formContainer}>
      {userMessage && (
        <div
          ref={messageRef}
          className={`p-3 mb-4 rounded-lg text-center ${
            isErrorMessage
              ? "bg-red-100 text-red-700 border border-red-400"
              : "bg-green-100 text-green-700 border border-green-400"
          }`}
        >
          {userMessage}
        </div>
      )}

      <div className={styles.wrapper}>
        <h1 className={styles.header}>Bulk Upload Places of Interest</h1>

        <div className={styles.content}>
          {/* STEP 1: UPLOAD */}
          {step === "idle" && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 text-sm"
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="border p-2 rounded"
              />

              <button className={styles.button} disabled={isLoading}>
                {isLoading ? "Validating..." : "Upload & Validate CSV"}
              </button>
            </form>
          )}

          {/* STEP 2: REVIEW */}
          {step === "review" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">
                Valid Rows ({validRows.length})
              </h2>

              <table className="w-full border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Row</th>
                    <th className="border px-2 py-1">Name</th>
                    <th className="border px-2 py-1">Address</th>
                    <th className="border px-2 py-1">Latitude</th>
                    <th className="border px-2 py-1">Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map(({ index, data }, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{index}</td>
                      <td className="border px-2 py-1">{data.Name}</td>
                      <td className="border px-2 py-1">{data.Address}</td>
                      <td className="border px-2 py-1">{data.Latitude}</td>
                      <td className="border px-2 py-1">{data.Longitude}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="text-lg font-semibold">
                Invalid Rows ({invalidRows.length})
              </h2>

              <table className="w-full border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Row</th>
                    <th className="border px-2 py-1">Name</th>
                    <th className="border px-2 py-1">Address</th>
                    <th className="border px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {invalidRows.map(({ index, data, error }, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{index}</td>
                      <td className="border px-2 py-1">{data.Name}</td>
                      <td className="border px-2 py-1">{data.Address}</td>
                      <td className="border px-2 py-1 text-red-600">{error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex gap-4">
                <button className={styles.button} onClick={handleFinalSubmit}>
                  Submit Valid Rows
                </button>
                <button
                  className={styles.button}
                  onClick={() => {
                    setStep("idle");
                    setValidRows([]);
                    setInvalidRows([]);
                  }}
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUBMITTING */}
          {step === "submitting" && <p>Submitting data...</p>}

          {/* STEP 4: DONE */}
          {step === "done" && (
            <div className="space-y-4">
              {submitErrors.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold text-red-600">
                    Failed Rows ({submitErrors.length})
                  </h2>
                  <table className="w-full border text-sm">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Row</th>
                        <th className="border px-2 py-1">Name</th>
                        <th className="border px-2 py-1">Address</th>
                        <th className="border px-2 py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submitErrors.map(({ index, data, error }, i) => (
                        <tr key={i}>
                          <td className="border px-2 py-1">{index}</td>
                          <td className="border px-2 py-1">{data.Name}</td>
                          <td className="border px-2 py-1">{data.Address}</td>
                          <td className="border px-2 py-1 text-red-600">
                            {error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <button
                className={styles.button}
                onClick={() => {
                  setStep("idle");
                  setFile(null);
                  setValidRows([]);
                  setInvalidRows([]);
                  setSubmitErrors([]);
                  displayMessage("");
                }}
              >
                Upload Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}