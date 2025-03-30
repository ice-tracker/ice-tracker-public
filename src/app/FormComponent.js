"use client";

import { useState } from "react";

export default function FormComponent() {
  const [formData, setFormData] = useState({
    Date: "",

    Location: "",
    CourtHouseProbationReason: "",
    PoliceCustodyTime: 0,

    Address: "",
    Latitude: 0.0,
    Longitude: 0.0,
    
    ImmigrationStatus: "",

    ExtraInformation: "",

    Monitoring: "",
    MonitoringType: "",

    HowICE: "",

    Name: "",
    Email: "",
    PhoneNumber: "",
    FollowUp: "",

    synthetic: false //TESTING PURPOSES
  });

  const [locationData, setLocData] = useState({
      Location: "",
      OtherLocation: ""
    }
  )
  const axios = require('axios');

  //Functions to set variables.

  //Secondary Options For Location
  const [showOtherLocation, setShowOtherLocation] = useState(false)
  const [showPrecinctOption, setShowPricinctOption] = useState(false)
  const [showLocationReasonOption, setShowLocationReasonOption] = useState(false)

  //Monitoring
  const [showMonitorType, setShowMonitorType] = useState(false)

  const [errorMessage, setErrorMessage] = useState(""); 

  const handleChange = (e) => {
    const {name, value} = e.target;
    if(name == "Monitoring"){
      setShowMonitorType(value == "yes");
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocChange = (e) =>{
    const {name, value} = e.target;
    if(name == "Location"){
      setShowOtherLocation(value == "other");
      setShowPricinctOption(value == "police_precinct")
      setShowLocationReasonOption(value == "courthouse" || value == "probation")
    }
    setLocData({...locationData, [e.target.name]: e.target.value})
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); 

    // Validate the address
    const apiUrl = "http://localhost:3000/api/geocode";

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
          Longitude: lng
        };

        if(locationData.Location == "other"){
          updatedFormData.Location = locationData.OtherLocation
        }else{
          updatedFormData.Location = locationData.Location
        }

;        // Send data to MongoDB via API route
        const type = 1;
        const submitResponse = await axios.post(`/api/submit?type=${type}`, JSON.stringify(updatedFormData), {
          headers: { "Content-Type": "application/json" }
        });
        alert(JSON.stringify(updatedFormData))
        //alert("Form submitted successfully!");
      }
      else {
        // Address is invalid
        alert("The address entered is not valid. Please check and try again.");
      }
    } catch (error) {
      console.error("Error validating address:", error);
      alert("An error occurred while validating the address. Please try again later.");
    }
  };

  return (
    <div className="max-w-md mx-auto">
    <p className="text-red-500">* Indicates Required Field</p> 
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-6 border rounded-lg shadow-md bg-white max-w-md mx-auto"
    >
      {/* Date of Arrest */}
      <label className="flex flex-col"> 
        <span>
          Date Of Arrest: 
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

      {/* Location of Arrest */}
      <label className="flex flex-col">
        <span>
          Location Of Arrest: 
          <span className = "text-red-500">*</span>
        </span>
        <select 
          name="Location" 
          value={locationData.Location}
          onChange={handleLocChange}
          className="p-2 border rounded"
          required
        >
          <option value = ""> Select A Location</option>
          <option value="home">Home</option>
          <option value="courthouse">Courthouse</option>
          <option value="jail">Jail</option>
          <option value="street">Street</option>
          <option value="car_stop">Car Stop</option>
          <option value="workplace">Workplace</option>
          <option value="probation">Probation/Parole Office</option>
          <option value="police_precinct">Police Precinct</option>
          <option value = "other"> Other </option>
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
              If you/the person you are 
              writing about were arrested at a courthouse, 
              or a probation office: What was the reason you 
              were/this person was at the courthouse/probation office?: 
              <span className="text-red-500">*</span>
            </span>
            <input
              type = "text"
              name = "CourtHouseProbationReason"
              value = {formData.CourtHouseProbationReason}
              onChange = {handleChange}
              className = "p-2 border rounded"
              required
            />
          </label>
        )}

        {/* Extra Precinct Option */}
        {showPrecinctOption && (
          <label className="flex flex-col">
            <span>
              How long (in hours) were you/the person arrested 
              held in police custody before ICE arrived? 
              <span className="text-red-500">*</span>
            </span>
            <input
              type = "number"
              name = "PoliceCustodyTime"
              value = {formData.PoliceCustodyTime}
              onChange = {handleChange}
              className = "p-2 border rounded"
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
        Immigration Status at Time of ICE Arrest
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
      
      {/* Extra Information */}
      <label className="flex flex-col">
        <span>
          Is there any additional information about the circumstances of 
          the ICE arrest that you would like to share?
        </span>
        <input
          type="text"
          name="ExtraInformation"
          value={formData.ExtraInformation}
          onChange={handleChange}
          className="p-2 border rounded"
        />
      </label>

      {/* Monitored by ICE */}
      <label className="flex flex-col">
        <span>
          Were you/the person arrested by ICE in the Intensive Supervision Appearance Program (ISAP)? 
          Or were you/the person arrested under any monitoring or surveillance by ICE? 
          Ex: Watch, Smart link app, ankle monitor, etc?
          <span className="text-red-500">*</span>
        </span>
        <select
          name= "Monitoring"
          value={formData.Monitoring}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        >
          <option value="">Select a reason</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unsure">Unsure</option>
        </select>
      </label>
      
      {/* Monitoring Type */}
      {showMonitorType && (
        <label>
          <span>
            What kind of monitoring was used?
            <span className = "text-red-500">*</span>
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
          If you know, how did ICE find out about your 
          location/the location of the person arrested?
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
          type= "number"
          name="PhoneNumber"
          value={formData.PhoneNumber}
          onChange={handleChange}
          className="p-2 border rounded"
        />
      </label>

      <label className="flex flex-col">
        May we follow up with you?
        <select
          name= "FollowUp"
          value={formData.FollowUp}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        >
          <option value="">Select a reason</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>

      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition">
        Submit
      </button>

    </form>
    </div>
  );
}
