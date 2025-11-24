// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; // agar kerak bo'lsa

createRoot(document.getElementById("root")).render(<App />);
