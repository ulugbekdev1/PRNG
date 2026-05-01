import React, { useState, useRef, useEffect } from "react";
import Chart from "chart.js/auto";
import "./CryptoLab.css";

const ALGOS = [
  { id: "aes-gcm-128",   label: "AES-GCM",   keyBits: 128,  type: "AES-GCM",  asym: false, sec: 4, secLabel: "Yuqori",      color: "#3b82f6", use: "Umumiy shifrlash, HTTPS" },
  { id: "aes-gcm-256",   label: "AES-GCM",   keyBits: 256,  type: "AES-GCM",  asym: false, sec: 5, secLabel: "Juda yuqori", color: "#06b6d4", use: "Bank, harbiy tizimlar" },
  { id: "aes-cbc-128",   label: "AES-CBC",   keyBits: 128,  type: "AES-CBC",  asym: false, sec: 3, secLabel: "O'rta",       color: "#f97316", use: "Fayl shifrlash" },
  { id: "aes-cbc-256",   label: "AES-CBC",   keyBits: 256,  type: "AES-CBC",  asym: false, sec: 4, secLabel: "Yuqori",      color: "#eab308", use: "Disk shifrlash (BitLocker)" },
  { id: "aes-ctr-128",   label: "AES-CTR",   keyBits: 128,  type: "AES-CTR",  asym: false, sec: 3, secLabel: "O'rta",       color: "#8b5cf6", use: "Stream shifrlash" },
  { id: "aes-ctr-256",   label: "AES-CTR",   keyBits: 256,  type: "AES-CTR",  asym: false, sec: 4, secLabel: "Yuqori",      color: "#a855f7", use: "Tarmoq protokollari" },
  { id: "rsa-oaep-2048", label: "RSA-OAEP",  keyBits: 2048, type: "RSA-OAEP", asym: true,  sec: 5, secLabel: "Juda yuqori", color: "#ef4444", use: "Kalit almashuv, SSL" },
  { id: "rsa-oaep-4096", label: "RSA-OAEP",  keyBits: 4096, type: "RSA-OAEP", asym: true,  sec: 5, secLabel: "Juda yuqori", color: "#dc2626", use: "Hukumat, maxfiy hujjatlar" },
];

const DATA_SIZES = [
  { label: "1 KB",   bytes: 1024 },
  { label: "10 KB",  bytes: 10240 },
  { label: "100 KB", bytes: 102400 },
];

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function runBenchmark(algo, dataBytes, repeats = 3) {
  try {
    const rawLen = algo.asym ? Math.min(dataBytes, 190) : dataBytes;
    const rawData = crypto.getRandomValues(new Uint8Array(rawLen));

    let key;
    if (algo.type === "AES-GCM") {
      key = await crypto.subtle.generateKey({ name: "AES-GCM", length: algo.keyBits }, false, ["encrypt", "decrypt"]);
    } else if (algo.type === "AES-CBC") {
      key = await crypto.subtle.generateKey({ name: "AES-CBC", length: algo.keyBits }, false, ["encrypt", "decrypt"]);
    } else if (algo.type === "AES-CTR") {
      key = await crypto.subtle.generateKey({ name: "AES-CTR", length: algo.keyBits }, false, ["encrypt", "decrypt"]);
    } else {
      key = await crypto.subtle.generateKey({
        name: "RSA-OAEP", modulusLength: algo.keyBits,
        publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256",
      }, false, ["encrypt", "decrypt"]);
    }

    let totalEnc = 0, totalDec = 0, lastCipher = null;

    for (let r = 0; r < repeats; r++) {
      let ep, dp;
      if (algo.type === "AES-GCM") {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        ep = { name: "AES-GCM", iv }; dp = { name: "AES-GCM", iv };
      } else if (algo.type === "AES-CBC") {
        const iv = crypto.getRandomValues(new Uint8Array(16));
        ep = { name: "AES-CBC", iv }; dp = { name: "AES-CBC", iv };
      } else if (algo.type === "AES-CTR") {
        const counter = crypto.getRandomValues(new Uint8Array(16));
        ep = { name: "AES-CTR", counter, length: 64 };
        dp = { name: "AES-CTR", counter, length: 64 };
      } else {
        ep = { name: "RSA-OAEP" }; dp = { name: "RSA-OAEP" };
      }

      const encKey = algo.asym ? key.publicKey : key;
      const decKey = algo.asym ? key.privateKey : key;

      const t0 = performance.now();
      const cipher = await crypto.subtle.encrypt(ep, encKey, rawData);
      totalEnc += performance.now() - t0;

      const t1 = performance.now();
      await crypto.subtle.decrypt(dp, decKey, cipher);
      totalDec += performance.now() - t1;

      if (r === 0) lastCipher = cipher;
    }

    const b64 = toBase64(lastCipher);
    return {
      ok: true,
      encMs: parseFloat((totalEnc / repeats).toFixed(2)),
      decMs: parseFloat((totalDec / repeats).toFixed(2)),
      totMs: parseFloat(((totalEnc + totalDec) / repeats).toFixed(2)),
      cipherB64: b64.slice(0, 120) + (b64.length > 120 ? "…" : ""),
      inputBytes: rawLen,
      outputBytes: lastCipher.byteLength,
    };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

function Dots({ count, total = 5, color = "#22c55e" }) {
  return (
    <span>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="cl-dot" style={{ color: i < count ? color : "#e2e8f0" }}>●</span>
      ))}
    </span>
  );
}

export default function CryptoLab() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [plaintext, setPlaintext] = useState("Salom! Bu shifrlash testi. Hello World 🔐");
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [curId, setCurId]       = useState(null);
  const [results, setResults]   = useState({});
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const done = ALGOS.map(a => results[a.id]).filter(r => r?.ok);

  useEffect(() => {
    if (done.length && chartRef.current) drawChart();
  }, [results]);

  async function start() {
    setRunning(true);
    setResults({});
    setProgress(0);
    setCurId(null);

    const bytes = DATA_SIZES[sizeIdx].bytes;
    const res   = {};

    for (let i = 0; i < ALGOS.length; i++) {
      const a = ALGOS[i];
      setCurId(a.id);
      setProgress(Math.round((i / ALGOS.length) * 100));
      res[a.id] = await runBenchmark(a, bytes);
      setResults({ ...res });
      await new Promise(r => setTimeout(r, 50));
    }

    setProgress(100);
    setCurId(null);
    setRunning(false);
  }

  function drawChart() {
    const ctx = chartRef.current.getContext("2d");
    if (chartInst.current) chartInst.current.destroy();
    const doneAlgos = ALGOS.filter(a => results[a.id]?.ok);
    chartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: doneAlgos.map(a => `${a.label}-${a.keyBits}`),
        datasets: [
          {
            label: "Shifrlash (ms)",
            data: doneAlgos.map(a => results[a.id].encMs),
            backgroundColor: doneAlgos.map(a => a.color + "bb"),
            borderColor:     doneAlgos.map(a => a.color),
            borderWidth: 2,
          },
          {
            label: "Deshifrlash (ms)",
            data: doneAlgos.map(a => results[a.id].decMs),
            backgroundColor: doneAlgos.map(a => a.color + "44"),
            borderColor:     doneAlgos.map(a => a.color),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Vaqt (millisekund)" } },
        },
      },
    });
  }

  const maxMs   = Math.max(...done.map(r => r.totMs), 1);
  const fastest = done.reduce((a, b) => (!a || b.totMs < a.totMs) ? b : a, null);
  const algoOf  = id => ALGOS.find(a => a.id === id);

  return (
    <div className="cl-wrap">
      <h1>Kriptografik Shifrlash Lab</h1>
      <p className="cl-subtitle">
        8 ta algoritmni bir vaqtda sinab ko'ring — qaysi biri tezroq va xavfsizroq ekanini aniqlang.
      </p>

      {/* Controls */}
      <div className="cl-controls">
        <div className="cl-field">
          <label>Ma'lumot hajmi</label>
          <select value={sizeIdx} onChange={e => setSizeIdx(+e.target.value)}>
            {DATA_SIZES.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
        </div>
        <div className="cl-field">
          <label>Shifrlash uchun matn</label>
          <input
            value={plaintext}
            onChange={e => setPlaintext(e.target.value)}
            placeholder="Matn kiriting..."
          />
        </div>
        <button className="cl-btn" onClick={start} disabled={running}>
          {running ? "⏳ Ishlamoqda..." : "▶ Benchmark boshlash"}
        </button>
      </div>

      {/* Progress */}
      {(running || progress > 0) && (
        <>
          <div className="cl-progress-wrap">
            <div className="cl-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {running && curId && (
            <div className="cl-progress-label">
              Hisoblanyapti: <strong>{curId}</strong> … ({progress}%)
            </div>
          )}
        </>
      )}

      {/* Summary */}
      {done.length > 0 && fastest && (() => {
        const fa = algoOf(ALGOS.find(a => results[a.id] === fastest)?.id);
        const avgMs = (done.reduce((s, r) => s + r.totMs, 0) / done.length).toFixed(1);
        return (
          <div className="cl-summary">
            <div className="cl-scard">
              <div className="val" style={{ color: "#22c55e" }}>{fa?.label}-{fa?.keyBits}</div>
              <div className="lbl">🏆 Eng tez algoritm</div>
            </div>
            <div className="cl-scard">
              <div className="val" style={{ color: "#3b82f6" }}>{fastest.totMs} ms</div>
              <div className="lbl">Eng tez (shifr + deshifr)</div>
            </div>
            <div className="cl-scard">
              <div className="val" style={{ color: "#8b5cf6" }}>{done.length} / {ALGOS.length}</div>
              <div className="lbl">Muvaffaqiyatli test</div>
            </div>
            <div className="cl-scard">
              <div className="val" style={{ color: "#f97316" }}>{avgMs} ms</div>
              <div className="lbl">O'rtacha vaqt</div>
            </div>
          </div>
        );
      })()}

      {/* Algorithm cards */}
      {Object.keys(results).length > 0 || running ? (
        <div className="cl-cards">
          {ALGOS.map(algo => {
            const r       = results[algo.id];
            const isRun   = curId === algo.id;
            const pending = !r && !isRun;
            const isBest  = r?.ok && fastest && r === fastest;

            return (
              <div
                key={algo.id}
                className={`cl-card${isBest ? " winner" : ""}${isRun ? " running" : ""}${pending ? " pending" : ""}`}
              >
                {/* Header */}
                <div className="cl-card-top">
                  <div className="cl-algo-name" style={{ color: algo.color }}>
                    {algo.label} <span style={{ fontWeight: 400, fontSize: "0.9rem", color: "#64748b" }}>{algo.keyBits}-bit</span>
                  </div>
                  <span className={`cl-badge ${algo.asym ? "cl-badge-asym" : "cl-badge-sym"}`}>
                    {algo.asym ? "Assimetrik" : "Simetrik"}
                  </span>
                  {isBest && <span className="cl-winner-tag">🏆 Eng tez</span>}
                  {isRun  && <span className="cl-winner-tag" style={{ background:"#dbeafe", color:"#1d4ed8" }}>⏳ Hisoblanmoqda...</span>}
                  {pending && <span style={{ marginLeft:"auto", color:"#94a3b8", fontSize:"0.8rem" }}>Kutilmoqda...</span>}
                </div>

                {r?.ok && (
                  <>
                    {/* Time bars */}
                    <div className="cl-times">
                      <div className="cl-time-label">Shifrlash</div>
                      <div className="cl-bar-track">
                        <div className="cl-bar-fill" style={{
                          width: `${(r.encMs / maxMs) * 100}%`,
                          background: algo.color,
                        }} />
                      </div>
                      <div className="cl-time-val">{r.encMs} ms</div>

                      <div className="cl-time-label">Deshifrlash</div>
                      <div className="cl-bar-track">
                        <div className="cl-bar-fill" style={{
                          width: `${(r.decMs / maxMs) * 100}%`,
                          background: algo.color + "88",
                        }} />
                      </div>
                      <div className="cl-time-val">{r.decMs} ms</div>

                      <div className="cl-time-label" style={{ fontWeight: 800, color: "#1e293b" }}>Jami</div>
                      <div className="cl-bar-track">
                        <div className="cl-bar-fill" style={{
                          width: `${(r.totMs / maxMs) * 100}%`,
                          background: `linear-gradient(90deg, ${algo.color}, ${algo.color}99)`,
                        }} />
                      </div>
                      <div className="cl-time-val" style={{ fontWeight: 800 }}>{r.totMs} ms</div>
                    </div>

                    {/* Security */}
                    <div className="cl-sec-row">
                      <span style={{ fontWeight: 700, color: "#1e293b" }}>Xavfsizlik:</span>
                      <Dots count={algo.sec} />
                      <span className={`cl-badge ${algo.sec >= 5 ? "cl-badge-best" : "cl-badge-sym"}`}>
                        {algo.secLabel}
                      </span>
                      <span style={{ marginLeft: "auto", color: "#94a3b8" }}>
                        Kirish: {r.inputBytes} B → Chiqish: {r.outputBytes} B
                      </span>
                    </div>

                    {/* Cipher flow */}
                    <div className="cl-cipher-label">Shifrlash natijasi (matn → shifrmatn)</div>
                    <div className="cl-flow">
                      <div className="cl-flow-box">
                        <div className="cl-flow-box-title">Asl matn</div>
                        {plaintext || "(bo'sh)"}
                      </div>
                      <div className="cl-flow-arrow">→</div>
                      <div className="cl-flow-box cipher">
                        <div className="cl-flow-box-title">Shifrmatn (Base64)</div>
                        {r.cipherB64}
                      </div>
                    </div>
                  </>
                )}

                {r && !r.ok && (
                  <div style={{ color: "#ef4444", fontSize: "0.85rem" }}>
                    Xato: {r.err}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cl-empty">
          Yuqoridagi "Benchmark boshlash" tugmasini bosing.<br />
          Barcha 8 ta algoritm avtomat sinovdan o'tkaziladi.
        </div>
      )}

      {/* Chart */}
      {done.length > 0 && (
        <div className="cl-chart-section">
          <h3>Algoritmlar tezligi taqqoslama grafigi</h3>
          <canvas ref={chartRef} height={110} />
        </div>
      )}

      {/* Recommendation */}
      {done.length > 0 && (
        <div className="cl-chart-section">
          <h3>Qaysi algoritmni qachon ishlatish kerak?</h3>
          <table className="cl-rec-table">
            <thead>
              <tr>
                <th>Algoritm</th>
                <th>Tezlik</th>
                <th>Xavfsizlik</th>
                <th>Qo'llanilishi</th>
                <th>Tavsiya</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id:"aes-gcm-256",  speed:"Tez",   rec:"Eng yaxshi tanlov",       recClass:"cl-badge-best" },
                { id:"aes-gcm-128",  speed:"Tez",   rec:"Oddiy loyiha uchun yaxshi", recClass:"cl-badge-sym"  },
                { id:"aes-ctr-256",  speed:"Tez",   rec:"Stream uchun yaxshi",      recClass:"cl-badge-sym"  },
                { id:"aes-cbc-256",  speed:"O'rta", rec:"Fayl shifrlash",           recClass:"cl-badge-sym"  },
                { id:"rsa-oaep-2048",speed:"Sekin", rec:"Kalit almashuv uchun",     recClass:"cl-badge-warn" },
                { id:"rsa-oaep-4096",speed:"Sekin", rec:"Maxfiy hujjatlar uchun",   recClass:"cl-badge-warn" },
              ].map(row => {
                const a = ALGOS.find(x => x.id === row.id);
                return (
                  <tr key={row.id}>
                    <td><strong style={{ color: a.color }}>{a.label}-{a.keyBits}</strong></td>
                    <td>{row.speed}</td>
                    <td><Dots count={a.sec} /></td>
                    <td>{a.use}</td>
                    <td><span className={`cl-badge ${row.recClass}`}>{row.rec}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}