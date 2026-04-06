import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Types ─────────────────────────────────────────────────────────────

interface Person { name: string }
interface Room { name: string; description: string }
interface GameConfig {
  people: [Person, Person, Person];
  rooms: [Room, Room, Room];
  totalRent: number;
}
type Prices = [number, number, number];
type Choices = [number, number, number];

interface RoundData {
  round: number;
  prices: Prices;
  choices: Choices;
  isEnvyFree: boolean;
}

interface GameState {
  id: string;
  config: GameConfig;
  tokens: [string, string, string];
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
const AUTO_RESOLVE_AFTER = 6;
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
  return new Set(choices).size === 3;
}

function getStepForRound(totalRent: number, round: number): number {
  if (round <= 10) return totalRent * 0.12;
  return Math.max(
    (totalRent * 0.12) / Math.pow(2, Math.floor((round - 10) / 4)),
    totalRent * 0.015,
  );
}

function computeNextPrices(
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

function fixRounding(prices: Prices, totalRent: number): Prices {
  const diff = totalRent - (prices[0] + prices[1] + prices[2]);
  const maxIdx = prices.indexOf(Math.max(...prices));
  const fixed: Prices = [...prices];
  fixed[maxIdx] += diff;
  return fixed;
}

// ── Fallback allocation ──────────────────────────────────────────────

function fallbackAllocation(
  rounds: RoundData[],
  totalRent: number,
): { assignment: Choices; prices: Prices } {
  // Check if any historical round was envy-free
  for (const r of rounds) {
    if (isEnvyFree(r.choices)) {
      return { assignment: [...r.choices] as Choices, prices: fixRounding([...r.prices] as Prices, totalRent) };
    }
  }

  // Frequency-based: count how often each person picked each room
  const freq = [[0,0,0],[0,0,0],[0,0,0]];
  for (const r of rounds) {
    for (let p = 0; p < 3; p++) freq[p][r.choices[p]]++;
  }

  // Greedy assignment by strongest preference
  const assignment: Choices = [-1 as number, -1 as number, -1 as number] as unknown as Choices;
  const usedRooms = new Set<number>();
  const usedPeople = new Set<number>();

  for (let iter = 0; iter < 3; iter++) {
    let bestP = -1, bestR = -1, bestScore = -1;
    for (let p = 0; p < 3; p++) {
      if (usedPeople.has(p)) continue;
      for (let r = 0; r < 3; r++) {
        if (usedRooms.has(r)) continue;
        if (freq[p][r] > bestScore) { bestScore = freq[p][r]; bestP = p; bestR = r; }
      }
    }
    assignment[bestP] = bestR;
    usedRooms.add(bestR);
    usedPeople.add(bestP);
  }

  return { assignment, prices: fixRounding([...rounds[rounds.length - 1].prices] as Prices, totalRent) };
}

// ── Advance round logic ──────────────────────────────────────────────

function tryAdvanceRound(game: GameState): void {
  const pending = game.pendingChoices;
  if (Object.keys(pending).length < 3) return;

  const choices: Choices = [pending[0], pending[1], pending[2]];
  const envyFree = isEnvyFree(choices);

  const roundData: RoundData = {
    round: game.currentRound,
    prices: [...game.currentPrices],
    choices,
    isEnvyFree: envyFree,
  };
  game.rounds.push(roundData);

  if (envyFree) {
    const finalPrices = fixRounding(game.currentPrices, game.config.totalRent);
    game.status = "complete";
    game.result = { assignment: choices, prices: finalPrices };
  } else if (game.currentRound >= AUTO_RESOLVE_AFTER) {
    // Enough data — auto-resolve
    const fb = fallbackAllocation(game.rounds, game.config.totalRent);
    game.status = "complete";
    game.result = { assignment: fb.assignment, prices: fb.prices };
  } else {
    // Adaptive bisection
    const demand = [0, 0, 0];
    for (const r of choices) demand[r]++;
    const overDemanded = demand.findIndex((d) => d > 1);

    if (game.rounds.length > 1) {
      const prevChoices = game.rounds[game.rounds.length - 2]?.choices;
      if (prevChoices) {
        const prevDemand = [0, 0, 0];
        for (const r of prevChoices) prevDemand[r]++;
        const prevOver = prevDemand.findIndex((d) => d > 1);
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

  // If at checkpoint, compute fallback preview
  let checkpointPreview = undefined;
  if (game.status === "checkpoint") {
    const fb = fallbackAllocation(game.rounds, game.config.totalRent);
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
    totalPlayers: 3,
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

  // Vercel catch-all: extract path from URL since query.path can be unreliable
  const url = new URL(req.url || "/", `https://${req.headers.host}`);
  const route = url.pathname.replace(/^\/api\/game\/?/, "").replace(/\/$/, "");

  try {
    // POST /api/game/create
    if (route === "create" && req.method === "POST") {
      const { config } = req.body as { config: GameConfig };
      if (!config || !config.people || !config.rooms || !config.totalRent) {
        return res.status(400).json({ error: "Invalid config" });
      }

      const id = generateId(6);
      const tokens: [string, string, string] = [
        generateId(12),
        generateId(12),
        generateId(12),
      ];

      const each = Math.round(config.totalRent / 3);
      const initialPrices: Prices = [each, each, config.totalRent - 2 * each];

      const game: GameState = {
        id,
        config,
        tokens,
        currentRound: 1,
        currentPrices: initialPrices,
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

      if (typeof room !== "number" || room < 0 || room > 2) {
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

      const fb = fallbackAllocation(game.rounds, game.config.totalRent);
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
