"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function BulkUploadComponent() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const [validRows, setValidRows] = useState([])
  const [invalidRows, setInvalidRows] = useState([]);
  const [step, setStep] = useState("idle"); // idle | review | submitting | done
  const [submitResults, setSubmitResults] = useState([]);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const axios = require('axios');
  const apiUrl = "http://localhost:3000/api/geocode";
  const submitURL = "/api/submit";
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results),
        error: (err) => reject(err),
      });
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!file) {
      setErrorMessage("Please select a CSV file");
      return;
    }
  
    setIsLoading(true);
    setErrorMessage("");
  
    const tempValidRows = [];
    const tempInvalidRows = [];
  
    try {
      const result = await parseCSV(file);
  
      const submissions = result.data.map(async (row, index) => {
        const formData = {
          Date: row.Date,
          Location: row.Location,
          Latitude: null,
          Longitude: null,
          CourtHouseProbationReason: row.CourtHouseProbationReason,
          PoliceCustodyTime: row.PoliceCustodyTime,
          Address: row.Address,
          ImmigrationStatus: row.ImmigrationStatus,
          ExtraInformation: row.ExtraInformation,
          Monitoring: row.Monitoring,
          MonitoringType: row.typeMon,
          HowICE: row.HowIce,
          Name: row.Name,
          Email: row.Email,
          PhoneNumber: row.Phone,
          FollowUp: row.FollowUp,
        };
  
        if (formData.Address) {
          try {
            const response = await axios.get(apiUrl, {
              params: { address: formData.Address },
            });
  
            const data = response.data;
  
            if (data.results && data.results.length > 0) {
              const { lat, lng } = data.results[0].geometry.location;
              const updatedFormData = { ...formData, Latitude: lat, Longitude: lng };
              tempValidRows.push({ index: index + 1, data: updatedFormData });
            } else {
              tempInvalidRows.push({
                index: index + 1,
                data: formData,
                error: "Address geocoding failed",
              });
            }
          } catch (error) {
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
  
      // ✅ Make sure we wait for all async map operations to finish
      await Promise.allSettled(submissions);
  
      // ✅ Only update state after everything is done
      setValidRows(tempValidRows);
      setInvalidRows(tempInvalidRows);
      setStep("review");
    } catch (err) {
      console.error("Error processing CSV:", err);
      setErrorMessage("An error occurred while processing the CSV.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFinalSubmit = async () => {
    setStep("submitting");
    const duplicates = [];
  
    const validResults = await Promise.allSettled(
      validRows.map(async ({ data }, i) => {
        try {
          await axios.post(`/api/submit?type=1`, data);
          return { success: true };
        } catch (error) {
          if (error.response?.status === 409) {
            duplicates.push({
              index: i + 1,
              data,
              error: "Duplicate entry (already exists in database)"
            });
          } else {
            console.error("Error submitting row:", error);
          }
          return { success: false };
        }
      })
    );
    const invalidResults = await Promise.allSettled(
      invalidRows.map(async ({ data }, i) => {
        try {
          await axios.post(`/api/submit?type=1`, data);
          return { success: true };
        } catch (error) {
          if (error.response?.status === 409) {
            duplicates.push({
              index: i + 1,
              data,
              error: "Duplicate entry (already exists in database)"
            });
          } else {
            console.error("Error submitting row:", error);
          }
          return { success: false };
        }
      })
    );
  
    setDuplicateRows(duplicates);
    setStep("done");
  
    if (duplicates.length > 0) {
      alert(`Submission complete. ${duplicates.length} duplicate entries were not submitted.`);
    } else {
      alert("All valid rows submitted successfully!");
    }
  };
  
  return (
    <div className="p-4 space-y-6">
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
          <h2 className="text-xl font-semibold">Validated Rows - these will appear on the map ({validRows.length})</h2>
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

          <h2 className="text-xl font-semibold mt-4">Invalid Rows - these won't appear on the map ({invalidRows.length})</h2>
          <table className="w-full table-auto border border-gray-300 text-sm">
          <thead>
          <tr>
            <th className="border px-2 py-1">Row</th>
            <th className="border px-2 py-1">Address</th>
            <th className="border px-2 py-1">Date</th>
          </tr>
        </thead>
        <tbody>
          {invalidRows.map(({ data, index }, i) => (
            <tr key={i}>
              <td className="border px-2 py-1">{index}</td>
              <td className="border px-2 py-1">{data.Address}</td>
              <td className="border px-2 py-1">{data.Date}</td>
            </tr>
          ))}
        </tbody>

          </table>

          <div className="flex gap-4 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={handleFinalSubmit}
              disabled={validRows.length === 0}
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
          <p className="text-green-600 font-semibold">Form Submission Complete</p>

          {duplicateRows.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-red-600">
               Duplicate Entries - these rows already existed ({duplicateRows.length})
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