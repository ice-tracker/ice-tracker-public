import {
  Style,
  Circle as CircleStyle,
  RegularShape,
  Fill,
  Stroke,
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
    radius: pointRadius + 4, // slightly larger than base
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
  image: new CircleStyle({
    radius: pointRadius,
    fill: new Fill({
      color: "rgba(255, 0, 0, 1)",
    }),
    stroke: new Stroke({
      color: "black",
      width: 1.5,
    }),
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

export const styles = {
  arrest: arrestStyle,
  arrestCircle: arrestCircleStyle,
  presence: presenceStyle,
  presenceCircle: presenceCircleStyle,
  attempted: atttemptedStyle,
  attemptedCircle: attemptedCircleStyle,
  other: otherStyle,
  otherCircle: otherCircleStyle,
  highlight: highlight,
  highlightCircle: highlightCircle,
  arrestStreet: arrestStreetStyle,
  presenceStreet: presenceStreetStyle,
  attemptedStreet: attemptedStreetStyle,
};
