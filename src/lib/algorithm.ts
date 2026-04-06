/**
 * Su's Rental Harmony — generalized for N roommates.
 *
 * Pure envy-free: rounds continue until everyone picks a different room.
 * No fallback allocation — the theorem guarantees convergence.
 */

import type { Prices, Choices } from "./types";

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
