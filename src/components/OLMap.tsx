import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import "ol/ol.css";
import "./ol-popup.css";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, RegularShape, Fill, Stroke, Icon } from "ol/style";
import { fromLonLat, toLonLat } from "ol/proj";

import Overlay from "ol/Overlay"; // Import Overlay for popups

import {
  defaults as defaultInteractions,
  MouseWheelZoom,
} from "ol/interaction";

import Circle from "ol/geom/Circle";

const OLMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null); // Ref for the popup element

  // State to manage popup visibility, content, and position
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState<string>("");
  const [popupCoordinate, setPopupCoordinate] = useState<number[] | undefined>(
    undefined
  );

  // State to track points
  const [verified, setVerified] = useState([]);

  const [loading, setLoading] = useState(true); // Loading state to track fetch status

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
        //setSightings(data.Sightings);
        //setUnverified(data.Unverified);

        // ---------- NOTE: change to data.Verified or something later -----------

        setVerified(data);
        //console.log(data.Sightings);
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

    if (mapRef.current && !mapObjRef.current) {
      // Initialize the Map
      const initialMap = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: fromLonLat([-71.7589, 42.0001]), // Center on Boston (transformed to EPSG:3857)
          zoom: 8.5,
        }),
        interactions: defaultInteractions().extend([
          new MouseWheelZoom({
            duration: 400, // faster zoom animation
            constrainResolution: true, // snap to integer zoom levels
          }),
        ]),
      });
      mapObjRef.current = initialMap;

      // Create a Vector Source for the points
      const vectorSource = new VectorSource({
        features: [],
      });

      // Define a Style for the points
      const pointStyle = new Style({
        image: new RegularShape({
          points: 4,
          radius: 8,
          angle: Math.PI / 4,
          fill: new Fill({
            color: "rgba(255, 0, 0, 1)",
          }),
          stroke: new Stroke({
            color: "black",
            width: 1.5,
          }),
        }),
      });

      const altPointStyle = new Style({
        image: new RegularShape({
          points: 3,
          radius: 8,
          angle: Math.PI * 2,
          fill: new Fill({
            color: "rgb(241, 230, 12)",
          }),
          stroke: new Stroke({
            color: "black",
            width: 1.5,
          }),
        }),
      });

      // Define a style for the circles
      const circleStyle = new Style({
        fill: new Fill({
          color: "rgba(255, 0, 0, 0.5)", // Semi-transparent blue fill
        }),
        stroke: new Stroke({
          color: "red", // Blue border
          width: 2,
        }),
      });

      // Create Features from your points array
      verified.forEach((point) => {
        if (point.Sec === true) {
          // Anonymous/secure
          //defined circle radius
          const radius = 625;

          const coordinates = [point.Longitude, point.Latitude];

          const transformedCenter = fromLonLat(coordinates);

          // Create the Circle geometry (center, radius in meters)
          const circleGeometry = new Circle(transformedCenter, radius);

          // Create a Feature for the circle
          const circleFeature = new Feature({
            geometry: circleGeometry,
            ...point, // Attach other properties like name
          });

          vectorSource.addFeature(circleFeature);
        } else {
          // Not
          const coordinates = [point.Longitude, point.Latitude];
          const transformedCoord = fromLonLat(coordinates);
          const pointGeometry = new Point(transformedCoord);
          const pointFeature = new Feature({
            geometry: pointGeometry,
            ...point, // Spread all properties from pointData to the feature
          });
          vectorSource.addFeature(pointFeature);
        }
      });

      // Custom styling (point vs circle)
      const customStyle = function (feature) {
        const sec = feature.get("Sec");
        if (sec) {
          return circleStyle;
        }
        return pointStyle;
      };

      // Create a Vector Layer and apply the style
      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: customStyle,
        properties: { name: "markers" }, // Give the layer a name to identify it later
      });
      initialMap.addLayer(vectorLayer);

      // --- Popup Logic ---
      if (popupRef.current) {
        const popupOverlay = new Overlay({
          element: popupRef.current,
          autoPan: false,
          positioning: "bottom-center", // Position the popup above the marker
          stopEvent: true, // Prevent click events on the popup from propagating to the map
          offset: [0, -10], // Offset the popup slightly above the marker
        });
        initialMap.addOverlay(popupOverlay);

        // Map Click Event Listener
        initialMap.on("click", function (event) {
          let featureFound = false;
          let featureCoordinates; // To store coordinates for popup positioning
          let contentHTML = ""; // To build popup content

          initialMap.forEachFeatureAtPixel(
            event.pixel,
            function (feature, layer) {
              if (layer && layer.get("name") === "markers") {
                const clickedGeometry = feature.getGeometry();
                const featureProps = feature.getProperties(); // Get all properties at once

                // Determine coordinates and build content based on geometry type
                if (clickedGeometry instanceof Point) {
                  featureCoordinates = clickedGeometry.getCoordinates();
                  const lonLatCoords = toLonLat(featureCoordinates);

                  contentHTML = `
                   <div class="ol-popup-content">
                       <h3>${featureProps.Date || "Unnamed Point"}</h3>
                       <p>${
                         featureProps.Description || "No description available."
                       }</p>
                       <p>Lon: ${lonLatCoords[0].toFixed(
                         4
                       )}, Lat: ${lonLatCoords[1].toFixed(4)}</p>
                   </div>
                   `;
                } else if (clickedGeometry instanceof Circle) {
                  // For a Circle, getCoordinates() returns the center of the circle.
                  // This is usually a good spot to place the popup.
                  featureCoordinates = clickedGeometry.getCenter();
                  const lonLatCoords = toLonLat(featureCoordinates);

                  // Access properties specific to your circle data (e.g., 'name', 'description')
                  // Assuming 'name' and 'description' are properties on your original circleData
                  const circleName = featureProps.Date || "Unnamed Circle";
                  const circleDescription =
                    featureProps.description || "No description available.";

                  contentHTML = `
                   <div class="ol-popup-content">
                       <h3>${circleName}</h3>
                       <p>${circleDescription}</p>
                       <p>Approximate Lon: ${lonLatCoords[0].toFixed(
                         4
                       )}, Lat: ${lonLatCoords[1].toFixed(4)}</p>
                   </div>
                   `;
                }

                // If a valid geometry was found and content was prepared
                if (featureCoordinates && contentHTML) {
                  setPopupContent(contentHTML);
                  setPopupCoordinate(featureCoordinates); // Set map coordinates for the overlay
                  setShowPopup(true); // Show the popup
                  popupOverlay.setPosition(featureCoordinates); // Position the overlay
                  featureFound = true;
                  return true; // Stop iterating over features
                }
              }
            }
          );
          if (!featureFound) {
            setShowPopup(false); // Hide popup if no feature was clicked
            setPopupCoordinate(undefined);
            popupOverlay.setPosition(undefined); // Remove popup from map
          }
        });
      }
    } 

    return () => {
      // Cleanup: Unset the map target and remove any overlays
      if (mapObjRef.current) {
        mapObjRef.current.setTarget(undefined);
        mapObjRef.current
          .getOverlays()
          .forEach((overlay) => mapObjRef.current?.removeOverlay(overlay));
      }
    };
  }, [loading]); // Re-run map initialization when loading

  // Function to close the popup
  const closePopup = () => {
    setShowPopup(false);
    setPopupContent("");
    setPopupCoordinate(undefined);
    if (mapObjRef.current && popupRef.current) {
      const popupOverlay = mapObjRef.current
        .getOverlays()
        .getArray()
        .find((overlay) => overlay.getElement() === popupRef.current);
      if (popupOverlay) {
        popupOverlay.setPosition(undefined);
      }
    }
  };

  return (
    <>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100vh",
          border: "1px solid #ccc",
        }}
      ></div>

      <div
        ref={popupRef}
        className="ol-popup"
        style={{ display: showPopup ? "block" : "none" }}
      >
        <a
          href="#"
          id="popup-closer"
          className="ol-popup-closer"
          onClick={closePopup}
        ></a>
        <div dangerouslySetInnerHTML={{ __html: popupContent }} />
      </div>
    </>
  );
};

export default OLMap;
