"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function BulkUploadComponent() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const axios = require('axios');
  const apiUrl = "http://localhost:3000/api/geocode";
  const submitURL = "/api/submit";
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };
  const handleSubmit = async (e) => {

    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a CSV file');
      return;
    }
    setIsLoading(true); // <-- Set loading true
    setErrorMessage("");
    // setSuccessMessage("");
    let successfulSubmissions = 0;
    let failedSubmissions = 0;
    // Parse the CSV file using PapaParse
    Papa.parse(file, {
      complete: async (result) => {
        try {
          // Loop through each row in the CSV data
          const submissions = result.data.map(async (row, index) => {
            const formData = {
              Date: row.Date,
              Location: row.Location,
              Latitude: 0.0,
              Longitude: 0.0,
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
                const response = await axios.get(apiUrl, { params: { address: formData.Address } });
                const data = response.data;
          
                if (data.results && data.results.length > 0) {
                  const { lat, lng } = data.results[0].geometry.location;
                  const updatedFormData = { ...formData, Latitude: lat, Longitude: lng };
                  console.log(updatedFormData);
                  // console.log(JSON.stringify(updatedFormData));
                  const type = 1;
                  const submitResponse = await axios.post(`/api/submit?type=${type}`, updatedFormData
                  );
                  // await axios.post(submitURL, updatedFormData);
                  return {success: true, index: index+1};
                }
                else{
                  console.error(`Geocoding failed for row ${index + 1}: No results found for address`, formData.Address);
                }
              } catch (error) {
                console.error("Error processing row:", error);
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
                return { success: false, index: index + 1, error: `API Error: ${errorMessage}` };
              }
            }
            else{
              console.warn("Skipping row due to missing Address:", row);
              return null
            }
          });
          
          // Wait for all API calls to finish
          const results = await Promise.allSettled(submissions);

          alert("Bulk upload complete!");

        } catch (error) {
          console.error("Error processing CSV:", error);
          // setErrorMessage("An error occurred while processing the CSV. Please try again.");
        }
      },
      header: true, // Assuming your CSV file has headers
      skipEmptyLines: true,
    });
  };

 
  return (
    <form onSubmit={handleSubmit} 
    className="flex flex-col gap-4">
      <input type="file" accept=".csv"
       onChange={handleFileChange}
        />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Upload CSV</button>
    </form>
  );
}
