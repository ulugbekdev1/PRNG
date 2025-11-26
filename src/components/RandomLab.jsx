import React, { useState, useEffect, useRef } from "react";
import { MersenneTwister } from "../utils/MersenneTwister";
import { computeMean, computeVariance, chiSquareTest, runsTest, autocorrelationTest } from "../utils/Stats";
import Chart from "chart.js/auto";
import "./Random.css";

// TRNG
function generateTRNG(count){
  const arr=new Uint32Array(count);
  window.crypto.getRandomValues(arr);
  return Array.from(arr).map(v=>v/4294967296);
}

// LCG
function generateLCG(seed,count){
  const a=1664525, c=1013904223, m=2**32;
  let x=seed>>>0;
  const out=[];
  for(let i=0;i<count;i++){
    x=(Math.imul(a,x)+c)>>>0;
    out.push(x/m);
  }
  return out;
}

export default function RandomLab(){
  const [type,setType]=useState("mt");
  const [seed,setSeed]=useState(Date.now()%4294967296);
  const [count,setCount]=useState(200);
  const [numbers,setNumbers]=useState([]);
  const [mt,setMt]=useState(null);
  const [generating,setGenerating]=useState(false);
  const chartInstance=useRef(null);
  const valuesRef=useRef(null); // scrollni saqlash

  // Step-by-step test states
  const [chiStep,setChiStep]=useState(0);
  const [runsStep,setRunsStep]=useState(0);
  const [autocorrStep,setAutocorrStep]=useState(0);
  const [chiContrib,setChiContrib]=useState([]);

  useEffect(()=>{
    if(type==="mt") setMt(new MersenneTwister(seed));
  },[type,seed]);

  function drawChart(data){
    const ctx=document.getElementById("chart").getContext("2d");
    if(chartInstance.current) chartInstance.current.destroy();
    chartInstance.current=new Chart(ctx,{
      type:"line",
      data:{
        labels:data.map((_,i)=>i+1),
        datasets:[{
          label:`${type.toUpperCase()} qiymatlar`,
          data,
          borderWidth:2,
          pointRadius:0,
          borderColor:type==="mt"? "#3b82f6": type==="lcg"? "#f97316": type==="webcrypto"? "#10b981": "#8b5cf6"
        }]
      },
      options:{ scales:{y:{min:0,max:1}}, responsive:true, animation:false }
    });
  }

  // Numbers ketma-ket generatsiya
  function generateNumbersAnimated(){
    setNumbers([]);
    setGenerating(true);
    setChiStep(0); setRunsStep(0); setAutocorrStep(0); setChiContrib([]);
    let out=[];
    let g = type==="mt" ? mt||new MersenneTwister(seed) : null;
    let i=0;
    const step=()=>{
      if(i>=count){
        setGenerating(false);
        drawChart(out);
        animateChiSquare(out);
        animateRuns(out);
        animateAutocorr(out);
        return;
      }
      let val;
      if(type==="mt") val=g.random();
      else if(type==="lcg") val=generateLCG(seed,1)[0];
      else if(type==="webcrypto"||type==="trng") val=generateTRNG(1)[0];

      out.push(val);
      setNumbers([...out]);
      drawChart(out);

      if(valuesRef.current){
        const scrollTop = valuesRef.current.scrollTop;
        valuesRef.current.scrollTop = scrollTop;
      }

      i++;
      requestAnimationFrame(step);
    };
    step();
  }

  // Step-by-step Chi-square
  function animateChiSquare(data){
    const bins=10;
    const counts=Array(bins).fill(0);
    data.forEach(v=>{
      let idx=Math.floor(v*bins);
      if(idx===bins) idx=bins-1;
      counts[idx]++;
    });
    const expected=data.length/bins;
    let stepIndex=0;
    const contrib=[];
    const interval=setInterval(()=>{
      if(stepIndex>=bins){
        clearInterval(interval);
        setChiStep(bins);
        setChiContrib([...contrib]);
        return;
      }
      const c = ((counts[stepIndex]-expected)**2)/expected;
      contrib.push(c);
      setChiContrib([...contrib]);
      setChiStep(stepIndex+1);
      stepIndex++;
    }, 200);
  }

  // Step-by-step Runs
  function animateRuns(data){
    let stepIndex=0;
    const interval=setInterval(()=>{
      if(stepIndex>=data.length-1){
        clearInterval(interval);
        setRunsStep(data.length-1);
        return;
      }
      setRunsStep(stepIndex+1);
      stepIndex++;
    }, 10);
  }

  // Step-by-step Autocorr
  function animateAutocorr(data){
    let stepIndex=0;
    const mean=computeMean(data);
    const interval=setInterval(()=>{
      if(stepIndex>=data.length-1){
        clearInterval(interval);
        setAutocorrStep(data.length-1);
        return;
      }
      setAutocorrStep(stepIndex+1);
      stepIndex++;
    }, 10);
  }

  const stats = numbers.length ? {
    mean: computeMean(numbers),
    variance: computeVariance(numbers),
    chi: chiSquareTest(numbers,10),
    runs: runsTest(numbers),
    autocorr: autocorrelationTest(numbers,1),
  } : null;

  return(
    <div className="randomlab-container">
      <h1>PRNG / TRNG Lab (Step-by-step Visual)</h1>

      <div className="controls">
        <div className="control">
          <label>Generator turi:</label>
          <select value={type} onChange={e=>setType(e.target.value)}>
            <option value="mt">Mersenne Twister</option>
            <option value="lcg">LCG</option>
            <option value="webcrypto">Web Crypto</option>
            <option value="trng">TRNG</option>
          </select>
        </div>
        <div className="control">
          <label>Seed (32-bit):</label>
          <input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))}
            disabled={type==="trng"||type==="webcrypto"} />
        </div>
        <div className="control">
          <label>Soni:</label>
          <input type="number" min={1} max={5000} value={count} onChange={e=>setCount(Number(e.target.value)||1)} />
        </div>
      </div>

      <div className="buttons">
        <button onClick={generateNumbersAnimated} disabled={generating}>{generating?"Generatsiya qilinmoqda...":"Generatsiya qilish"}</button>
        <button onClick={()=>{setNumbers([]); if(chartInstance.current) chartInstance.current.destroy();}}>Tozalash</button>
      </div>

      <canvas id="chart" width="900" height="300"></canvas>

      <div className="results">
        <h3>So‘ngi {numbers.length} ta qiymat</h3>
        <div className="box" ref={valuesRef} style={{maxHeight:"200px",overflowY:"auto"}}>
          <ol>{numbers.slice(0,200).map((v,i)=><li key={i}>{v.toFixed(6)}</li>)}</ol>
        </div>

        {/* Chi-square */}
        {stats && (
          <section className="stats-section">
            <h4>Chi-square (Step-by-step)</h4>
            <table>
              <thead><tr><th>Bin</th><th>O</th><th>E</th><th>(O-E)^2/E</th></tr></thead>
              <tbody>
                {stats.chi.freq.map((val,i)=>{
                  const expected=numbers.length/10;
                  const contribVal=chiContrib[i]||0;
                  return <tr key={i}>
                    <td>{i+1}</td>
                    <td>{i<chiStep?val:"-"}</td>
                    <td>{i<chiStep?expected.toFixed(2):"-"}</td>
                    <td>{i<chiStep?contribVal.toFixed(3):"-"}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Runs */}
        {stats && (
          <section className="stats-section">
            <h4>Runs Test</h4>
            <div style={{display:"flex",flexWrap:"wrap"}}>
              {numbers.map((v,i)=>{
                const prev=numbers[i-1];
                const isUp=i===0?null:v>prev;
                const visible=i<runsStep;
                return <div key={i} style={{
                  width:"6px",height:"20px",margin:"1px",
                  background:visible ? (isUp===null?"#ccc":isUp?"#3b82f6":"#f97316"):"#eee"
                }} title={v.toFixed(3)}></div>
              })}
            </div>
          </section>
        )}

        {/* Autocorr */}
        {stats && (
          <section className="stats-section">
            <h4>Autocorrelation (lag 1)</h4>
            <div style={{display:"flex"}}>
              {numbers.slice(0,numbers.length-1).map((v,i)=>{
                const mean=stats.mean;
                const contrib=(v-mean)*(numbers[i+1]-mean);
                const visible=i<autocorrStep;
                return <div key={i} style={{
                  width:"4px",
                  height:visible ? `${Math.abs(contrib)*200}px` : "0px",
                  marginRight:"1px",
                  background:contrib>=0?"#10b981":"#ef4444"
                }} title={contrib.toFixed(4)}></div>
              })}
            </div>
          </section>
        )}

        {/* Yakuniy xulosa */}
        {stats && (
          <section className="stats-section">
            <h4>Randomness Summary</h4>
            <p>Mean: {stats.mean.toFixed(5)}</p>
            <p>Variance: {stats.variance.toFixed(5)}</p>
            <p>Chi-square: {stats.chi.chi2.toFixed(4)}</p>
            <p>Total runs: {stats.runs.runs}</p>
            <p>Autocorr: {stats.autocorr.ac.toFixed(5)}</p>
            <p style={{fontWeight:"bold"}}>
              {stats.chi.pass && stats.runs.pass && stats.autocorr.pass
                ?"➤ Xulosa: Ketma-ketlik tasodifiylikka yaqin ✅"
                :"➤ Xulosa: Ketma-ketlik tasodifiy emas ❌"}
            </p>
          </section>
        )}

      </div>
    </div>
  );
}
