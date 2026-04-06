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
 *   5. Repeat with refined step
 *
 * Convergence is guaranteed because raising a room's price will eventually
 * make someone switch away from it (assuming monotone preferences:
 * no one prefers a more expensive room over a cheaper identical one).
 */

import type { Prices, Choices, RoundData } from "./types";

export function isEnvyFree(choices: Choices): boolean {
  return new Set(choices).size === 3;
}

export function getAssignment(choices: Choices): [number, number, number] {
  return choices;
}

/**
 * Compute the next price proposal given current choices.
 *
 * Strategy: rooms with excess demand get more expensive,
 * rooms with no demand get cheaper.
 */
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
    const delta = (demand[r] - 1) * step;
    adjusted[r] = Math.max(0, currentPrices[r] + delta);
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

/**
 * Step schedule: constant 12% for first 10 rounds, then gentle decay.
 * Floor at 1.5% so prices always move meaningfully.
 *
 * For ₹52k rent:
 *   R1–10:  ₹6,240 per step
 *   R11–14: ₹3,120
 *   R15–18: ₹1,560
 *   R19+:   ₹780 (floor)
 */
export function getStepForRound(totalRent: number, round: number): number {
  if (round <= 10) return totalRent * 0.12;
  return Math.max(
    (totalRent * 0.12) / Math.pow(2, Math.floor((round - 10) / 4)),
    totalRent * 0.015,
  );
}

/**
 * Fallback allocation when max rounds is reached without envy-free.
 *
 * Scans round history:
 *  1. If any round was envy-free, use it.
 *  2. Otherwise, find the round with most unique room choices (closest to envy-free).
 *  3. Force-resolve: count how often each person picked each room across all rounds,
 *     then assign via preference-frequency matching (Hungarian-lite).
 */
export function fallbackAllocation(
  rounds: RoundData[],
  totalRent: number,
): { assignment: [number, number, number]; prices: Prices } {
  // 1. Check if any historical round was envy-free
  for (const r of rounds) {
    if (isEnvyFree(r.choices)) {
      return {
        assignment: [...r.choices] as [number, number, number],
        prices: fixRounding([...r.prices] as Prices, totalRent),
      };
    }
  }

  // 2. Frequency-based assignment: for each person, count how often they
  //    picked each room. Assign by greedy best match.
  const freq: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]; // freq[person][room]
  for (const r of rounds) {
    for (let p = 0; p < 3; p++) {
      freq[p][r.choices[p]]++;
    }
  }

  // Greedy assignment: iterate, assign person with strongest single-room
  // preference first, then remove that room from contention.
  const assignment: [number, number, number] = [-1, -1, -1];
  const usedRooms = new Set<number>();
  const usedPeople = new Set<number>();

  for (let iter = 0; iter < 3; iter++) {
    let bestPerson = -1;
    let bestRoom = -1;
    let bestScore = -1;

    for (let p = 0; p < 3; p++) {
      if (usedPeople.has(p)) continue;
      for (let r = 0; r < 3; r++) {
        if (usedRooms.has(r)) continue;
        if (freq[p][r] > bestScore) {
          bestScore = freq[p][r];
          bestPerson = p;
          bestRoom = r;
        }
      }
    }

    assignment[bestPerson] = bestRoom;
    usedRooms.add(bestRoom);
    usedPeople.add(bestPerson);
  }

  // Use the last round's prices
  const lastPrices = rounds[rounds.length - 1].prices;
  return {
    assignment,
    prices: fixRounding([...lastPrices] as Prices, totalRent),
  };
}

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
