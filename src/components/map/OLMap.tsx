// src/components/OLMap.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import "ol/ol.css";
import "./ol-popup.css";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat, toLonLat } from "ol/proj";

import Overlay from "ol/Overlay";

import { Attribution, defaults as defaultControls } from "ol/control";

import XYZ from "ol/source/XYZ";

import {
  defaults as defaultInteractions,
  MouseWheelZoom,
} from "ol/interaction";

import Circle from "ol/geom/Circle";

import { styles } from "./pointStyles";

import { PointData } from "@/components/map/MapSection";

// Define props for OLMap component
interface OLMapProps {
  allPoints: PointData[];
  currentEvent: PointData | null;
  setCurrentEvent: (event: PointData | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
  filterText: string;
  filterLocation: string;
  filterActivity: string;
  filterDateStart: string;
  filterDateEnd: string;
  filterAddress: string;
}

const OLMap: React.FC<OLMapProps> = ({
  allPoints,
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  loading,
  filterText,
  filterLocation,
  filterActivity,
  filterDateStart,
  filterDateEnd,
  filterAddress,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const currentEventRef = useRef<PointData | null>(null);

  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState<string>("");
  const [popupCoordinate, setPopupCoordinate] = useState<number[] | undefined>(
    undefined
  );

  // Define styles once outside of any useEffect

  // Function to apply filters and update map features
  const applyFilters = useCallback(() => {
    if (!mapObjRef.current) return;

    const vectorLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "markers");

    if (vectorLayer instanceof VectorLayer) {
      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      vectorSource.clear();

      // Store features to filter
      const features: Feature[] = [];

      allPoints
        .filter((point) => {
          // Robust string conversion for all fields
          const pointDate = (point.Date || "").toString();
          const pointDescription = (point.Description || "").toString();
          const pointLocation = (point.Location || "").toString();
          const pointActivity = (point.Activity || "").toString();
          const pointAddress = (point.Address || "").toString();

          // Filter by text (in Date or Description)
          const filterTextStr = (filterText || "").toString();
          const matchesText =
            filterTextStr.trim() === "" ||
            pointDate.toLowerCase().includes(filterTextStr.toLowerCase()) ||
            pointDescription
              .toLowerCase()
              .includes(filterTextStr.toLowerCase());

          // Filter by location (if set)
          const filterLocationStr = (filterLocation || "").toString();
          const matchesLocation =
            filterLocationStr.trim() === "" ||
            pointLocation.toLowerCase() === filterLocationStr.toLowerCase();

          // Filter by activity (if set)
          const filterActivityStr = (filterActivity || "").toString();
          const matchesActivity =
            filterActivityStr.trim() === "" ||
            pointActivity.toLowerCase() === filterActivityStr.toLowerCase();

          // Filter by date range (if set)
          const pointDateOnly = pointDate.split("T")[0]; // Handles ISO strings
          const afterStart =
            !filterDateStart || pointDateOnly >= filterDateStart;
          const beforeEnd = !filterDateEnd || pointDateOnly <= filterDateEnd;

          // Filter by activity (if set)
          const filterAddressStr = (filterAddress || "").toString();
          const matchesAddress =
            filterAddressStr.trim() === "" ||
            pointAddress.toLowerCase().includes(filterAddressStr.toLowerCase());

          return (
            matchesText &&
            matchesLocation &&
            matchesActivity &&
            afterStart &&
            beforeEnd &&
            matchesAddress
          );
        })
        .forEach((point) => {
          const coordinates = [point.Longitude, point.Latitude];
          const transformedCenter = fromLonLat(coordinates);

          if (point.Sec === true) {
            // Add the circle feature
            const circleGeometry = new Circle(transformedCenter, 625);
            features.push(
              new Feature({
                geometry: circleGeometry,
                ...point,
                featureType: "circle",
              })
            );
            // Add the point feature (the "double")
            const pointGeometry = new Point(transformedCenter);
            features.push(
              new Feature({
                geometry: pointGeometry,
                ...point,
                featureType: "hiddenPoint",
              })
            );
          } else {
            // Add just the point feature
            const pointGeometry = new Point(transformedCenter);
            features.push(
              new Feature({
                geometry: pointGeometry,
                ...point,
                featureType: "point",
              })
            );
          }
        });
      vectorSource.addFeatures(features);
    }
  }, [
    allPoints,
    filterText,
    filterLocation,
    filterActivity,
    filterDateStart,
    filterDateEnd,
  ]);
  // Effect to initialize the map
  useEffect(() => {
    if (loading) {
      return;
    }

    if (mapRef.current && !mapObjRef.current) {
      const initialMap = new Map({
        target: mapRef.current,

        layers: [
          new TileLayer({
            source: new XYZ({
              url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
              attributions:
                'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer" target="_blank">ESRI</a>',
              maxZoom: 19, // This service generally supports up to zoom level 19
            }),
          }),
        ],
        view: new View({
          center: fromLonLat([-71.7589, 42.0001]),
          zoom: 8.5,
        }),
        controls: defaultControls({
          attribution: false, // turn off default attribution control
        }).extend([
          new Attribution({
            collapsible: false, // always visible
          }),
        ]),
        interactions: defaultInteractions({
          mouseWheelZoom: false,
        }).extend([
          new MouseWheelZoom({
            duration: 450,
            constrainResolution: true, // slow zoom if not turned on
            maxDelta: 1, //
            timeout: 40, // debounce between scroll events
          }),
        ]),
      });
      mapObjRef.current = initialMap;

      const vectorSource = new VectorSource({
        features: [],
      });

      const customStyle = function (feature: Feature, resolution: number) {
        const type = feature.get("featureType");
        const activity = feature.get("Activity");

        // Check zoom
        const zoom = initialMap.getView().getZoomForResolution(resolution);

        // Choose Threshold (based on circle radius?)
        const zoomThreshold = 11;

        if (
          currentEventRef.current &&
          currentEventRef.current.id === feature.get("id")
        ) {
          if (type === "circle") {
            return [
              styles[`${activity}Circle`] || styles.arrestCircle,
              styles.highlightCircle,
            ];
          } else if (type === "point") {
            return [styles[activity] || styles.arrest, styles.highlight];
          }
        }

        if (type === "circle") {
          if (zoom !== undefined && zoom < zoomThreshold) {
            // At lower zoom levels, render as a simple point icon
            return null;
          } else {
            // At higher zoom levels do not render hidden point.
            return styles[`${activity}Circle`] || styles.arrestCircle;
          }
        } else if (type === "point") {
          return styles[activity] || styles.arrest;
        } else if (type === "hiddenPoint") {
          if (zoom !== undefined && zoom < zoomThreshold) {
            // At lower zoom levels, render as a simple point icon
            return styles[activity] || styles.arrest; // Assuming 'styles.arrest' is a suitable point style
          } else {
            // At higher zoom levels do not render hidden point.
            return null;
          }
        } else {
          return styles.arrest;
        }
      };

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: customStyle,
        properties: { name: "markers" },
        updateWhileAnimating: true,
        renderBuffer: 500,
      });
      initialMap.addLayer(vectorLayer);

      // --- Popup Logic ---
      if (popupRef.current) {
        const popupOverlay = new Overlay({
          element: popupRef.current,
          autoPan: false,
          positioning: "bottom-center",
          stopEvent: true,
          offset: [0, -10],
        });
        initialMap.addOverlay(popupOverlay);

        initialMap.on("click", function (event) {
          let featureFound = false;
          let featureCoordinates;
          let contentHTML = "";

          initialMap.forEachFeatureAtPixel(
            event.pixel,
            function (feature, layer) {
              if (layer && layer.get("name") === "markers") {
                const clickedGeometry = feature.getGeometry();
                const featureProps = feature.getProperties() as PointData;

                if (clickedGeometry instanceof Point) {
                  featureCoordinates = clickedGeometry.getCoordinates();
                  const lonLatCoords = toLonLat(featureCoordinates);

                  contentHTML = `
                    <div class="ol-popup-content">
                        <h3>${featureProps.Date || "Unnamed Point"}</h3>
                        <p>${
                          featureProps.Description ||
                          "No description available."
                        }</p>
                        <p>Lon: ${lonLatCoords[0].toFixed(
                          4
                        )}, Lat: ${lonLatCoords[1].toFixed(4)}</p>
                    </div>
                    `;
                } else if (clickedGeometry instanceof Circle) {
                  featureCoordinates = clickedGeometry.getCenter();
                  const lonLatCoords = toLonLat(featureCoordinates);

                  const circleName = featureProps.Date || "Unnamed Circle";
                  const circleDescription =
                    featureProps.Description || "No description available.";

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

                if (featureCoordinates && contentHTML) {
                  setPopupContent(contentHTML);
                  setPopupCoordinate(featureCoordinates);
                  //setShowPopup(true);
                  setShowPopup(false);
                  popupOverlay.setPosition(featureCoordinates);

                  setCurrentEvent(featureProps);
                  setSidebarOpen(false);

                  featureFound = true;
                  return true;
                }
              }
            }
          );
          if (!featureFound) {
            setShowPopup(false);
            setCurrentEvent(null);
            setPopupCoordinate(undefined);
            popupOverlay.setPosition(undefined);
          }
        });
      }
    }

    return () => {
      if (mapObjRef.current) {
        mapObjRef.current.setTarget(undefined);
        mapObjRef.current
          .getOverlays()
          .forEach((overlay) => mapObjRef.current?.removeOverlay(overlay));
      }
    };
  }, [loading]);

  // Effect to re-apply filters when filter states or data changes
  useEffect(() => {
    if (!loading && mapObjRef.current) {
      applyFilters();
      console.log("filters applied");
    }
  }, [loading, applyFilters]); // filterText, showOnlyCircles, showOnlyPoints are now dependencies of applyFilters directly

  // Effect to zoom to / highlight appropriate point when currentEvent changes
  useEffect(() => {
    console.log(currentEvent);
    if (mapObjRef.current && currentEvent) {
      const coordinates = fromLonLat([
        currentEvent.Longitude,
        currentEvent.Latitude,
      ]);
      mapObjRef.current.getView().animate({
        center: coordinates,
        zoom: 14, // You can adjust the desired zoom level
        duration: 700, // Animation duration in milliseconds
      });
    }
    if (mapObjRef.current) {
      // Update vector layer to reflect change
      const vectorLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "markers");
      if (vectorLayer) vectorLayer.changed();
    }
  }, [currentEvent]);

  // Updating current event ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

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
