import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Types ─────────────────────────────────────────────────────────────

interface Person { name: string; income?: number }
interface Room { name: string; description: string }
interface GameConfig {
  people: [Person, Person, Person];
  rooms: [Room, Room, Room];
  totalRent: number;
  useIncomeWeighting: boolean;
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
  pendingChoices: Record<number, number>;
  rounds: RoundData[];
  status: "waiting" | "in-round" | "complete";
  result?: {
    assignment: Choices;
    prices: Prices;
    incomeAdjustedPrices?: Prices;
  };
  createdAt: number;
}

// ── In-memory store ───────────────────────────────────────────────────

const games = new Map<string, GameState>();
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_ROUNDS = 15;

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
  return Math.max(
    (totalRent * 0.15) / Math.pow(2, Math.floor(round / 3)),
    totalRent * 0.01,
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

function applyIncomeWeighting(
  basePrices: Prices,
  assignment: Choices,
  incomes: [number, number, number],
  totalRent: number,
): Prices {
  if (incomes.some((i) => !i || i <= 0)) return basePrices;
  const totalIncome = incomes[0] + incomes[1] + incomes[2];
  const idealPrices: Prices = [0, 0, 0];
  for (let p = 0; p < 3; p++) {
    idealPrices[assignment[p]] = (incomes[p] / totalIncome) * totalRent;
  }
  const blend = 0.7;
  const blended: Prices = [0, 0, 0];
  for (let r = 0; r < 3; r++) {
    blended[r] = Math.round(basePrices[r] * (1 - blend) + idealPrices[r] * blend);
  }
  const sum = blended[0] + blended[1] + blended[2];
  const scale = totalRent / sum;
  return fixRounding(
    [Math.round(blended[0] * scale), Math.round(blended[1] * scale), Math.round(blended[2] * scale)],
    totalRent,
  );
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

  if (envyFree || game.currentRound >= MAX_ROUNDS) {
    const assignment = choices;
    const finalPrices = fixRounding(game.currentPrices, game.config.totalRent);

    let incomeAdjustedPrices: Prices | undefined;
    if (game.config.useIncomeWeighting) {
      const incomes = game.config.people.map((p) => p.income || 0) as [number, number, number];
      if (incomes.every((i) => i > 0)) {
        incomeAdjustedPrices = applyIncomeWeighting(finalPrices, assignment, incomes, game.config.totalRent);
      }
    }

    game.status = "complete";
    game.result = { assignment, prices: finalPrices, incomeAdjustedPrices };
  } else {
    const step = getStepForRound(game.config.totalRent, game.currentRound);
    const next = computeNextPrices(game.currentPrices, choices, game.config.totalRent, step);
    game.currentPrices = fixRounding(next, game.config.totalRent);
    game.currentRound++;
    game.pendingChoices = {};
  }
}

// ── Sanitize state for a specific player ─────────────────────────────

function stateForPlayer(game: GameState, playerIdx: number) {
  const choicesSubmitted = Object.keys(game.pendingChoices).map(Number);

  return {
    id: game.id,
    config: game.config,
    playerIndex: playerIdx,
    currentRound: game.currentRound,
    currentPrices: game.currentPrices,
    myChoice: game.pendingChoices[playerIdx] ?? null,
    choicesSubmitted, // which player indices have submitted
    rounds: game.rounds,
    status: game.status,
    result: game.result,
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

    return res.status(404).json({ error: "Not found", route });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return res.status(500).json({ error: message });
  }
}
