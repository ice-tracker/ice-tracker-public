import {
  Style,
  Circle as CircleStyle,
  RegularShape,
  Fill,
  Stroke,
  Icon,
} from "ol/style";

// Street styles
const arrestStreetStyle = [
  // Border
  new Style({
    stroke: new Stroke({
      color: "black",
      width: 5, // wider for border
    }),
  }),

  // Street
  new Style({
    stroke: new Stroke({
      color: "rgb(255, 0, 0)",
      width: 3,
    }),
  }),
];

const presenceStreetStyle = [
  // Border
  new Style({
    stroke: new Stroke({
      color: "black",
      width: 5, // wider for border
    }),
  }),

  // Street
  new Style({
    stroke: new Stroke({
      color: "rgb(241, 255, 138)",
      width: 3,
    }),
  }),
];

const attemptedStreetStyle = [
  // Border
  new Style({
    stroke: new Stroke({
      color: "black",
      width: 5, // wider for border
    }),
  }),

  // Street
  new Style({
    stroke: new Stroke({
      color: "rgb(255, 143, 6)",
      width: 3,
    }),
  }),
];

const pointRadius = 7;

const highlight = new Style({
  image: new CircleStyle({
    radius: pointRadius + 16, // slightly larger than base
    fill: new Fill({ color: "rgba(0,0,0,0)" }), // transparent fill
    stroke: new Stroke({
      color: "#1976d2", // blue border
      width: 4,
    }),
  }),
});

const highlightCircle = new Style({
  stroke: new Stroke({
    color: "#1976d2", // blue border
    width: 5,
  }),
  fill: new Fill({
    color: "rgba(0,0,0,0)", // transparent fill
  }),
});

// Arrests
const arrestStyle = new Style({
  image: new Icon({
    src: "/favicon.ico", // Use favicon as the icon
    scale: 0.08, // Adjust scale as needed
    anchor: [0.5, 1], // Center bottom anchor
  }),
});

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
    color: "rgb(241, 255, 138, 0.5)",
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
    color: "rgb(255, 143, 6, 0.5)",
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
    color: "rgb(11, 37, 209, 0.6)",
  }),
  stroke: new Stroke({
    color: "black",
    width: 1,
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

export const styles = {
  arrest: arrestIconStyle,
  arrestCircle: arrestCircleStyle,
  arrestIcon: arrestIconStyle,
  presence: presenceIconStyle,
  presenceCircle: presenceCircleStyle,
  attempted: attemptedIconStyle,
  attemptedCircle: attemptedCircleStyle,
  other: otherStyle,
  otherCircle: otherCircleStyle,
  highlight: highlight,
  highlightCircle: highlightCircle,
  arrestStreet: arrestStreetStyle,
  presenceStreet: presenceStreetStyle,
  attemptedStreet: attemptedStreetStyle,
};
