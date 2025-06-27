"use client";

import { useState } from "react";

export default function UnverifiedFormComponent() {
  const [formData, setFormData] = useState({
    Date: "",
    Location: "",
    Latitude: 0,
    Longitude: 0,
    Address: "",
    HowICE: "",
    synthetic: false,
    realLocation: true,
    unverified: true,
  });
  const axios = require("axios");

  const [errorMessage, setErrorMessage] = useState(""); // State for error messages

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous error messages

    // Validate the address
    const apiUrl = "/api/geocode";
    try {
      const response = await axios.get(apiUrl, {
        params: { address: formData.Address },
      });
      const data = response.data;

      if (data.results.length > 0) {
        // Address is valid, proceed with submission
        const { lat, lng } = data.results[0].geometry.location;
        const updatedFormData = {
          ...formData,
          Latitude: lat,
          Longitude: lng,
        };

        // Send data to via API route
        const type = 2;
        const submitResponse = await axios.post(
          `/api/submit?type=${type}`,
          JSON.stringify(updatedFormData),
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        alert("Form submitted successfully!");
      } else {
        // Address is invalid
        alert("The address entered is not valid. Please check and try again.");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Handle the "document already exists" case
        alert("This arrest report already exists in the database.");
      } else {
        console.error("Error validating address:", error);
        alert(
          "An error occurred while validating the address. Please try again later."
        );
      }
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <p className="text-red-500">* Indicates Required Field</p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 p-6 border rounded-lg shadow-md bg-white max-w-md mx-auto"
      >
        <label className="flex flex-col">
          Date of ICE Arrest:
          <input
            type="date"
            name="Date"
            value={formData.Date}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
        </label>

        <label className="flex flex-col">
          <span>
            Arrest Location Type:
            <span className="text-red-500">*</span>
          </span>
          <select
            name="Location"
            value={formData.Location}
            onChange={handleChange}
            className="p-2 border rounded"
            required // this version is a drop-down. Hopefully won't cause conflicts
          >
            <option value=""> Select A Location</option>
            <option value="home">Home</option>
            <option value="courthouse">Courthouse</option>
            <option value="jail">Jail</option>
            <option value="street">Street</option>
            <option value="car_stop">Car Stop</option>
            <option value="workplace">Workplace</option>
            <option value="probation">Probation/Parole Office</option>
            <option value="police_precinct">Police Precinct</option>
            <option value="other"> Other </option>
          </select>
        </label>

        <label className="flex flex-col">
          Address of Arrest:
          <input
            type="text"
            name="Address"
            value={formData.Address}
            onChange={handleChange}
            className="p-2 border rounded"
            required // You can change this to false if the field is optional
          />
        </label>

        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
