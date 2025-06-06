import React from "react";

const Legend: React.FC = () => (
  <div
    style={{
      position: "absolute",
      background: "rgba(255,255,255,0.97)",
      right: 20,
      top: 20,
      zIndex: 200,
      minHeight: "auto",
      minWidth: "160px",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      padding: "12px 12px 12px 20px", // top right bottom left
      fontSize: "1em",
      color: "#222",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span
        style={{
          display: "inline-block",
          width: "18px",
          height: "18px",
          background: "#e53935",
          borderRadius: "50%",
          border: "2px solid #b71c1c",
        }}
      ></span>
      Arrest
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span
        style={{
          display: "inline-block",
          width: "18px",
          height: "18px",
          background: "#ff9100",
          borderRadius: "50%",
          border: "2px solid #ff6d00",
        }}
      ></span>
      <span>
        Attempted <br /> Abduction
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span
        style={{
          display: "inline-block",
          width: "18px",
          height: "18px",
          background: "#ffd600",
          borderRadius: "50%",
          border: "2px solid #ffab00",
        }}
      ></span>
      Presence
    </div>
  </div>
);

export default Legend;
