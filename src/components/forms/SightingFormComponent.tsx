"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import axios, { AxiosResponse } from "axios";
import { useRef, useEffect } from "react";
import styles from "./Form.module.css";
import { INCIDENT_TYPES, INCIDENT_TYPE_OPTIONS } from "@/constants/incident";

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
  NumAbducted: number;
  OnlyStreet: boolean;
  StreetGeom: string | null;
  City: string;
}

interface LocationData {
  Location: string; // The selected option from the dropdown
  OtherLocation: string; // Value for "other" location
}

export const initialFormData: FormData = {
  Date: "",
  Time: "",
  Location: "",
  Activity: "",
  Latitude: 0,
  Longitude: 0,
  Address: "",
  synthetic: false,
  Desc: "",
  City: "",
  NumAbducted: 0,
  OnlyStreet: false,
  StreetGeom: null,
};

export const initialLocData: LocationData = {
  Location: "",
  OtherLocation: "",
};

export default function SightingFormComponent() {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // State for displaying messages to the user (replacing alerts)
  const [userMessage, setUserMessage] = useState<string>("");
  const [isErrorMessage, setIsErrorMessage] = useState<boolean>(false);
  // State for location-specific selections
  const [locationData, setLocData] = useState<LocationData>(initialLocData);
  const [showOtherLocation, setShowOtherLocation] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (userMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [userMessage]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    let processedValue: string | number = value;
    if (name == "NumAbducted") {
      processedValue = Number(value);
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: processedValue,
      // Only an Abduction carries a taken-count; switching back to a
      // Sighting resets it so a stale count can't linger in the payload.
      ...(name === "Activity" && value !== INCIDENT_TYPES.ABDUCTION
        ? { NumAbducted: 0 }
        : {}),
    }));
  };

  /**
   * Handles changes for location-related input fields, updating the locationData state.
   * Manages the visibility of the 'OtherLocation' field.
   * @param {ChangeEvent<HTMLSelectElement | HTMLInputElement>} e - The change event.
   */
  const handleLocChange = (
    e: ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
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

    const apiUrl = "/api/geocode";

    try {
      const response = await axios.get(apiUrl, {
        params: { address: formData.Address },
      });
      const data = response.data;

      if (data.results.length > 0) {
        const firstResult = data.results[0];

        // 1. Check if Google provided a street number
        const hasStreetNumber =
          firstResult.address_components?.some((component) =>
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

        let streetGeometry = null;

        if (onlyStreet) {
          // Try to get the street name from Google's response
          const streetNameComponent = firstResult.address_components?.find(
            (comp) => comp.types.includes("route")
          );
          const streetName = streetNameComponent?.long_name;

          if (streetName) {
            try {
              const geometryResponse = await axios.get("/api/road-geometry", {
                params: {
                  streetName: streetName,
                  lat: lat,
                  lng: lng,
                },
              });

              streetGeometry = geometryResponse.data; // Save full Overpass geometry JSON
              streetGeometry = JSON.stringify(streetGeometry);
            } catch (geomErr) {
              console.warn("Could not fetch street geometry:", geomErr);
            }
          }
        }

        const updatedFormData: FormData = {
          ...formData,
          Latitude: lat,
          Longitude: lng,
          Location:
            locationData.Location === "other"
              ? locationData.OtherLocation
              : locationData.Location,
          OnlyStreet: onlyStreet,
          StreetGeom: streetGeometry,
          NumAbducted:
            formData.Activity === INCIDENT_TYPES.ABDUCTION
              ? Number(formData.NumAbducted)
              : 0,
        };

        const submitResponse: AxiosResponse = await axios.post(
          "/api/submit?type=report",
          { ...updatedFormData, source: "sighting" },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (submitResponse.status === 201) {
          displayMessage("Form submitted successfully!");
          setFormData(initialFormData);
          setLocData(initialLocData);
          setShowOtherLocation(false);
        } else {
          displayMessage(
            "Form submission failed with unexpected status.",
            true
          );
        }
      } else {
        displayMessage(
          "The address entered is not valid. Please check and try again.",
          true
        );
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        displayMessage(
          "This report already exists in the database.",
          true
        );
      } else {
        console.error("Error validating address:", error);
        displayMessage(
          `An error occurred: ${error.response.statusText || "Unknown error"}`,
          true
        );
      }
    }
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
      <form onSubmit={handleSubmit} className={styles.wrapper}>
        <div className={`${styles.header} ${styles.title}`}>
          Report Sighting{" "}
        </div>
        <div className={styles.content}>
          <p className="text-red-500">* Indicates Required Field</p>

          <br />

          <label className="flex flex-col">
            <span className={styles.formFieldTitle}>
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

          <br />

          <label className="flex flex-col">
            <span className={styles.formFieldTitle}>
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

          <br />

          {/* Location of Sighting */}
          <label className="flex flex-col">
            <span className={styles.formFieldTitle}>
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

          <br />

          {/* Extra Other Option */}
          {showOtherLocation && (
            <label className="flex flex-col">
              <span className={styles.formFieldTitle}>
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
            <span className={styles.formFieldTitle}>
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

          <br />

          <label className="flex flex-col">
            <span className={styles.formFieldTitle}>
              City:
              <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              name="City"
              value={formData.City}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            />
          </label>

          <br />

          {/* Incident Type */}
          <label className="flex flex-col">
            <span className={styles.formFieldTitle}>
              Incident Type:
              <span className="text-red-500">*</span>
            </span>
            <select
              name="Activity"
              value={formData.Activity}
              onChange={handleChange}
              className="p-2 border rounded"
              required
            >
              <option value=""> Select An Incident Type</option>
              {INCIDENT_TYPE_OPTIONS.map((incidentType) => (
                <option key={incidentType} value={incidentType}>
                  {incidentType}
                </option>
              ))}
            </select>
          </label>

          <br />

          {/* Number taken, only relevant for an Abduction */}
          {formData.Activity === INCIDENT_TYPES.ABDUCTION && (
            <label className="flex flex-col">
              <span className={styles.formFieldTitle}>
                Number of People Taken:
                <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                name="NumAbducted"
                min={1}
                value={formData.NumAbducted ?? 0}
                onChange={handleChange}
                className="p-2 border rounded"
                required
              />
            </label>
          )}

          <br />

          {/* Extra Information */}
          <label className="flex flex-col">
            <span className={styles.formFieldTitle}>Description</span>
            <textarea
              name="Desc"
              value={formData.Desc}
              onChange={handleChange}
              className="p-2 border rounded"
              rows={4}
            />
          </label>

          <br />
          <div className={styles.buttonBox}>
            <button type="submit" className={styles.button}>
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
