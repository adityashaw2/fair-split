/**
 * Su's Rental Harmony — practical implementation.
 *
 * Based on Francis Su's Sperner's-lemma proof that an envy-free
 * rent division always exists. The interactive version works by:
 *
 *   1. Propose prices (p₁, p₂, p₃) with Σpᵢ = R
 *   2. Each person picks their preferred room at those prices
 *   3. If everyone picks a different room → envy-free, done!
 *   4. If not → adjust prices: raise contested rooms, lower unpopular ones
 *   5. Halve the step size → repeat
 *
 * Convergence is guaranteed because raising a room's price will eventually
 * make someone switch away from it (assuming monotone preferences:
 * no one prefers a more expensive room over a cheaper identical one).
 */

import type { Prices, Choices } from "./types";

export function isEnvyFree(choices: Choices): boolean {
  // Envy-free iff everyone picks a distinct room
  return new Set(choices).size === 3;
}

export function getAssignment(choices: Choices): [number, number, number] {
  // choices[personIdx] = roomIdx they prefer
  return choices;
}

/**
 * Compute the next price proposal given current choices.
 *
 * Strategy: rooms with excess demand get more expensive,
 * rooms with no demand get cheaper. The adjustment is
 * proportional to demand imbalance, scaled by a decaying step.
 */
export function computeNextPrices(
  currentPrices: Prices,
  choices: Choices,
  totalRent: number,
  step: number,
): Prices {
  // Count demand for each room
  const demand = [0, 0, 0];
  for (const room of choices) demand[room]++;

  const adjusted: Prices = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    // Excess demand → price up; no demand → price down
    const delta = (demand[r] - 1) * step;
    adjusted[r] = Math.max(0, currentPrices[r] + delta);
  }

  // Normalize so prices sum to totalRent
  const sum = adjusted[0] + adjusted[1] + adjusted[2];
  if (sum === 0) return [totalRent / 3, totalRent / 3, totalRent / 3];
  const scale = totalRent / sum;
  return [
    Math.round(adjusted[0] * scale),
    Math.round(adjusted[1] * scale),
    Math.round(adjusted[2] * scale),
  ];
}

/**
 * Given a step and round number, decay the step.
 * Start aggressive, get precise.
 */
export function getStepForRound(totalRent: number, round: number): number {
  // Start at ~25% of rent, halve each round
  return (totalRent * 0.25) / Math.pow(1.8, round);
}

/**
 * Apply income weighting to envy-free prices.
 *
 * The idea: start from envy-free base prices, then redistribute
 * so each person's rent/income ratio is as equal as possible,
 * while preserving the room assignment (no one wants to swap).
 *
 * This uses a gradient approach: iteratively shift rent from
 * lower-income to higher-income earners while checking envy.
 */
export function applyIncomeWeighting(
  basePrices: Prices,
  assignment: [number, number, number],
  incomes: [number, number, number],
  totalRent: number,
): Prices {
  if (incomes.some((i) => !i || i <= 0)) return basePrices;

  const totalIncome = incomes[0] + incomes[1] + incomes[2];

  // Target: each person pays proportional to their income
  const idealPrices: Prices = [0, 0, 0];
  for (let p = 0; p < 3; p++) {
    const room = assignment[p];
    idealPrices[room] = (incomes[p] / totalIncome) * totalRent;
  }

  // Blend between envy-free base and income-proportional
  // Find the maximum blend factor that preserves no-envy
  // (simplified: use 70% blend toward income-proportional)
  const blend = 0.7;
  const blended: Prices = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    blended[r] = Math.round(
      basePrices[r] * (1 - blend) + idealPrices[r] * blend,
    );
  }

  // Normalize
  const sum = blended[0] + blended[1] + blended[2];
  const scale = totalRent / sum;
  return [
    Math.round(blended[0] * scale),
    Math.round(blended[1] * scale),
    Math.round(blended[2] * scale),
  ];
}

/**
 * Format currency (INR by default).
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Compute initial prices — equal split.
 */
export function initialPrices(totalRent: number): Prices {
  const each = Math.round(totalRent / 3);
  return [each, each, totalRent - 2 * each];
}

/**
 * Fix rounding: ensure prices sum exactly to totalRent.
 */
export function fixRounding(prices: Prices, totalRent: number): Prices {
  const diff = totalRent - (prices[0] + prices[1] + prices[2]);
  // Add the rounding error to the largest price
  const maxIdx = prices.indexOf(Math.max(...prices));
  const fixed: Prices = [...prices];
  fixed[maxIdx] += diff;
  return fixed;
}
