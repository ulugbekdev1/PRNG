import React from "react";
import Sidebar from "./components/Sidebar";
import RandomLab from "./components/RandomLab";
import "./App.css";

export default function App() {
  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        <RandomLab />
      </main>
    </div>
  );
}
