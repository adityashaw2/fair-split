import { useState, useCallback, useEffect } from "react";
import type {
  AppPhase,
  GameConfig,
  Prices,
  Choices,
  RoundData,
  Allocation,
} from "@/lib/types";
import {
  initialPrices,
  computeNextPrices,
  getStepForRound,
  isEnvyFree,
  fixRounding,
  fallbackAllocation,
} from "@/lib/algorithm";
import {
  createGame,
  useGamePolling,
  buildPlayerLink,
  type CreateGameResult,
} from "@/lib/multiplayer";
import { Setup } from "@/components/Setup";
import { RoundView } from "@/components/RoundView";
import { ResultView } from "@/components/ResultView";
import { ShareLinks } from "@/components/ShareLinks";
import { MultiplayerView } from "@/components/MultiplayerView";
import { Checkpoint } from "@/components/Checkpoint";

const SOFT_LIMIT = 15; // suggest stopping, but don't force it

type Mode = "local" | "multiplayer-host" | "multiplayer-player";

export default function App() {
  // ── URL-based join detection ──────────────────────────────────────
  const [joinGameId, setJoinGameId] = useState<string | null>(null);
  const [joinToken, setJoinToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const game = params.get("game");
    const token = params.get("token");
    if (game && token) {
      setJoinGameId(game);
      setJoinToken(token);
      setMode("multiplayer-player");
      setPhase("multiplayer-play");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── State ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("local");
  const [phase, setPhase] = useState<
    AppPhase | "share-links" | "multiplayer-play" | "checkpoint"
  >("setup");

  // Local mode state
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Prices>([0, 0, 0]);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [allocation, setAllocation] = useState<Allocation | null>(null);

  // Multiplayer state
  const [gameResult, setGameResult] = useState<CreateGameResult | null>(null);
  const [hostGameId, setHostGameId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);

  // Determine active game/token for polling
  const activeGameId = mode === "multiplayer-host" ? hostGameId : joinGameId;
  const activeToken = mode === "multiplayer-host" ? hostToken : joinToken;

  const { state: mpState, error: mpError, submitting, makeChoice } =
    useGamePolling(
      phase === "multiplayer-play" ? activeGameId : null,
      phase === "multiplayer-play" ? activeToken : null,
    );

  // ── Local mode handlers ───────────────────────────────────────────

  const handleStartLocal = useCallback((cfg: GameConfig) => {
    setMode("local");
    setConfig(cfg);
    const prices = initialPrices(cfg.totalRent);
    setCurrentPrices(prices);
    setRounds([]);
    setAllocation(null);
    setPhase("round");
  }, []);

  const handleChoices = useCallback(
    (choices: Choices) => {
      if (!config) return;
      const roundNum = rounds.length + 1;
      const envyFree = isEnvyFree(choices);
      const roundData: RoundData = {
        round: roundNum,
        prices: currentPrices,
        choices,
        isEnvyFree: envyFree,
      };
      const newRounds = [...rounds, roundData];
      setRounds(newRounds);

      if (envyFree) {
        setAllocation({
          assignment: choices,
          prices: fixRounding(currentPrices, config.totalRent),
          rounds: newRounds,
        });
        setPhase("result");
      } else if (roundNum >= SOFT_LIMIT && roundNum % SOFT_LIMIT === 0) {
        // Hit soft limit — ask if they want to continue or accept best
        const step = getStepForRound(config.totalRent, roundNum);
        const next = computeNextPrices(currentPrices, choices, config.totalRent, step);
        setCurrentPrices(fixRounding(next, config.totalRent));
        setPhase("checkpoint");
      } else {
        const step = getStepForRound(config.totalRent, roundNum);
        const next = computeNextPrices(currentPrices, choices, config.totalRent, step);
        setCurrentPrices(fixRounding(next, config.totalRent));
      }
    },
    [config, currentPrices, rounds],
  );

  // ── Checkpoint handlers ────────────────────────────────────────────

  const handleKeepGoing = useCallback(() => {
    setPhase("round");
  }, []);

  const handleAcceptBest = useCallback(() => {
    if (!config) return;
    const fb = fallbackAllocation(rounds, config.totalRent);
    setAllocation({
      assignment: fb.assignment,
      prices: fb.prices,
      rounds,
    });
    setPhase("result");
  }, [config, rounds]);

  // ── Multiplayer host handlers ─────────────────────────────────────

  const handleStartMultiplayer = useCallback(async (cfg: GameConfig) => {
    setMode("multiplayer-host");
    setConfig(cfg);

    try {
      const result = await createGame(cfg);
      setGameResult(result);
      setHostGameId(result.gameId);
      setHostToken(result.tokens[0]); // host is player 0
      setPhase("share-links");
    } catch (err) {
      console.error("Failed to create game:", err);
      alert("Failed to create shared game. Try again.");
    }
  }, []);

  const handleHostJoin = useCallback(() => {
    setPhase("multiplayer-play");
  }, []);

  // ── Restart ───────────────────────────────────────────────────────

  const handleRestart = useCallback(() => {
    setMode("local");
    setPhase("setup");
    setConfig(null);
    setRounds([]);
    setAllocation(null);
    setGameResult(null);
    setHostGameId(null);
    setHostToken(null);
    setJoinGameId(null);
    setJoinToken(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  switch (phase) {
    case "setup":
      return (
        <Setup
          onStart={handleStartLocal}
          onStartMultiplayer={handleStartMultiplayer}
        />
      );

    case "round":
      return (
        <RoundView
          config={config!}
          prices={currentPrices}
          round={rounds.length + 1}
          totalRounds={SOFT_LIMIT}
          onSubmitChoices={handleChoices}
          onRestart={handleRestart}
        />
      );

    case "result":
      return (
        <ResultView
          config={config!}
          allocation={allocation!}
          onRestart={handleRestart}
        />
      );

    case "checkpoint":
      return (
        <Checkpoint
          config={config!}
          rounds={rounds}
          currentPrices={currentPrices}
          onKeepGoing={handleKeepGoing}
          onAcceptBest={handleAcceptBest}
        />
      );

    case "share-links":
      return (
        <ShareLinks game={gameResult!} onJoinAsHost={handleHostJoin} />
      );

    case "multiplayer-play":
      if (!mpState) {
        return (
          <div className="min-h-dvh flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-text-secondary text-sm">Connecting to game...</p>
              {mpError && (
                <p className="text-error text-sm mt-2">{mpError}</p>
              )}
            </div>
          </div>
        );
      }
      return (
        <MultiplayerView
          state={mpState}
          gameId={activeGameId!}
          token={activeToken!}
          error={mpError}
          submitting={submitting}
          onChoice={makeChoice}
          onRestart={handleRestart}
        />
      );
  }
}
