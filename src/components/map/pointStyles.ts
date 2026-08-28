import {
  Style,
  Circle as CircleStyle,
  Fill,
  Stroke,
  Icon,
} from "ol/style";

const pointRadius = 7;

// One colour for every "this is the thing you selected" ring — report points,
// POIs, Flock cameras, secure-location circles and cluster bubbles alike.
// Kept as a single exported constant so the point rings and OLMap's
// cluster-bubble ring can't drift apart.
//
// Orange, arrived at by elimination: blue reads as chrome here (navy cluster
// bubbles, blue town outlines and tier strokes), and red collides with the
// arrest marker's red background and the arrest wedge in the cluster donut.
// Orange is distinct from every colour that actually renders — arrest red,
// sighting/attempted yellow, POI purple, camera teal.
export const SELECTION_COLOR = "#ff9600";

const highlight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 16, // slightly larger than base
    fill: new Fill({ color: "rgba(0,0,0,0)" }), // transparent fill
    stroke: new Stroke({
      color: SELECTION_COLOR,
      width: 4,
    }),
  }),
});

// Smaller highlight ring used only when the selected point is part of a
// fully-coincident-coordinate cluster's spiral expansion (see OLMap.tsx's
// spiralExpansionActiveRef) — spiral-expanded points can be as little as
// ~35px apart, so the normal 50px-diameter ring above would overlap
// neighboring points. See MOBILEVIEWIMPROVEMENT.md item #14.
const highlightTight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 3, // ~10px
    fill: new Fill({ color: "rgba(0,0,0,0)" }),
    stroke: new Stroke({
      color: SELECTION_COLOR,
      width: 2,
    }),
  }),
});

const highlightCircle = new Style({
  stroke: new Stroke({
    color: SELECTION_COLOR,
    width: 5,
  }),
  fill: new Fill({
    color: "rgba(0,0,0,0)", // transparent fill
  }),
});

// Arrests
const arrestCircleStyle = new Style({
  fill: new Fill({
    color: "rgba(255, 0, 0, 0.5)",
  }),
  stroke: new Stroke({
    color: "black",
    width: 1,
  }),
});

// Presence (Sightings)
const presenceStyle = new Style({
  image: new CircleStyle({
    radius: pointRadius,
    fill: new Fill({
      color: "rgb(241, 255, 138)",
    }),
    stroke: new Stroke({
      color: "black",
      width: 1.5,
    }),
  }),
});

const presenceCircleStyle = new Style({
  fill: new Fill({
    color: "rgba(241, 255, 138, 0.5)",
  }),
  stroke: new Stroke({
    color: "black",
    width: 1,
  }),
});

// Attempted Arrests
const atttemptedStyle = new Style({
  image: new CircleStyle({
    radius: pointRadius,
    fill: new Fill({
      color: "rgb(255, 143, 6)",
    }),
    stroke: new Stroke({
      color: "black",
      width: 1.5,
    }),
  }),
});

const attemptedCircleStyle = new Style({
  fill: new Fill({
    color: "rgba(255, 143, 6, 0.5)",
  }),
  stroke: new Stroke({
    color: "black",
    width: 1,
  }),
});

// Other
const otherStyle = new Style({
  image: new CircleStyle({
    radius: pointRadius,
    fill: new Fill({
      color: "rgb(11, 37, 209)",
    }),
    stroke: new Stroke({
      color: "black",
      width: 1.5,
    }),
  }),
});

const otherCircleStyle = new Style({
  fill: new Fill({
    color: "rgba(11, 37, 209, 0.6)",
  }),
  stroke: new Stroke({
    color: "black",
    width: 1,
  }),
});

// Place of Interest (POI)
const poiStyle = new Style({
  image: new CircleStyle({
    radius: pointRadius,
    fill: new Fill({
      color: "rgb(128, 0, 128)", // Purple
    }),
    stroke: new Stroke({
      color: "black",
      width: 1.5,
    }),
  }),
});

// POI icon style with purple background and landmark icon
const poiIconStyle = [
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 12,
      fill: new Fill({ color: "rgb(156, 79, 156)" }), // Purple
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 9,
      fill: new Fill({ color: "rgb(58, 58, 58)" }),
    }),
  }),
  new Style({
    image: new Icon({
      src: "/map-icons/landmark-icon.svg",
      scale: 0.9,
    }),
  }),
];

const poiHighlight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 16,
    fill: new Fill({ color: "rgba(0,0,0,0)" }),
    stroke: new Stroke({
      color: SELECTION_COLOR,
      width: 4,
    }),
  }),
});

// See highlightTight above — same rationale, for POI markers.
const poiHighlightTight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 3,
    fill: new Fill({ color: "rgba(0,0,0,0)" }),
    stroke: new Stroke({
      color: SELECTION_COLOR,
      width: 2,
    }),
  }),
});

// Sample icon for arrests with red circle background
const arrestIconStyle = [
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 12,
      fill: new Fill({ color: "rgba(255, 0, 0, 1)" }), // Red
      // stroke: new Stroke({ color: "black", width: 1.5 }),
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 9,
      fill: new Fill({ color: "rgb(58, 58, 58)" }), //
      // stroke: new Stroke({ color: "black", width: 5 }),
    }),
  }),
  new Style({
    image: new Icon({
      src: "/map-icons/cuff-icon.png",
      scale: 0.018,
    }),
  }),
];

// Sample icon for presence with yellow circle background
const presenceIconStyle = [
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 12,
      fill: new Fill({ color: "rgb(241, 255, 138)" }), // Yellow
      // stroke: new Stroke({ color: "black", width: 5 }),
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 9,
      fill: new Fill({ color: "rgb(58, 58, 58)" }), //
      // stroke: new Stroke({ color: "black", width: 4 }),
    }),
  }),
  new Style({
    image: new Icon({
      src: "/map-icons/eye2-icon.png",
      scale: 0.018,
    }),
  }),
];

// Sample icon for attempted with orange circle background
const attemptedIconStyle = [
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 12,
      fill: new Fill({ color: "rgb(241, 255, 138)" }), // Yellow
      // stroke: new Stroke({ color: "black", width: 5 }),
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 9,
      fill: new Fill({ color: "rgb(58, 58, 58)" }),
    }),
  }),
  new Style({
    image: new Icon({
      src: "/map-icons/broken-icon.png",
      scale: 0.018,
    }),
  }),
];

// Flock Camera icon style with teal background and camera icon
const flockCameraIconStyle = [
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 12,
      fill: new Fill({ color: "rgb(0, 128, 128)" }), // Teal
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: pointRadius + 9,
      fill: new Fill({ color: "rgb(58, 58, 58)" }),
    }),
  }),
  new Style({
    image: new Icon({
      src: "/map-icons/camera-icon.svg",
      scale: 0.9,
    }),
  }),
];

const flockCameraHighlight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 16,
    fill: new Fill({ color: "rgba(0,0,0,0)" }),
    stroke: new Stroke({
      color: SELECTION_COLOR,
      width: 4,
    }),
  }),
});

// See highlightTight above — same rationale, for Flock Camera markers.
const flockCameraHighlightTight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 3,
    fill: new Fill({ color: "rgba(0,0,0,0)" }),
    stroke: new Stroke({
      color: SELECTION_COLOR,
      width: 2,
    }),
  }),
});

// Secure location styles
const secureOverlayStyle = new Style({
  image: new Icon({
    src: "/map-icons/shield-icon.svg",
    scale: 0.35,
    anchor: [0.85, 0.15], // Top-right corner
  }),
});

const secureCircleStyle = new Style({
  fill: new Fill({
    color: "rgba(100, 149, 237, 0.15)",
  }),
  stroke: new Stroke({
    color: "rgba(100, 149, 237, 0.5)",
    width: 2,
    lineDash: [8, 4],
  }),
});

export const styles = {
  // Abduction reuses the red/cuff icon previously used for "Arrest"; Sighting
  // reuses the yellow/eye icon previously used for "Presence". The old
  // arrest/presence/attempted/other keys are kept below only so nothing
  // throws if stale data still carries a legacy Activity value.
  abduction: arrestIconStyle,
  abductionCircle: arrestCircleStyle,
  sighting: presenceIconStyle,
  sightingCircle: presenceCircleStyle,
  arrest: arrestIconStyle,
  arrestCircle: arrestCircleStyle,
  arrestIcon: arrestIconStyle,
  presence: presenceIconStyle,
  presenceCircle: presenceCircleStyle,
  attempted: attemptedIconStyle,
  attemptedCircle: attemptedCircleStyle,
  other: otherStyle,
  otherCircle: otherCircleStyle,
  poi: poiIconStyle,
  poiIcon: poiIconStyle,
  poiHighlight: poiHighlight,
  poiHighlightTight: poiHighlightTight,
  flockCamera: flockCameraIconStyle,
  flockCameraIcon: flockCameraIconStyle,
  flockCameraHighlight: flockCameraHighlight,
  flockCameraHighlightTight: flockCameraHighlightTight,
  highlight: highlight,
  highlightTight: highlightTight,
  highlightCircle: highlightCircle,
  secureOverlay: secureOverlayStyle,
  secureCircle: secureCircleStyle,
};
