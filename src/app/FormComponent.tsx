"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import axios, { AxiosResponse } from "axios"; // Import Axios and AxiosResponse for typing

// Define interfaces for the form data and location data
interface FormData {
  Date: string;
  Location: string; // This will be dynamically set based on locationData
  CourtHouseProbationReason: string;
  PoliceCustodyTime: number;
  Address: string;
  Latitude: number;
  Longitude: number;
  ImmigrationStatus: string;
  ExtraInformation: string;
  Monitoring: "yes" | "no" | "unsure" | ""; // Specific literal types for select
  MonitoringType: string;
  HowICE: string;
  Name: string;
  Email: string;
  PhoneNumber: string; // Storing as string as input type="number" still returns string
  FollowUp: "yes" | "no" | ""; // Specific literal types for select
  Desc: string;
  Time: string;
  Activity: string;
  synthetic: boolean;
}
// Top of your file (outside the component function)
export const initialFormData: FormData = {
  Date: "",
  Location: "",
  CourtHouseProbationReason: "",
  PoliceCustodyTime: 0,
  Address: "",
  Latitude: 0,
  Longitude: 0,
  ImmigrationStatus: "",
  ExtraInformation: "",
  Monitoring: "",
  MonitoringType: "",
  HowICE: "",
  Name: "",
  Email: "",
  PhoneNumber: "",
  FollowUp: "",
  Desc: "",
  Time: "",
  Activity: "arrest",
  synthetic: false,
};

interface LocationData {
  Location: string; // The selected option from the dropdown
  OtherLocation: string; // Value for "other" location
}

export const initialLocData: LocationData = {
  Location: "",
  OtherLocation: "",
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

interface GeocodeApiResponse {
  results: GeocodeResult[];
  // Potentially other fields like status, error_message
}

export default function FormComponent() {
  // State for the main form data
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // State for location-specific selections
  const [locationData, setLocData] = useState<LocationData>(initialLocData);

  // UI state variables for conditional rendering
  const [showOtherLocation, setShowOtherLocation] = useState<boolean>(false);
  const [showPrecinctOption, setShowPrecinctOption] = useState<boolean>(false);
  const [showLocationReasonOption, setShowLocationReasonOption] = useState<boolean>(false);
  const [showMonitorType, setShowMonitorType] = useState<boolean>(false);

  // State for displaying messages to the user (replacing alerts)
  const [userMessage, setUserMessage] = useState<string>("");
  const [isErrorMessage, setIsErrorMessage] = useState<boolean>(false);

  /**
   * Handles changes for most form input fields, updating the formData state.
   * Also manages the visibility of the 'MonitoringType' field.
   * @param {ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} e - The change event.
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Special handling for 'Monitoring' field to toggle 'MonitoringType' visibility
    if (name === "Monitoring") {
      setShowMonitorType(value === "yes");
    }

    // Update the formData state
    setFormData((prevFormData) => ({
      ...prevFormData,
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
      setShowPrecinctOption(value === "police_precinct");
      setShowLocationReasonOption(value === "courthouse" || value === "probation");
    }

    // Update the locationData state
    setLocData((prevLocData) => ({
      ...prevLocData,
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

  /**
   * Handles the form submission.
   * Validates the address using a geocoding API, then sends the form data to the backend.
   * @param {FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission behavior
    setUserMessage(""); // Clear previous messages

    const apiUrl: string = "http://localhost:3000/api/geocode"; // Geocoding API endpoint

    try {
      // Step 1: Validate the address using the geocoding API
      const response: AxiosResponse<GeocodeApiResponse> = await axios.get(apiUrl, {
        params: { address: formData.Address },
      });
      const data = response.data;

      if (data.results && data.results.length > 0) {
        // Address is valid, extract latitude and longitude
        const { lat, lng } = data.results[0].geometry.location;

        // Create an updated formData object with geo-coordinates and correct location type
        const updatedFormData: FormData = {
          ...formData,
          Latitude: lat,
          Longitude: lng,
          Location: locationData.Location === "other" ? locationData.OtherLocation : locationData.Location,
        };

        // Determine the 'type' for the backend API based on your logic (e.g., 1 for Verified, 2 for Unverified, 4 for Sightings)
        // The original code used 'type = 4', assuming it maps to "Sightings" based on the backend API.
        const type: number = 4; // This value needs to align with your backend logic (e.g., 1, 2, or default for Sightings)

        const submitResponse: AxiosResponse = await axios.post('/api/submit?type=report', updatedFormData, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (submitResponse.status === 201) {
          displayMessage("Form submitted successfully!");
          setLocData(initialLocData);
          setFormData(initialFormData);    
          setShowOtherLocation(false);          
          setShowPrecinctOption(false);
          setShowLocationReasonOption(false);
          setShowMonitorType(false);
          //setFormData(initialState); setLocData(initialState);
        } else {
          displayMessage("Form submission failed with unexpected status.", true);
        }

      } else {
        // Address is invalid
        displayMessage("The address entered is not valid. Please check and try again.", true);
      }
    } catch (error: unknown) {
      // Handle different types of errors from API calls
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 409) {
          displayMessage("This arrest report already exists in the database.", true);
        } else if (error.response.status === 400) {
          displayMessage(`Bad Request: ${error.response.data?.error || "Invalid form data."}`, true);
        } else if (error.response.status === 500) {
          displayMessage(`Server Error: ${error.response.data?.error || "An internal server error occurred."}`, true);
        } else {
          displayMessage(`An error occurred: ${error.response.statusText || "Unknown error"}`, true);
        }
      } else if (error instanceof Error) {
        console.error("General error during form submission:", error);
        displayMessage(`An unexpected error occurred: ${error.message}. Please try again later.`, true);
      } else {
        console.error("Unknown error during form submission:", error);
        displayMessage("An unknown error occurred. Please try again later.", true);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {/* Message Display Area */}
      {userMessage && (
        <div className={`p-3 mb-4 rounded-lg text-center ${isErrorMessage ? "bg-red-100 text-red-700 border border-red-400" : "bg-green-100 text-green-700 border border-green-400"}`}>
          {userMessage}
        </div>
      )}

      <p className="text-red-500 mb-4">* Indicates Required Field</p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 p-6 border rounded-lg shadow-md bg-white"
      >
        {/* Date of Arrest */}
        <label className="flex flex-col">
          <span>
            Date of ICE Arrest:
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
          Time of Arrest (if known)
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
            Location Type:
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

        {/* Extra Courthouse/Probation/Parole Office Option */}
        {showLocationReasonOption && (
          <label className="flex flex-col">
            <span>
              If the individual was arrested at a courthouse,
              or a probation office: What was the reason this person was at the courthouse/probation office?:
              <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              name="CourtHouseProbationReason"
              value={formData.CourtHouseProbationReason}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
          </label>
        )}

        {/* Extra Precinct Option */}
        {showPrecinctOption && (
          <label className="flex flex-col">
            <span>
              How long (in hours) was the person arrested
              held in police custody before ICE arrived?
              <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              name="PoliceCustodyTime"
              value={formData.PoliceCustodyTime}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
          </label>
        )}

        {/* Address */}
        <label className="flex flex-col">
          <span>
            Address of Arrest
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

        {/* Immigration Status */}
        <label className="flex flex-col">
          <span>
            Immigration Status of Arrested Individual at Time of ICE Arrest
            <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            name="ImmigrationStatus"
            value={formData.ImmigrationStatus}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
        </label>

        {/*Was the arrested individual in the Intensive Supervision Appearance Program (ISAP)?  //NOT SURE WHY THIS IS HERE*/}
        {/* Monitored by ICE */}
        <label className="flex flex-col">
          <span>
            Was the person arrested under any monitoring or surveillance by ICE (such as through a Watch, Smart link app, ankle monitor, etc)?
            <span className="text-red-500">*</span>
          </span>
          <select
            name="Monitoring"
            value={formData.Monitoring}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          >
            <option value="">Select an option</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unsure">Unsure</option>
          </select>
        </label>

        {/* Monitoring Type */}
        {showMonitorType && (
          <label className="flex flex-col">
            <span>
              What kind of monitoring was used?
              <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              name="MonitoringType"
              value={formData.MonitoringType}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
          </label>
        )}

        {/* How did Ice Find Out */}
        <label className="flex flex-col">
          <span>
            If you know, how did ICE find out the location of the person arrested?
          </span>
          <input
            type="text"
            name="HowICE"
            value={formData.HowICE}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </label>
        
        <label className="flex flex-col">
          <span>
            Is there any additional information about the circumstances of
            the ICE arrest that you would like to share?
          </span>
          <textarea
              name="Desc"
              value={formData.Desc}
              onChange={handleChange}
              className="p-2 border rounded"
              rows={4}
            />
        </label>

        <label className="flex flex-col">
          <span className="font-bold">Informant Information</span>
          Name:
          <input
            type="text"
            name="Name"
            value={formData.Name}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </label>

        <label className="flex flex-col">
          Email:
          <input
            type="email"
            name="Email"
            value={formData.Email}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </label>

        <label className="flex flex-col">
          Phone Number:
          <input
            type="tel" // Changed to "tel" for phone numbers
            name="PhoneNumber"
            value={formData.PhoneNumber}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </label>

        <label className="flex flex-col">
          May we follow up with you?
          <select
            name="FollowUp"
            value={formData.FollowUp}
            onChange={handleChange}
            className="p-2 border rounded"
            required
          >
            <option value="">Select an option</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
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
