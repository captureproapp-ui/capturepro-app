// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { probeEnvironment, logEnvironmentStatus, isDebugEnabled } from "./lib/env";
import "./index.css";

if (typeof window !== "undefined") {
  (window as any).__debugEnv = () => {
    console.clear();
    probeEnvironment();
    logEnvironmentStatus(true);
  };

  if (isDebugEnabled()) {
    console.log("🔍 Debug mode enabled. Run __debugEnv() in console for environment probe.");
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);