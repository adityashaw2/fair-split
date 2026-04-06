import { useState, useEffect, useCallback, useRef } from "react";
import type { GameConfig, Prices, RoundData } from "./types";

const API_BASE = "/api/game";

export interface GameStateResponse {
  id: string;
  config: GameConfig;
  playerIndex: number;
  currentRound: number;
  currentPrices: Prices;
  myChoice: number | null;
  choicesSubmitted: number[];
  rounds: RoundData[];
  status: "waiting" | "in-round" | "complete";
  result?: {
    assignment: [number, number, number];
    prices: Prices;
    incomeAdjustedPrices?: Prices;
  };
  totalPlayers: number;
}

export interface CreateGameResult {
  gameId: string;
  tokens: [string, string, string];
  playerNames: [string, string, string];
}

export async function createGame(
  config: GameConfig,
): Promise<CreateGameResult> {
  const resp = await fetch(`${API_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  if (!resp.ok) throw new Error("Failed to create game");
  return resp.json();
}

export async function fetchGameState(
  gameId: string,
  token: string,
): Promise<GameStateResponse> {
  const resp = await fetch(`${API_BASE}/${gameId}/state?token=${token}`);
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch game state");
  }
  return resp.json();
}

export async function submitChoice(
  gameId: string,
  token: string,
  room: number,
): Promise<GameStateResponse> {
  const resp = await fetch(`${API_BASE}/${gameId}/choice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, room }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Failed to submit choice");
  }
  return resp.json();
}

/**
 * Hook: poll game state every `intervalMs`.
 * Returns the latest state and helper functions.
 */
export function useGamePolling(
  gameId: string | null,
  token: string | null,
  intervalMs = 2000,
) {
  const [state, setState] = useState<GameStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastRound = useRef(0);

  const poll = useCallback(async () => {
    if (!gameId || !token) return;
    try {
      const data = await fetchGameState(gameId, token);
      setState(data);
      setError(null);

      // Track round changes
      if (data.currentRound !== lastRound.current) {
        lastRound.current = data.currentRound;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection lost");
    }
  }, [gameId, token]);

  useEffect(() => {
    if (!gameId || !token) return;
    poll(); // immediate first fetch
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [gameId, token, intervalMs, poll]);

  const makeChoice = useCallback(
    async (room: number) => {
      if (!gameId || !token) return;
      setSubmitting(true);
      try {
        const data = await submitChoice(gameId, token, room);
        setState(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit");
      } finally {
        setSubmitting(false);
      }
    },
    [gameId, token],
  );

  return { state, error, submitting, makeChoice, refetch: poll };
}

/**
 * Build a player invite link.
 */
export function buildPlayerLink(gameId: string, token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/?game=${gameId}&token=${token}`;
}
