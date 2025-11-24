import React, { useState, useRef, useEffect } from "react";
import { MersenneTwister } from "../utils/MersenneTwister";
import { computeMean, computeVariance, chiSquareTest } from "../utils/Stats";
import Chart from "chart.js/auto";
import "./Random.css";

// TRNG yordamchi funksiyasi
function generateTRNG(count) {
  const arr = new Uint32Array(count);
  window.crypto.getRandomValues(arr);
  return Array.from(arr).map(v => v / 4294967296);
}

// LCG PRNG
function generateLCG(seed, count) {
  const a = 1664525, c = 1013904223, m = 2 ** 32;
  let x = seed >>> 0;
  const out = [];
  for (let i = 0; i < count; i++) {
    x = (Math.imul(a, x) + c) >>> 0;
    out.push(x / m);
  }
  return out;
}

export default function RandomLab() {
  const [type, setType] = useState("mt");
  const [seed, setSeed] = useState(Date.now() % 4294967296);
  const [count, setCount] = useState(200);
  const [numbers, setNumbers] = useState([]);
  const [mt, setMt] = useState(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (type === "mt") setMt(new MersenneTwister(seed));
  }, [type, seed]);

  function generateNumbers() {
    let out = [];
    if (type === "mt") {
      const g = mt || new MersenneTwister(seed);
      for (let i = 0; i < count; i++) out.push(g.random());
    } else if (type === "lcg") {
      out = generateLCG(seed, count);
    } else if (type === "webcrypto" || type === "trng") {
      out = generateTRNG(count);
    }
    setNumbers(out);
    drawChart(out);
  }

  function drawChart(data) {
    const ctx = document.getElementById("chart").getContext("2d");
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{ label: `${type.toUpperCase()} qiymatlar (0..1)`, data, borderWidth: 2, pointRadius: 0, borderColor: "#3b82f6" }],
      },
      options: { scales: { y: { min: 0, max: 1 } }, responsive: true, animation: false },
    });
  }

  const stats = numbers.length ? { mean: computeMean(numbers), variance: computeVariance(numbers), chi: chiSquareTest(numbers, 10) } : null;

  return (
    <div className="container">
      <h1>PRNG / TRNG Lab</h1>
      <div className="controls">
        <div className="control">
          <label>Generator turi:</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="mt">Mersenne Twister (MT19937)</option>
            <option value="lcg">LCG</option>
            <option value="webcrypto">Web Crypto (CSPRNG)</option>
            <option value="trng">TRNG (Haqiqiy tasodifiy)</option>
          </select>
        </div>
        <div className="control">
          <label>Seed (32-bit):</label>
          <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} disabled={type === "trng" || type === "webcrypto"} />
        </div>
        <div className="control">
          <label>Soni:</label>
          <input type="number" min={1} max={5000} value={count} onChange={e => setCount(Number(e.target.value) || 1)} />
        </div>
      </div>
      <div className="buttons">
        <button onClick={generateNumbers}>Generatsiya qilish</button>
        <button onClick={() => { setNumbers([]); if (chartInstance.current) chartInstance.current.destroy(); }}>Tozalash</button>
      </div>
      <canvas id="chart" width="900" height="250"></canvas>
      <div className="results">
        <div className="values">
          <h3>So‘ngi {numbers.length} ta qiymat</h3>
          <div className="box">
            {numbers.length === 0 ? <div className="placeholder">Hozircha sonlar yo‘q — Generate qiling.</div> :
              <ol>{numbers.slice(0, 200).map((v,i)=><li key={i}>{v.toFixed(6)}</li>)}</ol>}
          </div>
        </div>
        <div className="stats">
          <h3>Statistika</h3>
          {stats ? (
            <div>
              <div>O‘rtacha: <b>{stats.mean.toFixed(6)}</b></div>
              <div>Dispersiya: <b>{stats.variance.toFixed(6)}</b></div>
              <div>Chi-square (10 bin): <b>{stats.chi.chi2.toFixed(4)}</b></div>
            </div>
          ) : (<div className="placeholder">Natijalar — Generate qiling.</div>)}
        </div>
      </div>
    </div>
  );
}
