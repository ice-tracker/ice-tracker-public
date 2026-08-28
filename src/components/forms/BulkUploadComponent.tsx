"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import axios from "axios"; // Import axios directly
import { useRef, useEffect } from "react";
import styles from "./Form.module.css";
import Link from "next/link";
import {
  IncidentType,
  emptyToNull,
  parseIncidentDescription,
} from "@/constants/incident";

// Define interfaces for your data
interface FormData {
  LogID: string | null;
  Date: string | null;
  Time: string | null;
  Location: string | null; // "Location Type" in the Luce sheet
  Address: string | null;
  Latitude: number | null;
  Longitude: number | null;
  Activity: IncidentType | null;
  NumAbducted: number;
  Desc: string | null; // raw "Incident Description" text, kept for provenance
  OnlyStreet: boolean;
  StreetGeom: string | null;
  City: string | null;
}

interface RowData {
  index: number;
  data: FormData;
  error?: string; // Optional error message for invalid rows
}

// Raw row shape as read from the Luce workbook/CSV, keyed by its exact headers.
interface LuceRawRow {
  "Log ID"?: string | null;
  Date?: unknown;
  Time?: string | null;
  "Location Type"?: string | null;
  Address?: string | null;
  LatLong?: string | null;
  "Incident Description"?: string | null;
}

// Define the structure for the geocoding API response
interface GeocodeResult {
  address_components: any;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

function formatDate(dateInput: string | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${mm}/${dd}/${yyyy}`;
}

// Luce's "Date" column is an Excel serial number (e.g. 45781) with no date
// number-format applied to the cell, so SheetJS can't auto-detect it as a
// date on read. Convert it ourselves via SheetJS's date-code parser, with a
// fallback for plain date strings in case a future export sends those instead.
function parseLuceDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (!parsed) return null;
    return formatDate(new Date(parsed.y, parsed.m - 1, parsed.d));
  }

  const trimmed = emptyToNull(String(raw));
  if (!trimmed) return null;

  // A CSV export of the same sheet would still carry the serial as a
  // numeric-looking string rather than a real number.
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = XLSX.SSF.parse_date_code(Number(trimmed));
    if (parsed) return formatDate(new Date(parsed.y, parsed.m - 1, parsed.d));
  }

  return formatDate(trimmed);
}

// The Luce "LatLong" column packs both coordinates into one cell, e.g.
// "42.36003011557276, -71.18306457225043".
function parseLatLong(
  raw: string | null
): { lat: number; lng: number } | null {
  if (!raw) return null;
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

// Best-effort city extraction from a free-text address, since the Luce sheet
// no longer has a dedicated City column. Strips trailing state/zip/country
// tokens and takes the next-to-last remaining segment. Rows with no Address
// at all (LatLong-only rows) simply get no City - see docs/luce-format-requests.md.
function extractCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const segments = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const filtered = segments.filter(
    (seg) =>
      !/^(MA|USA)$/i.test(seg) &&
      !/^[A-Z]{2}\s*\d{5}(-\d{4})?$/i.test(seg) &&
      !/^\d{5}(-\d{4})?$/.test(seg)
  );
  return filtered.length >= 2 ? filtered[filtered.length - 1] : null;
}

function mapLuceRowToFormData(row: LuceRawRow): FormData {
  const address = emptyToNull((row["Address"] as string) ?? null);
  const latLong = parseLatLong(emptyToNull((row["LatLong"] as string) ?? null));
  const { activity, numAbducted } = parseIncidentDescription(
    (row["Incident Description"] as string) ?? null
  );

  return {
    LogID: emptyToNull((row["Log ID"] as string) ?? null),
    Date: parseLuceDate(row["Date"]),
    Time: emptyToNull((row["Time"] as string) ?? null),
    Location: emptyToNull((row["Location Type"] as string) ?? null),
    Address: address,
    Latitude: latLong?.lat ?? null,
    Longitude: latLong?.lng ?? null,
    Activity: activity,
    NumAbducted: numAbducted,
    Desc: emptyToNull((row["Incident Description"] as string) ?? null),
    City: extractCityFromAddress(address),
    OnlyStreet: false,
    StreetGeom: null,
  };
}

// Reads an uploaded file into raw Luce-shaped rows. Accepts either the
// native .xlsx workbook or a .csv export of the same columns.
async function parseUploadFile(file: File): Promise<LuceRawRow[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  if (isCsv) {
    return new Promise((resolve, reject) => {
      Papa.parse<LuceRawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<LuceRawRow>(sheet, { defval: null });
}

export default function BulkUploadComponent() {
  const [createdBy, setCreatedBy] = useState<"LUCE" | "Other">("LUCE");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [validRows, setValidRows] = useState<RowData[]>([]);
  const [invalidRows, setInvalidRows] = useState<RowData[]>([]);
  const [userMessage, setUserMessage] = useState<string>("");
  const [isErrorMessage, setIsErrorMessage] = useState<boolean>(false);
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const [step, setStep] = useState<"idle" | "review" | "submitting" | "done">(
    "idle"
  );
  const [submitResults, setSubmitResults] = useState<any[]>([]);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setUserMessage("Please select a file (.xlsx or .csv)");
      setIsErrorMessage(true);
      return;
    }

    setIsLoading(true);
    setUserMessage("");
    setValidRows([]); // Clear previous results
    setInvalidRows([]); // Clear previous results

    const tempValidRows: RowData[] = [];
    const tempInvalidRows: RowData[] = [];

    try {
      const rawRows = await parseUploadFile(file);

      // Filter out rows where every field is empty/whitespace/(empty)
      const cleanedRows = rawRows.filter((row) =>
        Object.values(row).some((value) => {
          if (value === null || value === undefined) return false;
          const str = String(value).trim();
          return str !== "" && str.toLowerCase() !== "(empty)";
        })
      );

      // Use Promise.allSettled so one row's geocode failure doesn't block the rest
      const geocodingPromises = cleanedRows.map(async (row, index) => {
        const formData: FormData = mapLuceRowToFormData(row);

        if (!formData.Date) {
          tempInvalidRows.push({
            index: index + 1,
            data: formData,
            error: "Missing or unparseable Date",
          });
          return;
        }

        // Rows that already carry a LatLong cell skip geocoding entirely.
        if (formData.Latitude !== null && formData.Longitude !== null) {
          tempValidRows.push({ index: index + 1, data: formData });
          return;
        }

        if (!formData.Address) {
          tempInvalidRows.push({
            index: index + 1,
            data: formData,
            error: "Missing address and coordinates",
          });
          return;
        }

        try {
          const response = await axios.get<GeocodeResponse>(apiUrl, {
            params: { address: formData.Address },
          });

          const data = response.data;

          if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];

            // 1. Check if Google provided a street number
            const hasStreetNumber =
              firstResult.address_components?.some((component: any) =>
                component.types.includes("street_number")
              ) ?? false;

            // 2. Fallback: check if original input *looks like* cross streets
            const addressInput = formData.Address?.toLowerCase() || "";
            const looksLikeCrossStreets =
              addressInput.includes(" and ") ||
              addressInput.includes("&") ||
              addressInput.includes("@");

            // 3. OnlyStreet is true only if no number and not likely a cross street
            const onlyStreet = !hasStreetNumber && !looksLikeCrossStreets;

            const { lat, lng } = firstResult.geometry.location;

            let streetGeometry: string | null = null;

            if (onlyStreet) {
              // Try to get the street name from Google's response
              const streetNameComponent = firstResult.address_components?.find(
                (comp: any) => comp.types.includes("route")
              );
              const streetName = streetNameComponent?.long_name;

              if (streetName) {
                try {
                  await sleep(1000);
                  const geometryResponse = await axios.get("/api/road-geometry", {
                    params: {
                      streetName: streetName,
                      lat: lat,
                      lng: lng,
                    },
                  });

                  streetGeometry = JSON.stringify(geometryResponse.data);
                } catch (geomErr) {
                  // If street geometry fails, still plot the point but without the street borders.
                }
              }
            }

            const locality = firstResult.address_components?.find((comp: any) =>
              comp.types.includes("locality")
            )?.long_name;

            const updatedFormData: FormData = {
              ...formData,
              Latitude: lat,
              Longitude: lng,
              OnlyStreet: onlyStreet,
              StreetGeom: streetGeometry,
              City: locality || formData.City,
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
      });

      await Promise.allSettled(geocodingPromises);

      // Rows arrive out of order from Promise.allSettled; restore original order.
      tempValidRows.sort((a, b) => a.index - b.index);
      tempInvalidRows.sort((a, b) => a.index - b.index);

      setValidRows(tempValidRows);
      setInvalidRows(tempInvalidRows);
      setStep("review");
    } catch (err: any) {
      console.error("Error processing upload file:", err);
      setUserMessage("An error occurred while processing the file.");
      setIsErrorMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setStep("submitting");
    const duplicates: RowData[] = [];

    // Only submit validRows (with geocoded coordinates)
    if (validRows.length !== 0) {
      const batchId = crypto.randomUUID();
      const submissionPromises = validRows.map(async (rowEntry, i) => {
        try {
          await axios.post(`${submitURL}?type=report`, {
            ...rowEntry.data,
            CreatedBy: createdBy,
            source: "bulk",
            batchId,
          });
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
    <div className={styles.formContainer}>
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
      <div className={styles.wrapper}>
        <div className={`${styles.header} ${styles.title}`}>Bulk Upload</div>
        <div className={styles.content}>
          <div className={styles.formFieldTitle}>
            <div className="text-red-500">
              Make sure your file has exactly these columns:
            </div>
            <ul className="list-disc list-inside text-sm mb-2">
              <li>Log ID</li>
              <li>Date</li>
              <li>Time</li>
              <li>Location Type</li>
              <li>Address</li>
              <li>LatLong (e.g. &quot;42.3600, -71.1830&quot;, or leave blank if Address is given)</li>
              <li>
                Incident Description (&quot;Confirmed Sighting&quot; or &quot;Confirmed
                Abducted: N&quot;)
              </li>
            </ul>
            <div>
              <a
                href="/files/template.xlsx"
                download
                className="text-blue-600 underline text-sm"
              >
                Download a Template Here
              </a>
              <br />
              <Link href="/how-to-submit" className="text-blue-600 underline text-sm">
                Instructions on How To Upload
              </Link>
            </div>
          </div>
          <br />
          <div className={styles.formFieldTitle}>Upload File (.xlsx or .csv)</div>
          {step === "idle" && (
            <div className="flex flex-col gap-4">
              {/* Toggle */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">Submitted by:</span>
                <div className="flex rounded-full border border-gray-300 overflow-hidden text-sm font-semibold">
                  {(["LUCE", "Other"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCreatedBy(option)}
                      className={`px-4 py-1.5 transition-colors duration-200
                        ${
                          createdBy === option
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-100"
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  className="border p-2 rounded"
                />
                <div className={styles.buttonBox}>
                  <button
                    type="submit"
                    className={styles.button}
                    disabled={isLoading}
                  >
                    {isLoading ? "Validating..." : "Upload & Validate File"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Validated Rows - these will appear on the map (
                {validRows.length})
              </h2>
              <table className="w-full table-auto border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Row</th>
                    <th className="border px-2 py-1">Log ID</th>
                    <th className="border px-2 py-1">Type</th>
                    <th className="border px-2 py-1">Taken</th>
                    <th className="border px-2 py-1">Date</th>
                    <th className="border px-2 py-1">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map(({ data, index }, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{index}</td>
                      <td className="border px-2 py-1">{data.LogID}</td>
                      <td className="border px-2 py-1">{data.Activity}</td>
                      <td className="border px-2 py-1">{data.NumAbducted}</td>
                      <td className="border px-2 py-1">{data.Date}</td>
                      <td className="border px-2 py-1">{data.Address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="text-xl font-semibold mt-4">
                Invalid Rows - these won&apos;t appear on the map (
                {invalidRows.length})
              </h2>
              <table className="w-full table-auto border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Row</th>
                    <th className="border px-2 py-1">Log ID</th>
                    <th className="border px-2 py-1">Date</th>
                    <th className="border px-2 py-1">Address</th>
                    <th className="border px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {invalidRows.map(({ data, index, error }, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{index}</td>
                      <td className="border px-2 py-1">{data.LogID}</td>
                      <td className="border px-2 py-1">{data.Date}</td>
                      <td className="border px-2 py-1">{data.Address}</td>
                      <td className="border px-2 py-1 text-red-500">{error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.buttonBox}>
                <button
                  className={styles.button}
                  onClick={handleFinalSubmit}
                  disabled={validRows.length === 0 && invalidRows.length === 0} // Allow submission even if only invalid rows exist to check for duplicates
                >
                  Yes, submit this data
                </button>
                <button className={styles.button} onClick={() => setStep("idle")}>
                  Start Over
                </button>
              </div>
            </div>
          )}

          {step === "submitting" && <p>Submitting data...</p>}

          {step === "done" && (
            <div className="space-y-4">
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
                        <th className="border px-2 py-1">Log ID</th>
                        <th className="border px-2 py-1">Date</th>
                        <th className="border px-2 py-1">Address</th>
                        <th className="border px-2 py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicateRows.map(({ data, index, error }, i) => (
                        <tr key={i}>
                          <td className="border px-2 py-1">{index}</td>
                          <td className="border px-2 py-1">{data.LogID}</td>
                          <td className="border px-2 py-1">{data.Date}</td>
                          <td className="border px-2 py-1">{data.Address}</td>
                          <td className="border px-2 py-1 text-red-500">{error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={styles.buttonBox}>
                <button
                  className={styles.button}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
