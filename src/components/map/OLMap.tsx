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

import { PointData } from "@/components/map/MapSection";

// Define props for OLMap component
interface OLMapProps {
  filteredGroups: PointData[][];
  currentEvent: PointData[] | null;
  setCurrentEvent: (event: PointData[] | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

const OLMap: React.FC<OLMapProps> = ({
  filteredGroups,
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  loading,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<Map | null>(null);
  const currentEventRef = useRef<PointData[] | null>(null);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
          try {
            const data = JSON.parse(point.StreetGeom);
            if (data && Array.isArray(data.elements)) {
              data.elements.forEach((el) => {
                const geometryArr = el.geometry;
                if (Array.isArray(geometryArr) && geometryArr.length > 1) {
                  const coordinates = geometryArr.map((pt) =>
                    fromLonLat([pt.lon, pt.lat])
                  );
                  const line = new LineString(coordinates);
                  const lineFeature = new Feature({
                    geometry: line,
                    featureType: "street",
                    Activity: point.Activity || "arrest", // set Activity for styling
                    id: point.id, // <-- add id for highlight
                  });
                  features.push(lineFeature);
                }
              });
            }
          } catch (e) {
            console.error("Invalid StreetGeom JSON:", e);
          }
        }

        const coordinates = [point.RandomLongitude, point.RandomLatitude];
        const transformedCenter = fromLonLat(coordinates);

        if (point.Sec === true && !point.OnlyStreet) {
          // Add the circle feature

          const radius = point.Radius + 0.05 || 2.0;

          // Convert to meters/map units
          const map_units = radius * 1609.34;

          const circleGeometry = new Circle(transformedCenter, map_units);
          features.push(
            new Feature({
              geometry: circleGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "circle",
              id: point.id,
            })
          );
          // Add the point feature (the "double")
          const pointGeometry = new Point(transformedCenter);
          features.push(
            new Feature({
              geometry: pointGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "hiddenPoint",
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
            })
          );
        }
      });
      vectorSource.addFeatures(features);
    }
  }, [filteredGroups]);
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
        if (
          currentEventRef.current &&
          Array.isArray(currentEventRef.current) &&
          currentEventRef.current[0]?.id &&
          currentEventRef.current[0]?.id === feature.get("id")
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
      initialMap.on("click", function (event) {
        let featureFound = false;
        let featureCoordinates;

        initialMap.forEachFeatureAtPixel(
          event.pixel,
          function (feature, layer) {
            if (layer && layer.get("name") === "markers") {
              const clickedGeometry = feature.getGeometry();
              const featureProps = feature.get("group") as PointData[];

              if (clickedGeometry instanceof Point) {
                featureCoordinates = clickedGeometry.getCoordinates();
              } else if (clickedGeometry instanceof Circle) {
                featureCoordinates = clickedGeometry.getCenter();
              }

              if (featureCoordinates) {
                setCurrentEvent(featureProps);
                setSidebarOpen(false);
                featureFound = true;
                return true;
              }
            }
          }
        );
        if (!featureFound) {
          setCurrentEvent(null);
        }
      });
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
      // Use Coordinate type to match fromLonLat return type
      // zoom into "leader" point
      let coordinates: import("ol/coordinate").Coordinate;
      if (isMobile) {
        coordinates = fromLonLat([
          currentEvent[0].RandomLongitude,
          currentEvent[0].RandomLatitude - 0.01,
        ]);
      } else {
        coordinates = fromLonLat([
          currentEvent[0].RandomLongitude - 0.005,
          currentEvent[0].RandomLatitude - 0.0025,
        ]);
      }

      mapObjRef.current.getView().animate({
        center: coordinates,
        zoom: 14,
        duration: 700,
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
