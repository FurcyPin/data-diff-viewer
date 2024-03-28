import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import DiffReport from "./react_components";

window.addEventListener("DOMContentLoaded", function (e) {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <div id="main" className="main">
      <DiffReport />
    </div>,
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
