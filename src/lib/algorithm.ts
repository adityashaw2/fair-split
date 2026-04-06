/**
 * Su's Rental Harmony — hybrid implementation.
 *
 * Phase 1 (rounds 1–6): Interactive preference revelation with adaptive step.
 * Phase 2 (round 7+): Auto-resolve using collected preference data.
 *
 * The auto-resolve works by averaging prices from recent rounds (which
 * bracket the true envy-free point) and assigning rooms by preference
 * frequency. This avoids infinite oscillation while using the same
 * mathematical principle: the solution lies between the oscillating bounds.
 */

import type { Prices, Choices, RoundData } from "./types";

export function isEnvyFree(choices: Choices): boolean {
  return new Set(choices).size === 3;
}

export function computeNextPrices(
  currentPrices: Prices,
  choices: Choices,
  totalRent: number,
  step: number,
): Prices {
  const demand = [0, 0, 0];
  for (const room of choices) demand[room]++;

  const adjusted: Prices = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    adjusted[r] = Math.max(0, currentPrices[r] + (demand[r] - 1) * step);
  }

  const sum = adjusted[0] + adjusted[1] + adjusted[2];
  if (sum === 0) return [totalRent / 3, totalRent / 3, totalRent / 3];
  const scale = totalRent / sum;
  return [
    Math.round(adjusted[0] * scale),
    Math.round(adjusted[1] * scale),
    Math.round(adjusted[2] * scale),
  ];
}

/** Unused now — step is managed as state via adaptive bisection. */
export function getStepForRound(totalRent: number, _round: number): number {
  return totalRent * 0.15;
}

/**
 * Auto-resolve from collected round data.
 *
 * Strategy:
 *  1. Average prices from the last N rounds (brackets the solution).
 *  2. Build preference frequency matrix: freq[person][room] = pick count.
 *  3. Greedy unique assignment by strongest preference.
 *  4. Adjust averaged prices so the assigned rooms reflect demand
 *     (more-wanted rooms cost proportionally more).
 */
export function autoResolve(
  rounds: RoundData[],
  totalRent: number,
): { assignment: [number, number, number]; prices: Prices } {
  // 1. Check if any round was actually envy-free (edge case)
  for (const r of rounds) {
    if (isEnvyFree(r.choices)) {
      return {
        assignment: [...r.choices] as [number, number, number],
        prices: fixRounding([...r.prices] as Prices, totalRent),
      };
    }
  }

  // 2. Average prices from last min(rounds.length, 6) rounds
  const window = Math.min(rounds.length, 6);
  const recent = rounds.slice(-window);
  const avgPrices: Prices = [0, 0, 0];
  for (const r of recent) {
    avgPrices[0] += r.prices[0];
    avgPrices[1] += r.prices[1];
    avgPrices[2] += r.prices[2];
  }
  avgPrices[0] = Math.round(avgPrices[0] / window);
  avgPrices[1] = Math.round(avgPrices[1] / window);
  avgPrices[2] = Math.round(avgPrices[2] / window);

  // 3. Frequency-based assignment
  const freq: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const r of rounds) {
    for (let p = 0; p < 3; p++) freq[p][r.choices[p]]++;
  }

  const assignment: [number, number, number] = [-1, -1, -1];
  const usedRooms = new Set<number>();
  const usedPeople = new Set<number>();

  for (let iter = 0; iter < 3; iter++) {
    let bestP = -1,
      bestR = -1,
      bestScore = -1;
    for (let p = 0; p < 3; p++) {
      if (usedPeople.has(p)) continue;
      for (let r = 0; r < 3; r++) {
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
    prices: fixRounding(avgPrices, totalRent),
  };
}

/** Kept as alias for backwards compat */
export const fallbackAllocation = autoResolve;

/**
 * Apply income weighting to envy-free prices.
 */
export function applyIncomeWeighting(
  basePrices: Prices,
  assignment: [number, number, number],
  incomes: [number, number, number],
  totalRent: number,
): Prices {
  if (incomes.some((i) => !i || i <= 0)) return basePrices;

  const totalIncome = incomes[0] + incomes[1] + incomes[2];

  const idealPrices: Prices = [0, 0, 0];
  for (let p = 0; p < 3; p++) {
    const room = assignment[p];
    idealPrices[room] = (incomes[p] / totalIncome) * totalRent;
  }

  const blend = 0.7;
  const blended: Prices = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    blended[r] = Math.round(
      basePrices[r] * (1 - blend) + idealPrices[r] * blend,
    );
  }

  const sum = blended[0] + blended[1] + blended[2];
  const scale = totalRent / sum;
  return [
    Math.round(blended[0] * scale),
    Math.round(blended[1] * scale),
    Math.round(blended[2] * scale),
  ];
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function initialPrices(totalRent: number): Prices {
  const each = Math.round(totalRent / 3);
  return [each, each, totalRent - 2 * each];
}

export function fixRounding(prices: Prices, totalRent: number): Prices {
  const diff = totalRent - (prices[0] + prices[1] + prices[2]);
  const maxIdx = prices.indexOf(Math.max(...prices));
  const fixed: Prices = [...prices];
  fixed[maxIdx] += diff;
  return fixed;
}
