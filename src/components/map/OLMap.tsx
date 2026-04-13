// src/components/OLMap.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import "ol/ol.css";
import "./ol-popup.css";

// Shapefile imports
import GeoJSON from "ol/format/GeoJSON";
import { Geometry } from "ol/geom";
import { RenderFunction } from "ol/style/Style";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Cluster from "ol/source/Cluster";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { fromLonLat } from "ol/proj";

import { Attribution, defaults as defaultControls } from "ol/control";
import XYZ from "ol/source/XYZ";

import {
  defaults as defaultInteractions,
  MouseWheelZoom,
} from "ol/interaction";

import Circle from "ol/geom/Circle";
import { styles } from "./pointStyles";
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";

import {
  PointData,
  PlaceOfInterest,
  FlockCamera,
} from "@/components/map/MapSection";

interface TownData {
  [townName: string]: { arrests: number; detainers: number };
}

// Define props for OLMap component
interface OLMapProps {
  filteredGroups: PointData[][];
  currentEvent: PointData[] | null;
  setCurrentEvent: (event: PointData[] | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
  pois: PlaceOfInterest[];
  loadingPOIs: boolean;
  currentPOI: PlaceOfInterest | null;
  setCurrentPOI: (poi: PlaceOfInterest | null) => void;
  flockCameras: FlockCamera[];
  loadingFlockCameras: boolean;
  currentFlockCamera: FlockCamera | null;
  setCurrentFlockCamera: (camera: FlockCamera | null) => void;
  townStats?: TownData;
  showTownStats?: boolean;
  onTownClick?: (
    townInfo: { name: string; arrests: number; detainers: number } | null,
  ) => void;
}

// Hard-coded zoom threshold for spreading coincident points
const SPREAD_ZOOM_THRESHOLD = 16;

// Helper to determine color based on arrest count (Choropleth logic)
const getTownColor = (arrests: number, detainers: number) => {
  if (arrests + detainers > 500) return "rgba(128, 0, 0, 0.6)";   // High - Dark Red
  if (arrests + detainers > 100) return "rgba(255, 0, 0, 0.4)";    // Medium - Red
  if (arrests + detainers > 50) return "rgba(255, 165, 0, 0.4)";   // Low - Dark Orange
  if (arrests > 0 || detainers > 0) return "rgba(255, 204, 0, 0.4)";   // Low - Light Orange for detainers only
  return "rgba(120, 120, 120, 0.05)";                // None - Almost Transparent gray
};

const OLMap: React.FC<OLMapProps> = ({
  filteredGroups,
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  loading,
  pois,
  loadingPOIs,
  currentPOI,
  setCurrentPOI,
  flockCameras,
  loadingFlockCameras,
  currentFlockCamera,
  setCurrentFlockCamera,
  townStats = {},
  showTownStats = false,
  onTownClick,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<Map | null>(null);
  const currentEventRef = useRef<PointData[] | null>(null);
  const currentPOIRef = useRef<PlaceOfInterest | null>(null);
  const currentFlockCameraRef = useRef<FlockCamera | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const clusterSourceRef = useRef<Cluster | null>(null);
  const circleSourceRef = useRef<VectorSource | null>(null);

  // Track current zoom level for spreading coincident points
  const [currentZoom, setCurrentZoom] = useState<number>(0);
  // Track whether we're above the spread threshold (for optimized re-rendering)
  const [isAboveSpreadThreshold, setIsAboveSpreadThreshold] =
    useState<boolean>(false);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  // filling in the chloropleth paarts
  useEffect(() => {
    if (!mapObjRef.current) return;

    // Find the layer we named "towns"
    const townLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "towns");

    if (townLayer) {
      // .changed() forces the layer to re-run its style function
      townLayer.changed();
    }
  }, [townStats]);

  // Toggle town layer visibility based on showTownStats
  useEffect(() => {
    if (!mapObjRef.current) return;

    const townLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "towns");

    if (townLayer) {
      townLayer.setVisible(showTownStats ?? true);
    }
  }, [showTownStats]);

  // Helper function to spread coincident points in a honeycomb pattern
  // Optimized: only called when isAboveSpreadThreshold is true
  const spreadCoincidentPoints = useCallback(
    (features: Feature[], resolution: number): Feature[] => {
      if (!isAboveSpreadThreshold) return features; // No spreading below threshold

      // Group features by their coordinates (rounded to detect "same location")
      const coordGroups: { [key: string]: Feature[] } = {};
      const nonPointFeatures: Feature[] = [];

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const geom = feature.getGeometry();
        if (!(geom instanceof Point)) {
          nonPointFeatures.push(feature);
          continue;
        }
        const coords = geom.getCoordinates();
        // Round to detect coincident points
        const key = `${Math.round(coords[0] / 10) * 10},${Math.round(coords[1] / 10) * 10}`;
        if (!coordGroups[key]) coordGroups[key] = [];
        coordGroups[key].push(feature);
      }

      // Spread groups with multiple features
      const spreadFeatures: Feature[] = nonPointFeatures; // Start with non-point features
      const groups = Object.values(coordGroups);

      for (let g = 0; g < groups.length; g++) {
        const group = groups[g];
        if (group.length === 1) {
          spreadFeatures.push(group[0]);
          continue;
        }

        // Honeycomb pattern: arrange in concentric rings
        const baseRadius = 35 * resolution;
        let featureIndex = 0;
        let ring = 0;

        // Get original coordinates from first feature
        const firstGeom = group[0].getGeometry() as Point;
        const originalCoords = firstGeom.getCoordinates();

        while (featureIndex < group.length) {
          const pointsInThisRing = ring === 0 ? 1 : ring * 6;
          const ringRadius = ring * baseRadius;

          for (
            let i = 0;
            i < pointsInThisRing && featureIndex < group.length;
            i++
          ) {
            const feature = group[featureIndex];

            let offsetX = 0;
            let offsetY = 0;

            if (ring > 0) {
              const angle = (2 * Math.PI * i) / pointsInThisRing - Math.PI / 2;
              offsetX = Math.cos(angle) * ringRadius;
              offsetY = Math.sin(angle) * ringRadius;
            }

            // Clone feature and set new geometry with offset
            const spreadFeature = feature.clone();
            spreadFeature.setGeometry(
              new Point([
                originalCoords[0] + offsetX,
                originalCoords[1] + offsetY,
              ]),
            );
            spreadFeature.set("isSpread", true);
            spreadFeatures.push(spreadFeature);

            featureIndex++;
          }
          ring++;
        }
      }

      return spreadFeatures;
    },
    [isAboveSpreadThreshold],
  );

  // Function to apply filters and update map features
  const applyFilters = useCallback(() => {
    if (!mapObjRef.current) return;

    // Cluster only point features
    const clusterLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "clusters");

    if (clusterLayer instanceof VectorLayer) {
      const clusterSource = clusterLayer.getSource();
      if (!clusterSource) return;

      // Underlying vector source is clusterSource.getSource()
      const vectorSource = clusterSource.getSource();
      if (!vectorSource) return;
      vectorSource.clear();

      // Store features to filter
      const features: Feature[] = [];

      // Iterate through point groups
      filteredGroups.forEach((group) => {
        if (!Array.isArray(group) || group.length === 0) return; // Defensive: skip empty or invalid groups
        // Assign first point as the "head" (what will be displayed)
        const point = group[0];
        if (
          point.RandomLongitude === null ||
          point.RandomLongitude === undefined ||
          point.RandomLatitude === null ||
          point.RandomLatitude === undefined
        ) {
          // Skip this point if coordinates are invalid
          return;
        }

        if (point.OnlyStreet === true && point.StreetGeom) {
          // try {
          //   const data = JSON.parse(point.StreetGeom);
          //   if (data && Array.isArray(data.elements)) {
          //     data.elements.forEach((el) => {
          //       const geometryArr = el.geometry;
          //       if (Array.isArray(geometryArr) && geometryArr.length > 1) {
          //         const coordinates = geometryArr.map((pt) =>
          //           fromLonLat([pt.lon, pt.lat])
          //         );
          //         const line = new LineString(coordinates);
          //         const lineFeature = new Feature({
          //           geometry: line,
          //           featureType: "street",
          //           Activity: point.Activity || "arrest", // set Activity for styling
          //           id: point.id, // <-- add id for highlight
          //         });
          //         features.push(lineFeature);
          //       }
          //     });
          //   }
          // } catch (e) {
          //   console.error("Invalid StreetGeom JSON:", e);
          // }
        }

        const coordinates = [point.RandomLongitude, point.RandomLatitude];
        const transformedCenter = fromLonLat(coordinates);

        if (point.Sec === true && !point.OnlyStreet) {
          // Add the circle feature
          const radius = point.Radius || 0.5;
          // Convert to meters/map units
          const map_units = radius * 1609.34;
          const circleGeometry = new Circle(transformedCenter, map_units);
          features.push(
            new Feature({
              geometry: circleGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "secureCircle",
              id: point.id,
            })
          );
          // Add the point feature (the "double")
          const pointGeometry = new Point(transformedCenter);
          features.push(
            new Feature({
              geometry: pointGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "securePoint",
              id: point.id,
            })
          );
        } else {
          // Add just the point feature
          const pointGeometry = new Point(transformedCenter);
          features.push(
            new Feature({
              geometry: pointGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "point",
              id: point.id, // <-- add id for highlight
            }),
          );
        }
      });

      // Add POI features to same array
      if (!loadingPOIs) {
        pois.forEach((poi) => {
          const coordinates = fromLonLat([poi.Longitude, poi.Latitude]);
          const pointGeometry = new Point(coordinates);
          features.push(
            new Feature({
              geometry: pointGeometry,
              featureType: "poi",
              poiData: poi,
              group: [poi], // Wrap for consistency with incidents
              id: `poi-${poi.id}`, // Prefix to avoid ID collisions
            }),
          );
        });
      }

      // Add Flock Camera features to same array
      if (!loadingFlockCameras) {
        flockCameras.forEach((camera) => {
          const coordinates = fromLonLat([camera.Longitude, camera.Latitude]);
          const pointGeometry = new Point(coordinates);
          features.push(
            new Feature({
              geometry: pointGeometry,
              featureType: "flockCamera",
              flockCameraData: camera,
              group: [camera], // Wrap for consistency
              id: `flock-${camera.id}`, // Prefix to avoid ID collisions
            }),
          );
        });
      }

      // Separate circle features from point features
      const circleFeatures = features.filter(
        (f) => f.get("featureType") === "secureCircle"
      );
      const pointFeatures = features.filter(
        (f) => f.get("featureType") !== "secureCircle"
      );

      // Apply spreading for coincident points when zoomed in
      const resolution = mapObjRef.current?.getView().getResolution() || 1;
      const finalPointFeatures = spreadCoincidentPoints(pointFeatures, resolution);

      // Add point features to clustered layer
      vectorSource.addFeatures(finalPointFeatures);

      // Add circle features to non-clustered layer
      if (circleSourceRef.current) {
        circleSourceRef.current.clear();
        circleSourceRef.current.addFeatures(circleFeatures);
      }
    }
  }, [
    filteredGroups,
    pois,
    loadingPOIs,
    flockCameras,
    loadingFlockCameras,
    spreadCoincidentPoints,
  ]);
  // Effect to initialize the map
  useEffect(() => {
    if (loading) {
      return;
    }
    const townStyleFunction = (feature: any, resolution: number) => {
      // 1. Get the key from the GeoJSON properties
      const townName = feature.get("TOWN");

      // 2. Look up the value in your separate dataset
      const stats = townStats[townName];
      const arrests = stats ? stats.arrests : 0;
      const detainers = stats ? stats.detainers : 0;

      // 3. Compute zoom from resolution to decide whether to show labels
      const view = mapObjRef.current?.getView();
      const zoom = view ? view.getZoomForResolution(resolution) : 0;
      const showLabel = zoom !== undefined && zoom >= 11;

      // 4. Return style
      return new Style({
        fill: new Fill({
          color: getTownColor(arrests, detainers),
        }),
        stroke: new Stroke({
          color: "#666",
          width: 1,
        }),
        // Only show text label when zoomed in enough
        text: showLabel
          ? new Text({
              text: townName,
              font: "12px Calibri,sans-serif",
              fill: new Fill({ color: "#000" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
              overflow: true,
            })
          : undefined,
      });
    };

    // --- NEW: Create the Vector Source & Layer ---
    const townsLayer = new VectorLayer({
      source: new VectorSource({
        url: "/files/towns.json", // Path to your file in the public folder
        format: new GeoJSON(),
      }),
      style: townStyleFunction,
      zIndex: 0, // Ensure this sits BELOW your points/clusters
      visible: showTownStats, // Off by default, toggled by checkbox
      properties: { name: "towns" }, // Label for easier debugging
    });

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
          townsLayer,
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
            duration: 700,
            constrainResolution: true,
            maxDelta: 1,
            timeout: 20,
            condition: function (event) {
              // Check deadzone: only allow map zoom if scroll delta is above threshold
              const browserEvent = event.originalEvent;
              if (browserEvent && "deltaY" in browserEvent) {
                const deltaY = Math.abs(browserEvent.deltaY);
                const deadzone = 5;
                return deltaY > deadzone;
              }
              return false; // Don't zoom for non-wheel events
            },
          }),
        ]),
      });
      mapObjRef.current = initialMap;

      // Add wheel event listener to prevent browser zoom while preserving click functionality
      const mapElement = mapRef.current;

      if (mapElement) {
        wheelHandlerRef.current = (e: WheelEvent) => {
          // Always prevent browser zoom on the map
          e.preventDefault();
        };

        mapElement.addEventListener("wheel", wheelHandlerRef.current, {
          passive: false,
        });
      }

      // Underlying vector source for clustering
      const vectorSource = new VectorSource({ features: [] });

      // Cluster source
      const clusterSource = new Cluster({
        distance: 30, // decreased from 40
        source: vectorSource,
      });
      clusterSourceRef.current = clusterSource;

      // Custom style logic for single points (from previous code)
      const customStyle = function (feature, resolution) {
        const type = feature.get("featureType");
        const group = feature.get("group");
        const leader = Array.isArray(group) && group[0] ? group[0] : undefined;

        // Activity mapping
        const activityMapping: { [key: string]: string } = {
          Arrest: "arrest",
          Presence: "presence",
          "Attempted Arrest": "attempted",
        };

        const rawActivity =
          feature.get("Activity") || (leader ? leader.Activity : undefined);
        const activity = activityMapping[rawActivity] || 0;
        // Check zoom
        const zoom = initialMap.getView().getZoomForResolution(resolution);
        // Scale threshold based on point radius (weird function)
        const radius = leader ? leader.Radius : undefined;
        const zoomThreshold = radius ? -1.189 * Math.log(radius) + 9.176 : 8;

        // Street style
        if (
          type === "street" &&
          currentEventRef.current &&
          currentEventRef.current[0]?.id === feature.get("id")
        ) {
          return styles[`${activity}Street`] || styles.arrestStreet;
        }
        // If selected, choose highlighted styles
        if (
          currentEventRef.current &&
          Array.isArray(currentEventRef.current) &&
          currentEventRef.current[0]?.id &&
          currentEventRef.current[0]?.id === feature.get("id")
        ) {
          if (type === "point") {
            const baseStyle = styles[activity] || styles.arrest;
            const styleArray = Array.isArray(baseStyle)
              ? baseStyle
              : [baseStyle];
            // Add shield overlay if secure location
            if (leader && leader.Sec) {
              return [...styleArray, styles.secureOverlay, styles.highlight];
            }
            return [...styleArray, styles.highlight];
          }
        }
        //   if (type === "circle") {
        //     return [
        //       styles[`${activity}Circle`] || styles.arrestCircle,
        //       styles.highlightCircle,
        //     ];
        //   } else if (type === "point") {
        //     return [styles[activity] || styles.arrest, styles.highlight];
        //   }
        // }
        if (type === "circle") {
          if (zoom !== undefined && zoom < zoomThreshold) {
            // At lower zoom levels, render as a simple point icon
            return null;
          } else {
            // At higher zoom levels do not render hidden point.
            return styles[`${activity}Circle`] || styles.arrestCircle;
          }
        } else if (type === "point") {
          const baseStyle = styles[activity] || styles.arrest;
          // Add shield overlay if secure location
          if (leader && leader.Sec) {
            const styleArray = Array.isArray(baseStyle)
              ? baseStyle
              : [baseStyle];
            return [...styleArray, styles.secureOverlay];
          }
          return baseStyle;
        } else if (type === "hiddenPoint") {
          if (zoom !== undefined && zoom < zoomThreshold) {
            // At lower zoom levels, render as a simple point icon
            return styles[activity] || styles.arrest; // Assuming 'styles.arrest' is a suitable point style
          } else {
            // At higher zoom levels do not render hidden point.
            return null;
          }
        } else if (type === "secureCircle") {
          // Secure location radius circle
          // Hide circles at lower zoom levels
          if (zoom !== undefined && zoom < zoomThreshold) {
            return null;
          }

          const isSelected =
            currentEventRef.current &&
            currentEventRef.current[0]?.id === feature.get("id");

          return new Style({
            fill: new Fill({
              color: "rgba(100, 149, 237, 0.15)",
            }),
            stroke: new Stroke({
              color: isSelected ? "#1976d2" : "rgba(100, 149, 237, 0.5)",
              width: isSelected ? 3 : 2,
              lineDash: [8, 4],
            }),
          });
        } else if (type === "securePoint") {
          // Secure location point with shield overlay
          const baseStyle = styles[activity] || styles.arrest;
          const isSelected =
            currentEventRef.current &&
            currentEventRef.current[0]?.id === feature.get("id");

          const styleArray = Array.isArray(baseStyle) ? baseStyle : [baseStyle];

          if (isSelected) {
            return [...styleArray, styles.secureOverlay, styles.highlight];
          }
          return [...styleArray, styles.secureOverlay];
        } else if (type === "poi") {
          // POI style with highlighting
          const poiData = feature.get("poiData");
          if (
            currentPOIRef.current &&
            poiData &&
            poiData.id === currentPOIRef.current.id
          ) {
            // Selected POI: base style + blue highlight ring
            return [
              ...(Array.isArray(styles.poi) ? styles.poi : [styles.poi]),
              styles.poiHighlight,
            ];
          }
          return styles.poi; // Unselected: purple landmark icon
        } else if (type === "flockCamera") {
          // Flock Camera style with highlighting
          const cameraData = feature.get("flockCameraData");
          if (
            currentFlockCameraRef.current &&
            cameraData &&
            cameraData.id === currentFlockCameraRef.current.id
          ) {
            // Selected Flock Camera: base style + blue highlight ring
            return [
              ...(Array.isArray(styles.flockCamera)
                ? styles.flockCamera
                : [styles.flockCamera]),
              styles.flockCameraHighlight,
            ];
          }
          return styles.flockCamera; // Unselected: teal camera icon
        } else {
          return styles.arrest;
        }
      };

      // Cluster style: use customStyle for single points, cluster style for clusters
      const clusterStyle = (feature, resolution) => {
        const features = feature.get("features");
        if (features.length === 1) {
          // Use customStyle for the single feature
          return customStyle(features[0], resolution);
        }

        // Count feature types: Arrests (red), Sightings (yellow), POIs (purple), Cameras (teal)
        let arrestCount = 0;
        let sightingCount = 0;
        let poiCount = 0;
        let cameraCount = 0;

        features.forEach((f) => {
          const featureType = f.get("featureType");

          if (featureType === "poi") {
            poiCount++;
          } else if (featureType === "flockCamera") {
            cameraCount++;
          } else {
            const group = f.get("group");
            if (Array.isArray(group) && group[0]) {
              const activity = group[0].Activity;
              if (activity === "Arrest") {
                arrestCount++;
              } else if (
                activity === "Presence" ||
                activity === "Attempted Arrest"
              ) {
                sightingCount++;
              }
            }
          }
        });

        const hasIncidents = arrestCount > 0 || sightingCount > 0;

        // Camera-only cluster: teal border
        if (!hasIncidents && poiCount === 0 && cameraCount > 0) {
          return new Style({
            image: new CircleStyle({
              radius: 14,
              fill: new Fill({ color: "#2f549d" }),
              stroke: new Stroke({ color: "rgb(0, 128, 128)", width: 3 }),
            }),
            text: new Text({
              text: features.length.toString(),
              fill: new Fill({ color: "#fff" }),
              font: "bold 15px Montserrat, sans-serif",
            }),
          });
        }

        // POI-only cluster: purple border
        if (!hasIncidents && poiCount > 0 && cameraCount === 0) {
          return new Style({
            image: new CircleStyle({
              radius: 14,
              fill: new Fill({ color: "#2f549d" }),
              stroke: new Stroke({ color: "rgb(156, 79, 156)", width: 3 }),
            }),
            text: new Text({
              text: features.length.toString(),
              fill: new Fill({ color: "#fff" }),
              font: "bold 15px Montserrat, sans-serif",
            }),
          });
        }

        // Incident-dominant clusters (existing logic)
        if (arrestCount > sightingCount) {
          return new Style({
            image: new CircleStyle({
              radius: 14,
              fill: new Fill({ color: "#2f549d" }),
              stroke: new Stroke({ color: "#ff0000", width: 3 }),
            }),
            text: new Text({
              text: features.length.toString(),
              fill: new Fill({ color: "#fff" }),
              font: "bold 15px Montserrat, sans-serif",
            }),
          });
        }
        return new Style({
          image: new CircleStyle({
            radius: 14,
            fill: new Fill({ color: "#2f549d" }),
            stroke: new Stroke({ color: "#f1ff8a", width: 3 }),
          }),
          text: new Text({
            text: features.length.toString(),
            fill: new Fill({ color: "#fff" }),
            font: "bold 15px Montserrat, sans-serif",
          }),
        });
      };

      // Separate layer for secure circles (non-clustered)
      const circleSource = new VectorSource({ features: [] });
      circleSourceRef.current = circleSource;

      const circleLayer = new VectorLayer({
        source: circleSource,
        style: customStyle,
        properties: { name: "secureCircles" },
        updateWhileAnimating: true,
        renderBuffer: 500,
      });
      initialMap.addLayer(circleLayer);

      // Cluster layer
      const clusterLayer = new VectorLayer({
        source: clusterSource,
        style: clusterStyle,
        properties: { name: "clusters" },
        updateWhileAnimating: true,
        renderBuffer: 500,
      });
      initialMap.addLayer(clusterLayer);

      // --- Popup Logic for POIs and clusters ---
      initialMap.on("click", function (event) {
        let featureFound = false;
        initialMap.forEachFeatureAtPixel(
          event.pixel,
          function (feature, layer) {
            // Check secure circles layer
            if (layer && layer.get("name") === "secureCircles") {
              const featureType = feature.get("featureType");
              if (featureType === "secureCircle") {
                // Clicked on a secure circle - handle as incident
                const featureProps = feature.get("group") as PointData[];
                if (featureProps) {
                  setCurrentEvent(featureProps);
                  setCurrentPOI(null);
                  setCurrentFlockCamera(null);
                  setSidebarOpen(false);
                  featureFound = true;
                  // Force circle layer to redraw to show highlight
                  const circleLayer = initialMap
                    .getLayers()
                    .getArray()
                    .find((layer) => layer.get("name") === "secureCircles");
                  if (circleLayer) circleLayer.changed();
                  return true;
                }
              }
            }
            // Check cluster layer (POIs are now in cluster layer)
            if (layer && layer.get("name") === "clusters") {
              const clusterFeatures = feature.get("features");

              if (clusterFeatures && clusterFeatures.length === 1) {
                // Single feature - could be incident, POI, or Flock Camera
                const singleFeature = clusterFeatures[0];
                const featureType = singleFeature.get("featureType");

                if (featureType === "poi") {
                  // Handle POI selection
                  const poiData = singleFeature.get(
                    "poiData",
                  ) as PlaceOfInterest;
                  if (poiData) {
                    setCurrentPOI(poiData);
                    setCurrentEvent(null);
                    setCurrentFlockCamera(null);
                    setSidebarOpen(false);
                    featureFound = true;
                    // Force cluster layer to redraw to show highlight
                    const clusterLayer = initialMap
                      .getLayers()
                      .getArray()
                      .find((layer) => layer.get("name") === "clusters");
                    if (clusterLayer) clusterLayer.changed();
                    return true;
                  }
                } else if (featureType === "flockCamera") {
                  // Handle Flock Camera selection
                  const cameraData = singleFeature.get(
                    "flockCameraData",
                  ) as FlockCamera;
                  if (cameraData) {
                    setCurrentFlockCamera(cameraData);
                    setCurrentEvent(null);
                    setCurrentPOI(null);
                    setSidebarOpen(false);
                    featureFound = true;
                    // Force cluster layer to redraw
                    const clusterLayer = initialMap
                      .getLayers()
                      .getArray()
                      .find((layer) => layer.get("name") === "clusters");
                    if (clusterLayer) clusterLayer.changed();
                    return true;
                  }
                } else {
                  // Handle incident selection
                  const clickedGeometry = singleFeature.getGeometry();
                  const featureProps = singleFeature.get(
                    "group",
                  ) as PointData[];

                  if (clickedGeometry instanceof Point) {
                    setCurrentEvent(featureProps);
                    setCurrentPOI(null);
                    setCurrentFlockCamera(null);
                    setSidebarOpen(false);
                    featureFound = true;
                    // Force layers to redraw to show highlight
                    const clusterLayer = initialMap
                      .getLayers()
                      .getArray()
                      .find((layer) => layer.get("name") === "clusters");
                    if (clusterLayer) clusterLayer.changed();
                    const circleLayer = initialMap
                      .getLayers()
                      .getArray()
                      .find((layer) => layer.get("name") === "secureCircles");
                    if (circleLayer) circleLayer.changed();
                    return true;
                  }
                }
              } else if (clusterFeatures && clusterFeatures.length > 1) {
                // Multi-feature cluster - zoom to spread threshold to break it apart
                const clusterGeom = feature.getGeometry() as Point;
                const clusterCenter = clusterGeom.getCoordinates();

                // Zoom to at least the spread threshold
                const currentViewZoom = initialMap.getView().getZoom() || 0;
                const targetZoom = Math.max(
                  SPREAD_ZOOM_THRESHOLD,
                  currentViewZoom,
                );

                initialMap.getView().animate({
                  center: clusterCenter,
                  zoom: targetZoom,
                  duration: 700,
                });

                featureFound = true;
                return true;
              }
            }
          },
        );

        // If no cluster/POI point was clicked, check if a town polygon was clicked
        if (!featureFound) {
          initialMap.forEachFeatureAtPixel(
            event.pixel,
            function (feature, layer) {
              if (layer && layer.get("name") === "towns") {
                const townName = feature.get("TOWN");
                if (townName && onTownClick) {
                  const stats = townStats[townName];
                  onTownClick({
                    name: townName,
                    arrests: stats ? stats.arrests : 0,
                    detainers: stats ? stats.detainers : 0,
                  });
                  setCurrentEvent(null);
                  setCurrentPOI(null);
                  setCurrentFlockCamera(null);
                  setSidebarOpen(false);
                  featureFound = true;
                  return true;
                }
              }
            },
          );
        }

        // If clicking on truly empty map - clear all selections
        if (!featureFound) {
          setCurrentEvent(null);
          setCurrentPOI(null);
          setCurrentFlockCamera(null);
          if (onTownClick) onTownClick(null);
          // Force layers to redraw to remove highlight
          const clusterLayer = initialMap
            .getLayers()
            .getArray()
            .find((layer) => layer.get("name") === "clusters");
          if (clusterLayer) clusterLayer.changed();
          const circleLayer = initialMap
            .getLayers()
            .getArray()
            .find((layer) => layer.get("name") === "secureCircles");
          if (circleLayer) circleLayer.changed();
        }
      });
    }

    return () => {
      // Clean up wheel event listener
      const mapElement = mapRef.current;
      if (mapElement && wheelHandlerRef.current) {
        mapElement.removeEventListener("wheel", wheelHandlerRef.current);
      }

      if (mapObjRef.current) {
        mapObjRef.current.setTarget(undefined);
        mapObjRef.current
          .getOverlays()
          .forEach((overlay) => mapObjRef.current?.removeOverlay(overlay));
      }
    };
  }, [loading]);

  // Effect to track zoom level changes
  useEffect(() => {
    if (!mapObjRef.current) return;

    const view = mapObjRef.current.getView();
    const handleResolutionChange = () => {
      const zoom = view.getZoom() || 0;
      setCurrentZoom(zoom);
      // Only update threshold state when actually crossing the boundary
      const nowAbove = zoom >= SPREAD_ZOOM_THRESHOLD;
      setIsAboveSpreadThreshold((prev) => {
        if (prev !== nowAbove) return nowAbove;
        return prev;
      });
    };

    view.on("change:resolution", handleResolutionChange);
    handleResolutionChange(); // Set initial value

    return () => {
      view.un("change:resolution", handleResolutionChange);
    };
  }, [loading]); // Run after map is initialized

  // Effect to adjust cluster distance based on zoom level
  useEffect(() => {
    if (!clusterSourceRef.current || !mapObjRef.current) return;

    // When zoomed in past threshold, reduce cluster distance to allow spread points to stay separate
    if (isAboveSpreadThreshold) {
      clusterSourceRef.current.setDistance(5); // Even tighter clustering for honeycomb spread
    } else {
      clusterSourceRef.current.setDistance(30); // Normal clustering
    }

    // Trigger re-render of cluster layer
    const clusterLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "clusters");
    if (clusterLayer) clusterLayer.changed();
  }, [isAboveSpreadThreshold]);

  // Effect to re-apply filters when filter states or data changes
  useEffect(() => {
    if (!loading && mapObjRef.current) {
      applyFilters();
      console.log("filters applied");
    }
  }, [loading, applyFilters]); // filterText, showOnlyCircles, showOnlyPoints are now dependencies of applyFilters directly

  // Effect to re-apply spreading when crossing threshold
  useEffect(() => {
    if (!loading && mapObjRef.current) {
      applyFilters();
    }
  }, [isAboveSpreadThreshold]); // Re-spread only when crossing threshold

  // Effect to zoom to / highlight appropriate point when currentEvent changes
  useEffect(() => {
    console.log(currentEvent);
    if (mapObjRef.current && currentEvent) {
      // Only zoom to 14 if current zoom is less; otherwise keep current zoom
      const currentViewZoom = mapObjRef.current.getView().getZoom() || 0;
      const targetZoom = currentViewZoom >= 14 ? currentViewZoom : 14;

      // Scale offset based on zoom level (offsets calibrated for zoom 14)
      const zoomScale = Math.pow(2, 14 - targetZoom);

      let coordinates: import("ol/coordinate").Coordinate;
      if (isMobile) {
        coordinates = fromLonLat([
          currentEvent[0].RandomLongitude,
          currentEvent[0].RandomLatitude - 0.01 * zoomScale,
        ]);
      } else {
        coordinates = fromLonLat([
          currentEvent[0].RandomLongitude - 0.005 * zoomScale,
          currentEvent[0].RandomLatitude - 0.0025 * zoomScale,
        ]);
      }

      mapObjRef.current.getView().animate({
        center: coordinates,
        zoom: targetZoom,
        duration: 700,
      });
    }
    if (mapObjRef.current) {
      // Update layers to reflect change
      const clusterLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "clusters");
      if (clusterLayer) clusterLayer.changed();
      const circleLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "secureCircles");
      if (circleLayer) circleLayer.changed();
    }
  }, [currentEvent]);

  // Effect to zoom to POI when currentPOI changes
  useEffect(() => {
    console.log("currentPOI:", currentPOI);
    if (mapObjRef.current && currentPOI) {
      // Only zoom to 14 if current zoom is less; otherwise keep current zoom
      const currentViewZoom = mapObjRef.current.getView().getZoom() || 0;
      const targetZoom = currentViewZoom >= 14 ? currentViewZoom : 14;

      // Scale offset based on zoom level (offsets calibrated for zoom 14)
      const zoomScale = Math.pow(2, 14 - targetZoom);

      let coordinates: import("ol/coordinate").Coordinate;
      if (isMobile) {
        coordinates = fromLonLat([
          currentPOI.Longitude,
          currentPOI.Latitude - 0.01 * zoomScale,
        ]);
      } else {
        coordinates = fromLonLat([
          currentPOI.Longitude - 0.005 * zoomScale,
          currentPOI.Latitude - 0.0025 * zoomScale,
        ]);
      }

      mapObjRef.current.getView().animate({
        center: coordinates,
        zoom: targetZoom,
        duration: 700,
      });
    }

    if (mapObjRef.current) {
      // Redraw layers to show POI highlight
      const clusterLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "clusters");
      if (clusterLayer) clusterLayer.changed();
      const circleLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "secureCircles");
      if (circleLayer) circleLayer.changed();
    }
  }, [currentPOI, isMobile]);

  // Updating current event ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

  // Updating current POI ref
  useEffect(() => {
    currentPOIRef.current = currentPOI;
  }, [currentPOI]);

  // Updating current Flock Camera ref
  useEffect(() => {
    currentFlockCameraRef.current = currentFlockCamera;
  }, [currentFlockCamera]);

  // Effect to zoom to Flock Camera when currentFlockCamera changes
  useEffect(() => {
    console.log("currentFlockCamera:", currentFlockCamera);
    if (mapObjRef.current && currentFlockCamera) {
      // Only zoom to 14 if current zoom is less; otherwise keep current zoom
      const currentViewZoom = mapObjRef.current.getView().getZoom() || 0;
      const targetZoom = currentViewZoom >= 14 ? currentViewZoom : 14;

      // Scale offset based on zoom level (offsets calibrated for zoom 14)
      const zoomScale = Math.pow(2, 14 - targetZoom);

      let coordinates: import("ol/coordinate").Coordinate;
      if (isMobile) {
        coordinates = fromLonLat([
          currentFlockCamera.Longitude,
          currentFlockCamera.Latitude - 0.01 * zoomScale,
        ]);
      } else {
        coordinates = fromLonLat([
          currentFlockCamera.Longitude - 0.005 * zoomScale,
          currentFlockCamera.Latitude - 0.0025 * zoomScale,
        ]);
      }

      mapObjRef.current.getView().animate({
        center: coordinates,
        zoom: targetZoom,
        duration: 700,
      });
    }

    if (mapObjRef.current) {
      // Redraw layers to show Flock Camera highlight
      const clusterLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "clusters");
      if (clusterLayer) clusterLayer.changed();
      const circleLayer = mapObjRef.current
        .getLayers()
        .getArray()
        .find((layer) => layer.get("name") === "secureCircles");
      if (circleLayer) circleLayer.changed();
    }
  }, [currentFlockCamera, isMobile]);

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
    </>
  );
};

export default OLMap;
