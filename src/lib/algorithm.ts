/**
 * Su's Rental Harmony — generalized for N roommates.
 *
 * Phase 1 (rounds 1–6): Interactive preference revelation with adaptive step.
 * Phase 2 (round 7+): Auto-resolve using collected preference data.
 */

import type { Prices, Choices, RoundData } from "./types";

export function isEnvyFree(choices: Choices): boolean {
  const n = choices.length;
  return new Set(choices).size === n;
}

export function computeNextPrices(
  currentPrices: Prices,
  choices: Choices,
  totalRent: number,
  step: number,
): Prices {
  const n = currentPrices.length;
  const demand = new Array(n).fill(0);
  for (const room of choices) demand[room]++;

  const adjusted = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    adjusted[r] = Math.max(0, currentPrices[r] + (demand[r] - 1) * step);
  }

  const sum = adjusted.reduce((a: number, b: number) => a + b, 0);
  if (sum === 0) return snapPrices(new Array(n).fill(Math.round(totalRent / n)), totalRent);
  const scale = totalRent / sum;
  const scaled = adjusted.map((p: number) => Math.round(p * scale));
  return snapPrices(fixRounding(scaled, totalRent), totalRent);
}

/**
 * Auto-resolve from collected round data.
 *
 * Strategy:
 *  1. Average prices from the last N rounds (brackets the solution).
 *  2. Build preference frequency matrix: freq[person][room] = pick count.
 *  3. Greedy unique assignment by strongest preference.
 */
export function autoResolve(
  rounds: RoundData[],
  totalRent: number,
  n: number,
): { assignment: number[]; prices: Prices } {
  // Check if any round was actually envy-free
  for (const r of rounds) {
    if (isEnvyFree(r.choices)) {
      return {
        assignment: [...r.choices],
        prices: fixRounding([...r.prices], totalRent),
      };
    }
  }

  // Average prices from last min(rounds.length, 6) rounds
  const window = Math.min(rounds.length, 6);
  const recent = rounds.slice(-window);
  const avgPrices = new Array(n).fill(0);
  for (const r of recent) {
    for (let i = 0; i < n; i++) avgPrices[i] += r.prices[i];
  }
  for (let i = 0; i < n; i++) avgPrices[i] = Math.round(avgPrices[i] / window);

  // Frequency-based assignment
  const freq: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const r of rounds) {
    for (let p = 0; p < n; p++) freq[p][r.choices[p]]++;
  }

  const assignment = new Array(n).fill(-1);
  const usedRooms = new Set<number>();
  const usedPeople = new Set<number>();

  for (let iter = 0; iter < n; iter++) {
    let bestP = -1, bestR = -1, bestScore = -1;
    for (let p = 0; p < n; p++) {
      if (usedPeople.has(p)) continue;
      for (let r = 0; r < n; r++) {
        if (usedRooms.has(r)) continue;
        if (freq[p][r] > bestScore) {
          bestScore = freq[p][r];
          bestP = p;
          bestR = r;
        }
      }
    }
    assignment[bestP] = bestR;
    usedRooms.add(bestR);
    usedPeople.add(bestP);
  }

  return {
    assignment,
    prices: snapPrices(fixRounding(avgPrices, totalRent), totalRent),
  };
}

/** Alias for backwards compat */
export const fallbackAllocation = autoResolve;

/**
 * Snap prices to nearest multiples of 100, preserving totalRent sum.
 * If totalRent itself isn't a multiple of 100, falls back to exact values.
 */
function snapPrices(prices: Prices, totalRent: number): Prices {
  if (totalRent % 100 !== 0) return prices;
  const rounded = prices.map((p) => Math.round(p / 100) * 100);
  let diff = totalRent - rounded.reduce((a, b) => a + b, 0);
  const errors = prices.map((p, i) => ({ i, err: p - rounded[i] }));
  if (diff > 0) {
    errors.sort((a, b) => b.err - a.err);
    for (const e of errors) {
      if (diff <= 0) break;
      rounded[e.i] += 100;
      diff -= 100;
    }
  } else if (diff < 0) {
    errors.sort((a, b) => a.err - b.err);
    for (const e of errors) {
      if (diff >= 0) break;
      if (rounded[e.i] >= 100) {
        rounded[e.i] -= 100;
        diff += 100;
      }
    }
  }
  return rounded;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function initialPrices(totalRent: number, n: number): Prices {
  const each = Math.round(totalRent / n);
  const prices = new Array(n).fill(each);
  prices[n - 1] = totalRent - each * (n - 1);
  return snapPrices(prices, totalRent);
}

export function fixRounding(prices: Prices, totalRent: number): Prices {
  const sum = prices.reduce((a, b) => a + b, 0);
  const diff = totalRent - sum;
  if (diff === 0) return prices;
  const fixed = [...prices];
  const maxIdx = fixed.indexOf(Math.max(...fixed));
  fixed[maxIdx] += diff;
  return fixed;
}
