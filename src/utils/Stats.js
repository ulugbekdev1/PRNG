// src/utils/Stats.js

export function computeMean(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((a,b)=>a+b,0);
  return sum / arr.length;
}

export function computeVariance(arr) {
  if (!arr.length) return 0;
  const mean = computeMean(arr);
  return arr.reduce((sum, v)=>sum + (v-mean)**2,0) / arr.length;
}

// Chi-square test
export function chiSquareTest(arr, bins=10) {
  const counts = Array(bins).fill(0);
  arr.forEach(val=>{
    let idx = Math.floor(val*bins);
    if(idx===bins) idx=bins-1;
    counts[idx]++;
  });
  const expected = arr.length/bins;
  const contrib = counts.map(c=>((c-expected)**2)/expected);
  const chi2 = contrib.reduce((a,b)=>a+b,0);
  const pass = chi2 < 16.9;
  return { chi2, freq: counts, contrib, pass };
}

// Runs test
export function runsTest(arr) {
  if(arr.length<2) return {runs:0, pass:true};
  let runs=1;
  for(let i=1;i<arr.length;i++){
    if((arr[i]>arr[i-1]) !== (arr[i-1]>arr[i-2])) runs++;
  }
  const expectedRuns=(2*arr.length-1)/3;
  const stdRuns=Math.sqrt((16*arr.length-29)/90);
  const pass=Math.abs(runs-expectedRuns)<=2*stdRuns;
  return { runs, pass };
}

// Autocorrelation (lag 1)
export function autocorrelationTest(arr, lag=1){
  if(arr.length<=lag) return {ac:0, pass:true};
  const mean = computeMean(arr);
  let num=0, denom=0;
  for(let i=0;i<arr.length-lag;i++) num+=(arr[i]-mean)*(arr[i+lag]-mean);
  for(let i=0;i<arr.length;i++) denom+=(arr[i]-mean)**2;
  const ac = denom?num/denom:0;
  const pass=Math.abs(ac)<0.1;
  return { ac, pass };
}
