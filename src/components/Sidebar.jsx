import React from "react";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2>RandomLab</h2>

      <ul>
        <li><a href="#">Bosh sahifa</a></li>
        <li><a href="#">PRNG</a></li>
        <li><a href="#">TRNG</a></li>
        <li><a href="#">Statistika</a></li>
        <li><a href="#">Grafiklar</a></li>
      </ul>
    </div>
  );
}
