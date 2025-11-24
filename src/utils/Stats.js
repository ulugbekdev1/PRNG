// src/utils/Stats.js
// Oddiy statistik funksiya: mean, variance, chi-square

export function computeMean(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

export function computeVariance(arr) {
  if (!arr.length) return 0;
  const mean = computeMean(arr);
  const sum = arr.reduce((a, b) => a + (b - mean) ** 2, 0);
  return sum / arr.length;
}

export function chiSquareTest(arr, bins = 10) {
  const counts = Array(bins).fill(0);
  arr.forEach(val => {
    let idx = Math.floor(val * bins);
    if (idx === bins) idx = bins - 1;
    counts[idx]++;
  });
  const expected = arr.length / bins;
  let chi2 = counts.reduce((sum, val) => sum + (val - expected) ** 2 / expected, 0);
  return { chi2, freq: counts };
}
