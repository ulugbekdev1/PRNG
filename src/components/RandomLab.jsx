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
  const [generating, setGenerating] = useState(false);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (type === "mt") setMt(new MersenneTwister(seed));
  }, [type, seed]);

  // Sonlarni animatsion tarzda generatsiya qilish
  function generateNumbersAnimated() {
    setNumbers([]);
    setGenerating(true);
    let out = [];
    let g;
    if (type === "mt") g = mt || new MersenneTwister(seed);

    let i = 0;
    const step = () => {
      if (i >= count) {
        setGenerating(false);
        drawChart(out);
        return;
      }
      let val;
      if (type === "mt") val = g.random();
      else if (type === "lcg") val = generateLCG(seed, 1)[0];
      else if (type === "webcrypto" || type === "trng") val = generateTRNG(1)[0];

      out.push(val);
      setNumbers([...out]);
      drawChart(out);
      i++;
      requestAnimationFrame(step);
    };
    step();
  }

  function drawChart(data) {
    const ctx = document.getElementById("chart").getContext("2d");
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          label: `${type.toUpperCase()} qiymatlar (0..1)`,
          data,
          borderWidth: 2,
          pointRadius: 0,
          borderColor:
            type === "mt" ? "#3b82f6" :
            type === "lcg" ? "#f97316" :
            type === "webcrypto" ? "#10b981" : "#8b5cf6"
        }],
      },
      options: { scales: { y: { min: 0, max: 1 } }, responsive: true, animation: false },
    });
  }

  const stats = numbers.length ? {
    mean: computeMean(numbers),
    variance: computeVariance(numbers),
    chi: chiSquareTest(numbers, 10)
  } : null;

  return (
    <div className="randomlab-container">
      <h1>PRNG / TRNG Lab </h1>

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
  <input
    type="number"
    value={seed}
    onChange={(e) => {
      const val = e.target.value;

      // Bo‘sh bo‘lsa — hech narsa qilmaymiz
      if (val === "") {
        setSeed("");
        return;
      }

      // Sonni numberga o‘tkazamiz
      let num = Number(val);

      // 32-bit diapazonini tekshiramiz
      if (num < 0) num = 0;
      if (num > 0xffffffff) num = 0xffffffff;

      setSeed(num);
    }}
    disabled={type === "trng" || type === "webcrypto"}
  />
</div>

        <div className="control">
          <label>Soni:</label>
          <input type="number" min={1} max={5000} value={count} onChange={e => setCount(Number(e.target.value) || 1)} />
        </div>
      </div>

      <div className="buttons">
        <button onClick={generateNumbersAnimated} disabled={generating}>{generating ? "Generatsiya qilinmoqda..." : "Generatsiya qilish"}</button>
        <button onClick={() => { setNumbers([]); if (chartInstance.current) chartInstance.current.destroy(); }}>Tozalash</button>
      </div>

      <canvas id="chart" width="900" height="300"></canvas>

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
        <div className="summary">
  <h3>Yakuniy xulosa</h3>

  {stats ? (
    <div>

      {/* === TASODIFIYLIK INDIKATORI (YASHIL / QIZIL) === */}
      <div 
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          marginBottom: "10px",
          background: stats.chi.pass ? "#22c55e" : "#ef4444"
        }}
      ></div>

      {/* === ASOSIY XULOSA === */}
      <p style={{ fontWeight: "bold", fontSize: "17px" }}>
        {stats.chi.pass 
          ? "➤ Xulosa: Ketma-ketlik tasodifiylikka yaqin." 
          : "➤ Xulosa: Ketma-ketlik tasodifiy emas."}
      </p>

      {/* === RANDOMNESS SCORE % === */}
      <p>
        Randomness Score:{" "}
        <b>
          {Math.max(
            0,
            Math.min(
              100,
              100 - Math.abs(stats.mean - 0.5) * 200 - Math.abs(stats.variance - 1/12) * 1000
            )
          ).toFixed(1)}%
        </b>
      </p>

      {/* === STATISTIK KO‘RSATKICHLAR === */}
      <p>O‘rtacha qiymat: <b>{stats.mean.toFixed(5)}</b> (ideal: 0.5)</p>
      <p>Dispersiya: <b>{stats.variance.toFixed(5)}</b> (ideal: ≈0.08333)</p>
      <p>Chi-square: <b>{stats.chi.chi2.toFixed(4)}</b></p>

      {/* === GENERATOR TURIGA QARAB IZOH === */}
      <div className="gen-comment">
        <h4>Generator haqida izoh:</h4>
        {type === "mt" && (
          <p>
            Mersenne Twister — juda tez va sifatli PRNG. Statistik jihatdan 
            ko‘p hollarda tasodifiylikka juda yaqin bo‘ladi, lekin kriptografik emas.
          </p>
        )}
        {type === "lcg" && (
          <p>
            LCG — eng sodda generator. Tez ishlaydi, lekin uzun muddatli tasodifiylik
            sifati past. Chi-square testda ko‘pincha muvaffaqiyatsiz bo‘ladi.
          </p>
        )}
        {type === "webcrypto" && (
          <p>
            Web Crypto — brauzer darajasidagi kriptografik generator. Juda 
            sifatli, xavfsiz va haqiqiy tasodifiylikka eng yaqin.
          </p>
        )}
        {type === "trng" && (
          <p>
            TRNG — tizimdagi fizika jarayonlariga asoslangan haqiqiy tasodifiy.
            Statistika natijalari doimo ancha yaxshi chiqadi.
          </p>
        )}
      </div>
    </div>
  ) : (
    <div className="placeholder">Yakuniy xulosa uchun avval sonlar generatsiya qiling.</div>
  )}
</div>

      </div>
    </div>
  );
}
