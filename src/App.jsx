import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import RandomLab from "./components/RandomLab";
import CryptoLab from "./components/CryptoLab";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("prng");

  return (
    <div className="layout">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="content">
        {tab === "prng"   && <RandomLab />}
        {tab === "crypto" && <CryptoLab />}
      </main>
    </div>
  );
}