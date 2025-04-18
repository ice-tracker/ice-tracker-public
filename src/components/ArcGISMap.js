"use client"; // Ensures it's a client-side component

import { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";

const ArcGISMap = () => {
  const mapRef = useRef(null);
  const [sightings, setSightings] = useState([]); // State to hold points
  const [unverified, setUnverified] = useState([]);
  const [verified, setVerified] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state to track fetch status
  const badLocations = ["workplace", "home", "other"];

  useEffect(() => {
    // Fetch points from MongoDB API
    fetch("/api/points")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Data is JSON split into {Sightings:[], Unverified:[], Verified:[]}
        console.log("Fetched Data:", data); // Log the data to see what it is
        setSightings(data.Sightings);
        setUnverified(data.Unverified);
        setVerified(data.Verified);
        console.log(data.Sightings);
        setLoading(false); // Set loading to false when data is fetched
      })
      .catch((error) => {
        console.error("Error fetching points:", error);
        setLoading(false); // Set loading to false in case of error
      });
  }, []); // Empty dependency array ensures this effect runs only once when component mounts

  useEffect(() => {
    if (loading) {
      return; // Don't initialize map if data is still loading or no points are fetched
    }

    // Initialize map
    let view;

    loadModules(
      [
        "esri/Map",
        "esri/views/MapView",
        "esri/Graphic",
        "esri/layers/GraphicsLayer",
      ],
      { css: true }
    ).then(([Map, MapView, Graphic, GraphicsLayer]) => {
      const map = new Map({
        basemap: "streets-navigation-vector",
      });

      view = new MapView({
        container: mapRef.current,
        map: map,
        center: [-71.589, 42.1601], // Center of Boston
        zoom: 8,
      });

      const graphicsLayer = new GraphicsLayer();
      map.add(graphicsLayer);

      // Add sightings to map as graphics
      sightings.forEach((point) => {
        console.log("loading sighting");
        const graphic = new Graphic({
          geometry: {
            type: "point",
            longitude: point.Longitude,
            latitude: point.Latitude,
          },
          symbol: {
            type: "simple-marker",
            style: "square",
            color: "lightblue",
            size: "10px",
            outline: {
              color: "black",
              width: 0.8, // Smaller border width
            },
            size: 10,
          },
          attributes: {
            Location: point.Location,
            Address: point.Address,
            Date: point.Date,
          },
          popupTemplate: {
            title: "{Location}",
            content: [
              {
                type: "text", // Text content type
                text: "Date: {Date} <br/> Address: {Address} <br/>", // Reference more attributes
              },
            ],
          },
        });
        if (!badLocations.includes(point.Location)) {
          graphicsLayer.add(graphic);
        }
      });

      // Add unverified points to map as graphics
      unverified.forEach((point) => {
        console.log("loading unverified");
        const graphic = new Graphic({
          geometry: {
            type: "point",
            longitude: point.Longitude,
            latitude: point.Latitude,
          },
          symbol: {
            type: "simple-marker",
            style: "triangle",
            color: "yellow",
            size: "10px",
            outline: {
              color: "black",
              width: 0.8, // Smaller border width
            },
            size: 10,
          },
          attributes: {
            Name: point.Name,
            Location: point.Location,
            Address: point.Address,
            Date: point.Date,
            Description: point.HowICE,
          },
          popupTemplate: {
            title: "{Location}",
            content: [
              {
                type: "text", // Text content type
                text: "Date: {Date} <br/> Address: {Address} <br/> Description: {Description}", // Reference more attributes
              },
            ],
          },
        });
        if (!badLocations.includes(point.Location)) {
          graphicsLayer.add(graphic);
        }
      });

      // Add verified points to map as graphics
      verified.forEach((point) => {
        if (
          point.Latitude == null || 
          point.Longitude == null
        ) {
          return;
        }
        console.log("loading verified");
        const graphic = new Graphic({
          geometry: {
            type: "point",
            longitude: point.Longitude,
            latitude: point.Latitude,
          },
          symbol: {
            type: "simple-marker",
            style: "circle",
            color: "red",
            size: "10px",
            outline: {
              color: "black",
              width: 0.8, // Smaller border width
            },
            size: 10,
          },
          attributes: {
            Name: point.Name,
            Location: point.Location,
            Address: point.Address,
            Date: point.Date,
            Description: point.HowICE,
          },
          popupTemplate: {
            title: "{Location}",
            content: [
              {
                type: "text", // Text content type
                text: "Date: {Date} <br/> Address: {Address} <br/> Description: {Description}", // Reference more attributes
              },
            ],
          },
        });
        if (!badLocations.includes(point.Location)) {
          graphicsLayer.add(graphic);
        }
      });
    });

    return () => view?.destroy(); // Clean up map view on component unmount
  }, [loading]); // Re-run map initialization when loading

  if (loading) {
    return <div>Loading map...</div>; // Show loading message while points are being fetched
  }

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
};

export default ArcGISMap;
