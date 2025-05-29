"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import axios, { AxiosResponse } from "axios";

interface FormData {
  Date: string;
  Time: string;
  Location: string;
  Activity: string;
  Latitude: number;
  Longitude: number;
  Address: string;
  synthetic: boolean;
  Desc: string;
}

interface LocationData {
  Location: string; // The selected option from the dropdown
  OtherLocation: string; // Value for "other" location
}

interface ActivityData {
  Activity: string;
  OtherActivity: string;
}

export const initialFormData: FormData ={
  Date: "",
  Time: "",
  Location: "",
  Activity: "",
  Latitude: 0,
  Longitude: 0,
  Address: "",
  synthetic: false,
  Desc: "",
};

export const initialLocData: LocationData = {
  Location: "",
  OtherLocation: "",
}
export const initialActData: ActivityData = {
  Activity: "",
  OtherActivity: "",
}
export default function SightingFormComponent() {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // State for displaying messages to the user (replacing alerts)
  const [userMessage, setUserMessage] = useState<string>("");
  const [isErrorMessage, setIsErrorMessage] = useState<boolean>(false);
  // State for location-specific selections
  const [locationData, setLocData] = useState<LocationData>(initialLocData);
  const [activityData, setActData] = useState<ActivityData>(initialActData);
  const [showOtherLocation, setShowOtherLocation] = useState<boolean>(false);
  const [showOtherActivity, setShowOtherActivity] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
  
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  /**
   * Handles changes for location-related input fields, updating the locationData state.
   * Manages the visibility of 'OtherLocation', 'PoliceCustodyTime', and 'CourtHouseProbationReason' fields.
   * @param {ChangeEvent<HTMLSelectElement | HTMLInputElement>} e - The change event.
   */
  const handleLocChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for 'Location' field to toggle related fields
    if (name === "Location") {      
      setShowOtherLocation(value === "other");
    }

    // Update the locationData state
    setLocData((prevLocData) => ({
      ...prevLocData,
      [name]: value,
    }));
  };

  /**
   * Handles changes for location-related input fields, updating the locationData state.
   * Manages the visibility of 'OtherLocation', 'PoliceCustodyTime', and 'CourtHouseProbationReason' fields.
   * @param {ChangeEvent<HTMLSelectElement | HTMLInputElement>} e - The change event.
   */
  const handleActChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for 'Location' field to toggle related fields
    if (name === "Activity") {      
      setShowOtherActivity(value === "other");
    }

    // Update the locationData state
    setActData((prevActData) => ({
      ...prevActData,
      [name]: value,
    }));
  };

  /**
   * Displays a message to the user.
   * @param {string} message - The message to display.
   * @param {boolean} isError - True if the message is an error, false otherwise.
   */
  const displayMessage = (message: string, isError: boolean = false) => {
    setUserMessage(message);
    setIsErrorMessage(isError);
    // Clear message after a few seconds
    setTimeout(() => {
      setUserMessage(message);
      setIsErrorMessage(isError);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const apiUrl = "http://localhost:3000/api/geocode";

    try {
      const response = await axios.get(apiUrl, {
        params: { address: formData.Address },
      });
      const data = response.data;

      if (data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const updatedFormData: FormData = {
          ...formData,
          Latitude: lat,
          Longitude: lng,
          Location: locationData.Location === "other" ? locationData.OtherLocation : locationData.Location,
          Activity: activityData.Activity === "other" ? activityData.OtherActivity : activityData.Activity,
        };

        const submitResponse: AxiosResponse = await axios.post('/api/submit?type=report', updatedFormData, {
          headers: { 'Content-Type': 'application/json' },
        });

         if (submitResponse.status === 201) {
            displayMessage("Form submitted successfully!");
            setFormData(initialFormData);    
            setActData(initialActData);
            setLocData(initialLocData);
            setShowOtherActivity(false);
            setShowOtherLocation(false);  
                    
          } else {
            displayMessage("Form submission failed with unexpected status.", true);
          }
      } else {
        displayMessage("The address entered is not valid. Please check and try again.", true);
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        displayMessage("This arrest report already exists in the database.", true);
      } else {
        console.error("Error validating address:", error);
        displayMessage(`An error occurred: ${error.response.statusText || "Unknown error"}`, true);
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
          <span>
          Date of ICE Sighting:
          <span className="text-red-500">*</span>
          </span>
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
          Time of Sighting (if known)
          <span className="text-red-500"></span>
        </span>
        <input
          type="time"
          name="Time"
          value={formData.Time}
          onChange={handleChange}
          className="p-2 border rounded"
        />
      </label>

         {/* Location of Arrest */}
         <label className="flex flex-col">
          <span>
            Sighting Location:
            <span className="text-red-500">*</span>
          </span>
          <select
            name="Location"
            value={locationData.Location}
            onChange={handleLocChange}
            className="p-2 border rounded"
            required
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

         {/* Extra Other Option */}
         {showOtherLocation && (
          <label className="flex flex-col">
            <span>
              Please specify the location:
              <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              name="OtherLocation"
              value={locationData.OtherLocation}
              onChange={handleLocChange}
              className="p-2 border rounded"
              required
            />
          </label>
        )}

        <label className="flex flex-col">
          <span>
          Address of Sighting:
          <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            name="Address"
            value={formData.Address}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
        </label>
        
        {/* Location of Arrest */}
        <label className="flex flex-col">
          <span>
            Type of Activity:
            <span className="text-red-500">*</span>
          </span>
          <select
            name="Activity"
            value={activityData.Activity}
            onChange={handleActChange}
            className="p-2 border rounded"
            required
          >
            <option value=""> Select An Activity</option>
            <option value="presence">Presence</option>
            <option value="arrest">Arrest</option>
            <option value="attempted">Attempted Abduction</option>
            <option value="other">Other</option>
          </select>

        </label>
           {/* Extra Other Option */}
           {showOtherActivity && (
          <label className="flex flex-col">
            <span>
              Please specify the activity:
              <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              name="OtherActivity"
              value= {activityData.OtherActivity}
              onChange={handleActChange}
              className="p-2 border rounded"
              required
            />
          </label>
        )}

        {/* Extra Information */}
        <label className="flex flex-col">
          <span>
            Description
          </span>
          <textarea
              name="Desc"
              value={formData.Desc}
              onChange={handleChange}
              className="p-2 border rounded"
              rows={4}
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