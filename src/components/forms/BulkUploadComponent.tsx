"use client";

import { useState } from "react";
import Papa from "papaparse";
import axios from "axios"; // Import axios directly
import { useRef, useEffect } from "react";

// Define interfaces for your data
interface FormData {
  Date: string | null;
  Location: string | null; // This will be dynamically set based on locationData
  CourtHouseProbationReason: string | null;
  PoliceCustodyTime: number | null;
  Address: string | null;
  Latitude: number | null;
  Longitude: number | null;
  ImmigrationStatus: string | null;
  ExtraInformation: string | null;
  Monitoring: "yes" | "no" | "unsure" | "" | null; // Specific literal types for select
  MonitoringType: string | null;
  HowICE: string | null;
  Name: string | null;
  Email: string | null;
  PhoneNumber: string | null; // Storing as string as input type="number" still returns string
  FollowUp: "yes" | "no" | "" | null; // Specific literal types for select
  Desc: string | null;
  Time: string | null;
  Activity: string | null;
  synthetic: boolean | null;
}

interface RowData {
  index: number;
  data: FormData;
  error?: string; // Optional error message for invalid rows
}

// Define the structure for the geocoding API response
interface GeocodeResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string; // e.g., "OK", "ZERO_RESULTS", "OVER_QUERY_LIMIT"
}

export default function BulkUploadComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [validRows, setValidRows] = useState<RowData[]>([]);
  const [invalidRows, setInvalidRows] = useState<RowData[]>([]);
  const [userMessage, setUserMessage] = useState<string>("");
  const [isErrorMessage, setIsErrorMessage] = useState<boolean>(false);
  const [step, setStep] = useState<"idle" | "review" | "submitting" | "done">(
    "idle"
  );
  const [submitResults, setSubmitResults] = useState<any[]>([]); // You might want a more specific interface for submitResults
  const [duplicateRows, setDuplicateRows] = useState<RowData[]>([]);

  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (userMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [userMessage]);

  const apiUrl: string = "/api/geocode";
  const submitURL: string = "/api/submit";

  const displayMessage = (message: string, isError: boolean = false) => {
    setUserMessage(message);
    setIsErrorMessage(isError);
    // Clear message after a few seconds
    setTimeout(() => {
      setUserMessage(message);
      setIsErrorMessage(isError);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (file: File): Promise<Papa.ParseResult<FormData>> => {
    return new Promise((resolve, reject) => {
      Papa.parse<FormData>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results as Papa.ParseResult<FormData>),
        error: (err) => reject(err),
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setErrorMessage("Please select a CSV file");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setValidRows([]); // Clear previous results
    setInvalidRows([]); // Clear previous results

    const tempValidRows: RowData[] = [];
    const tempInvalidRows: RowData[] = [];

    try {
      const result = await parseCSV(file);

      // Use Promise.all to await all geocoding requests concurrently
      const geocodingPromises = result.data.map(async (row, index) => {
        const formData: FormData = {
          Date: row.Date || null,
          Location: row.Location || null,
          Latitude: null,
          Longitude: null,
          CourtHouseProbationReason: row.CourtHouseProbationReason || null,
          PoliceCustodyTime: row.PoliceCustodyTime || null,
          Address: row.Address || null,
          ImmigrationStatus: row.ImmigrationStatus || null,
          ExtraInformation: row.ExtraInformation || null,
          Monitoring: row.Monitoring || null,
          MonitoringType: row.MonitoringType || null, // Corrected from row.typeMon
          HowICE: row.HowICE || null,
          Name: row.Name || null,
          Email: row.Email || null,
          PhoneNumber: row.PhoneNumber || null,
          FollowUp: row.FollowUp || null,
          Activity: row.Activity || null,
          Desc: row.Desc || null,
          Time: row.Time || null,
          synthetic: false,
        };

        if (formData.Address) {
          try {
            const response = await axios.get<GeocodeResponse>(apiUrl, {
              params: { address: formData.Address },
            });

            const data = response.data;

            if (data.results && data.results.length > 0) {
              const { lat, lng } = data.results[0].geometry.location;
              const updatedFormData: FormData = {
                ...formData,
                Latitude: lat,
                Longitude: lng,
              };
              tempValidRows.push({ index: index + 1, data: updatedFormData });
            } else {
              tempInvalidRows.push({
                index: index + 1,
                data: formData,
                error: "Address geocoding failed (no results)",
              });
            }
          } catch (error: any) {
            const errorMessage =
              error.response?.data?.message || error.message || "Unknown error";
            tempInvalidRows.push({
              index: index + 1,
              data: formData,
              error: `Geocoding failed: ${errorMessage}`,
            });
          }
        } else {
          tempInvalidRows.push({
            index: index + 1,
            data: formData,
            error: "Missing address",
          });
        }
      });

      await Promise.allSettled(geocodingPromises);

      setValidRows(tempValidRows);
      setInvalidRows(tempInvalidRows);
      setStep("review");
    } catch (err: any) {
      console.error("Error processing CSV:", err);
      setErrorMessage("An error occurred while processing the CSV.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setStep("submitting");
    const duplicates: RowData[] = [];

    // Combine valid and invalid rows for submission attempt
    const allRowsToSubmit = [...validRows, ...invalidRows];

    if (validRows.length !== 0) {
      const submissionPromises = allRowsToSubmit.map(async (rowEntry, i) => {
        try {
          await axios.post(`${submitURL}?type=report`, rowEntry.data);
          return { success: true };
        } catch (error: any) {
          if (error.response?.status === 409) {
            duplicates.push({
              index: rowEntry.index, // Use the original index from rowEntry
              data: rowEntry.data,
              error: "Duplicate entry (already exists in database)",
            });
          } else {
            console.error("Error submitting row:", error);
            // Optionally, you could track other submission errors here as well
          }
          return { success: false };
        }
      });

      await Promise.allSettled(submissionPromises);

      setDuplicateRows(duplicates);
      setStep("done");

      if (duplicates.length > 0) {
        displayMessage(
          `Submission complete. ${duplicates.length} duplicate entries were not submitted.`
        );
      } else {
        displayMessage("All valid rows submitted successfully!");
      }
    } else {
      setStep("done");
      displayMessage("No Valid Rows To Submit", true);
    }
  };

  return (
    <div className="p-4 space-y-6 text-center">
      {/* Message Display Area */}
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
      {step === "idle" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="border p-2 rounded"
          />
          {errorMessage && <p className="text-red-500">{errorMessage}</p>}
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
            disabled={isLoading}
          >
            {isLoading ? "Validating..." : "Upload & Validate CSV"}
          </button>
        </form>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Validated Rows - these will appear on the map ({validRows.length})
          </h2>
          <table className="w-full table-auto border border-gray-300 text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Row</th>
                <th className="border px-2 py-1">Address</th>
                <th className="border px-2 py-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {validRows.map(({ data, index }, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{index}</td>
                  <td className="border px-2 py-1">{data.Address}</td>
                  <td className="border px-2 py-1">{data.Date}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xl font-semibold mt-4">
            Invalid Rows - these won't appear on the map ({invalidRows.length})
          </h2>
          <table className="w-full table-auto border border-gray-300 text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Row</th>
                <th className="border px-2 py-1">Address</th>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Error</th>
              </tr>
            </thead>
            <tbody>
              {invalidRows.map(({ data, index, error }, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{index}</td>
                  <td className="border px-2 py-1">{data.Address}</td>
                  <td className="border px-2 py-1">{data.Date}</td>
                  <td className="border px-2 py-1 text-red-500">{error}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-4 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={handleFinalSubmit}
              disabled={validRows.length === 0 && invalidRows.length === 0} // Allow submission even if only invalid rows exist to check for duplicates
            >
              Yes, submit this data
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => setStep("idle")}
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {step === "submitting" && <p>Submitting data...</p>}

      {step === "done" && (
        <div className="space-y-4">
          <p className="text-green-600 font-semibold">
            Form Submission Complete
          </p>

          {duplicateRows.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-red-600">
                Duplicate Entries - these rows already existed (
                {duplicateRows.length})
              </h2>
              <table className="w-full table-auto border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Row</th>
                    <th className="border px-2 py-1">Address</th>
                    <th className="border px-2 py-1">Date</th>
                    <th className="border px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateRows.map(({ data, index, error }, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{index}</td>
                      <td className="border px-2 py-1">{data.Address}</td>
                      <td className="border px-2 py-1">{data.Date}</td>
                      <td className="border px-2 py-1 text-red-500">{error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              setStep("idle");
              displayMessage("");
              setFile(null);
              setValidRows([]);
              setInvalidRows([]);
              setDuplicateRows([]);
            }}
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}
