import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Types ─────────────────────────────────────────────────────────────

interface Person { name: string }
interface Room { name: string; description: string }
interface GameConfig {
  people: Person[];
  rooms: Room[];
  totalRent: number;
}
type Prices = number[];
type Choices = number[];

interface RoundData {
  round: number;
  prices: Prices;
  choices: Choices;
  isEnvyFree: boolean;
}

interface GameState {
  id: string;
  config: GameConfig;
  tokens: string[];
  n: number;
  currentRound: number;
  currentPrices: Prices;
  currentStep: number;
  pendingChoices: Record<number, number>;
  rounds: RoundData[];
  status: "waiting" | "in-round" | "checkpoint" | "complete";
  result?: {
    assignment: Choices;
    prices: Prices;
  };
  createdAt: number;
}

// ── In-memory store ───────────────────────────────────────────────────

const games = new Map<string, GameState>();
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const SOFT_LIMIT = 15;

function cleanup() {
  const now = Date.now();
  for (const [id, g] of games) {
    if (now - g.createdAt > MAX_AGE_MS) games.delete(id);
  }
}

function generateId(len = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ── Algorithm (duplicated from frontend for serverless bundling) ──────

function isEnvyFree(choices: Choices): boolean {
  return new Set(choices).size === choices.length;
}

function computeNextPrices(
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

function fixRounding(prices: Prices, totalRent: number): Prices {
  const sum = prices.reduce((a, b) => a + b, 0);
  const diff = totalRent - sum;
  if (diff === 0) return prices;
  const fixed = [...prices];
  const maxIdx = fixed.indexOf(Math.max(...fixed));
  fixed[maxIdx] += diff;
  return fixed;
}

function snapPrices(prices: Prices, totalRent: number): Prices {
  if (totalRent % 100 !== 0) return prices;
  const rounded = prices.map((p: number) => Math.round(p / 100) * 100);
  let diff = totalRent - rounded.reduce((a: number, b: number) => a + b, 0);
  const errors = prices.map((p: number, i: number) => ({ i, err: p - rounded[i] }));
  if (diff > 0) {
    errors.sort((a, b) => b.err - a.err);
    for (const e of errors) { if (diff <= 0) break; rounded[e.i] += 100; diff -= 100; }
  } else if (diff < 0) {
    errors.sort((a, b) => a.err - b.err);
    for (const e of errors) { if (diff >= 0) break; if (rounded[e.i] >= 100) { rounded[e.i] -= 100; diff += 100; } }
  }
  return rounded;
}

// ── Fallback allocation ──────────────────────────────────────────────

// ── Fallback allocation (checkpoint only) ────────────────────────────

function fallbackAllocation(
  rounds: RoundData[],
  totalRent: number,
  n: number,
): { assignment: Choices; prices: Prices } {
  for (const r of rounds) {
    if (isEnvyFree(r.choices)) {
      return { assignment: [...r.choices], prices: fixRounding([...r.prices], totalRent) };
    }
  }

  const freq: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const r of rounds) {
    for (let p = 0; p < n; p++) freq[p][r.choices[p]]++;
  }

  const assignment = new Array(n).fill(-1);
  const usedRooms = new Set<number>();
  const usedPeople = new Set<number>();

  for (let iter = 0; iter < n; iter++) {
    let bestP = -1, bestR = -1, bestScore = 0;
    for (let p = 0; p < n; p++) {
      if (usedPeople.has(p)) continue;
      for (let r = 0; r < n; r++) {
        if (usedRooms.has(r)) continue;
        if (freq[p][r] > bestScore) { bestScore = freq[p][r]; bestP = p; bestR = r; }
      }
    }
    if (bestP === -1) {
      for (let p = 0; p < n; p++) {
        if (usedPeople.has(p)) continue;
        for (let r = 0; r < n; r++) {
          if (usedRooms.has(r)) continue;
          bestP = p; bestR = r; break;
        }
        break;
      }
    }
    assignment[bestP] = bestR;
    usedRooms.add(bestR);
    usedPeople.add(bestP);
  }

  return { assignment, prices: snapPrices(fixRounding([...rounds[rounds.length - 1].prices], totalRent), totalRent) };
}

// ── Advance round logic ──────────────────────────────────────────────

function tryAdvanceRound(game: GameState): void {
  const pending = game.pendingChoices;
  if (Object.keys(pending).length < game.n) return;

  const choices: Choices = [];
  for (let i = 0; i < game.n; i++) choices.push(pending[i]);

  const envyFree = isEnvyFree(choices);

  const roundData: RoundData = {
    round: game.currentRound,
    prices: [...game.currentPrices],
    choices,
    isEnvyFree: envyFree,
  };
  game.rounds.push(roundData);

  if (envyFree) {
    const finalPrices = snapPrices(fixRounding(game.currentPrices, game.config.totalRent), game.config.totalRent);
    game.status = "complete";
    game.result = { assignment: choices, prices: finalPrices };
  } else if (game.currentRound > 0 && game.currentRound % SOFT_LIMIT === 0) {
    // Checkpoint — let players decide
    game.status = "checkpoint";
    game.pendingChoices = {};
  } else {
    // Adaptive bisection
    const n = game.n;
    const demand = new Array(n).fill(0);
    for (const r of choices) demand[r]++;
    const overDemanded = demand.findIndex((d: number) => d > 1);

    if (game.rounds.length > 1) {
      const prevChoices = game.rounds[game.rounds.length - 2]?.choices;
      if (prevChoices) {
        const prevDemand = new Array(n).fill(0);
        for (const r of prevChoices) prevDemand[r]++;
        const prevOver = prevDemand.findIndex((d: number) => d > 1);
        if (prevOver >= 0 && overDemanded >= 0 && prevOver !== overDemanded) {
          game.currentStep = game.currentStep * 0.5;
        }
      }
    }
    game.currentStep = Math.max(game.currentStep, game.config.totalRent * 0.005);

    const next = computeNextPrices(game.currentPrices, choices, game.config.totalRent, game.currentStep);
    game.currentPrices = fixRounding(next, game.config.totalRent);
    game.currentRound++;
    game.pendingChoices = {};
  }
}

// ── Sanitize state for a specific player ─────────────────────────────

function stateForPlayer(game: GameState, playerIdx: number) {
  const choicesSubmitted = Object.keys(game.pendingChoices).map(Number);

  let checkpointPreview = undefined;
  if (game.status === "checkpoint") {
    const fb = fallbackAllocation(game.rounds, game.config.totalRent, game.n);
    checkpointPreview = { assignment: fb.assignment, prices: fb.prices };
  }

  return {
    id: game.id,
    config: game.config,
    playerIndex: playerIdx,
    currentRound: game.currentRound,
    currentPrices: game.currentPrices,
    myChoice: game.pendingChoices[playerIdx] ?? null,
    choicesSubmitted,
    rounds: game.rounds,
    status: game.status,
    result: game.result,
    checkpointPreview,
    totalPlayers: game.n,
  };
}

// ── CORS helper ──────────────────────────────────────────────────────

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Handler ──────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  cleanup();

  const url = new URL(req.url || "/", `https://${req.headers.host}`);
  const route = url.pathname.replace(/^\/api\/game\/?/, "").replace(/\/$/, "");

  try {
    // POST /api/game/create
    if (route === "create" && req.method === "POST") {
      const { config } = req.body as { config: GameConfig };
      if (!config || !config.people || !config.rooms || !config.totalRent) {
        return res.status(400).json({ error: "Invalid config" });
      }

      const n = config.people.length;
      if (n < 2 || n > 10 || config.rooms.length !== n) {
        return res.status(400).json({ error: "Need 2-10 people with matching rooms" });
      }

      const id = generateId(6);
      const tokens = Array.from({ length: n }, () => generateId(12));

      const each = Math.round(config.totalRent / n);
      const ipRaw: Prices = new Array(n).fill(each);
      ipRaw[n - 1] = config.totalRent - each * (n - 1);
      const ip = snapPrices(ipRaw, config.totalRent);

      const game: GameState = {
        id,
        config,
        tokens,
        n,
        currentRound: 1,
        currentPrices: ip,
        currentStep: config.totalRent * 0.15,
        pendingChoices: {},
        rounds: [],
        status: "in-round",
        createdAt: Date.now(),
      };

      games.set(id, game);

      return res.json({
        gameId: id,
        tokens,
        playerNames: config.people.map((p) => p.name),
      });
    }

    // GET /api/game/state?id=xxx&token=xxx
    if (route === "state" && req.method === "GET") {
      const id = req.query.id as string;
      const game = games.get(id);
      if (!game) return res.status(404).json({ error: "Game not found or expired" });

      const token = req.query.token as string;
      const playerIdx = game.tokens.indexOf(token);
      if (playerIdx === -1) return res.status(403).json({ error: "Invalid token" });

      return res.json(stateForPlayer(game, playerIdx));
    }

    // POST /api/game/choice { id, token, room }
    if (route === "choice" && req.method === "POST") {
      const { id, token, room } = req.body as { id: string; token: string; room: number };
      const game = games.get(id);
      if (!game) return res.status(404).json({ error: "Game not found or expired" });

      if (game.status === "complete") {
        return res.status(400).json({ error: "Game already complete" });
      }

      const playerIdx = game.tokens.indexOf(token);
      if (playerIdx === -1) return res.status(403).json({ error: "Invalid token" });

      if (typeof room !== "number" || room < 0 || room >= game.n) {
        return res.status(400).json({ error: "Invalid room choice" });
      }

      game.pendingChoices[playerIdx] = room;
      tryAdvanceRound(game);

      return res.json(stateForPlayer(game, playerIdx));
    }

    // POST /api/game/continue { id, token }
    if (route === "continue" && req.method === "POST") {
      const { id, token } = req.body as { id: string; token: string };
      const game = games.get(id);
      if (!game) return res.status(404).json({ error: "Game not found or expired" });
      if (game.status !== "checkpoint") return res.status(400).json({ error: "Game not at checkpoint" });

      const playerIdx = game.tokens.indexOf(token);
      if (playerIdx === -1) return res.status(403).json({ error: "Invalid token" });

      game.status = "in-round";
      game.currentRound++;
      return res.json(stateForPlayer(game, playerIdx));
    }

    // POST /api/game/accept { id, token }
    if (route === "accept" && req.method === "POST") {
      const { id, token } = req.body as { id: string; token: string };
      const game = games.get(id);
      if (!game) return res.status(404).json({ error: "Game not found or expired" });
      if (game.status !== "checkpoint") return res.status(400).json({ error: "Game not at checkpoint" });

      const playerIdx = game.tokens.indexOf(token);
      if (playerIdx === -1) return res.status(403).json({ error: "Invalid token" });

      const fb = fallbackAllocation(game.rounds, game.config.totalRent, game.n);
      game.status = "complete";
      game.result = { assignment: fb.assignment, prices: fb.prices };
      return res.json(stateForPlayer(game, playerIdx));
    }

    return res.status(404).json({ error: "Not found", route });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
}
