import React from "react";
import "./Sidebar.css";

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <div className="sidebar">
      <h2>RandomLab</h2>
      <ul>
        <li>
          <a
            href="#"
            className={activeTab === "prng" ? "active" : ""}
            onClick={e => { e.preventDefault(); onTabChange("prng"); }}
          >
            PRNG / TRNG Lab
          </a>
        </li>
        <li>
          <a
            href="#"
            className={activeTab === "crypto" ? "active" : ""}
            onClick={e => { e.preventDefault(); onTabChange("crypto"); }}
          >
            Kriptografiya Lab
          </a>
        </li>
      </ul>
    </div>
  );
}