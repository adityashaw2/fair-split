import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, Users, Loader2, AlertCircle, Wifi, WifiOff, Pause, ArrowRight, CheckCircle } from "lucide-react";
import type { GameStateResponse } from "@/lib/multiplayer";
import { continueGame, acceptBest } from "@/lib/multiplayer";
import { ROOM_COLORS, PERSON_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/algorithm";
import { ResultView } from "./ResultView";

interface Props {
  state: GameStateResponse;
  gameId: string;
  token: string;
  error: string | null;
  submitting: boolean;
  onChoice: (room: number) => void;
  onRestart: () => void;
}

export function MultiplayerView({
  state,
  gameId,
  token,
  error,
  submitting,
  onChoice,
  onRestart,
}: Props) {
  const [acting, setActing] = useState(false);
  const { config, playerIndex, currentRound, currentPrices, myChoice, choicesSubmitted, status, result, checkpointPreview } = state;
  const myName = config.people[playerIndex].name;

  // Game complete → show result
  if (status === "complete" && result) {
    return (
      <ResultView
        config={config}
        allocation={{
          assignment: result.assignment,
          prices: result.incomeAdjustedPrices || result.prices,
          rounds: state.rounds,
        }}
        onRestart={onRestart}
      />
    );
  }

  // Checkpoint — ask to continue or accept
  if (status === "checkpoint" && checkpointPreview) {
    const handleContinue = async () => {
      setActing(true);
      try { await continueGame(gameId, token); } catch {}
      setActing(false);
    };
    const handleAccept = async () => {
      setActing(true);
      try { await acceptBest(gameId, token); } catch {}
      setActing(false);
    };

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div className="w-full max-w-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center mb-6">
            <Pause className="w-10 h-10 text-accent mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">{state.rounds.length} rounds — no envy-free split yet</h2>
            <p className="text-sm text-text-secondary">Keep going or accept the best allocation so far?</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Best allocation</p>
            {config.people.map((person, pIdx) => {
              const roomIdx = checkpointPreview.assignment[pIdx];
              const room = config.rooms[roomIdx];
              const color = ROOM_COLORS[roomIdx];
              return (
                <div key={pIdx} className="flex items-center justify-between py-1.5">
                  <span className={`text-sm ${PERSON_COLORS[pIdx]}`}>{person.name}</span>
                  <span className={`text-sm font-semibold ${color.text}`}>
                    {room.name} — {formatCurrency(checkpointPreview.prices[roomIdx])}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="space-y-3">
            <button onClick={handleContinue} disabled={acting}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg py-3 transition-colors disabled:opacity-50">
              Keep going <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={handleAccept} disabled={acting}
              className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-surface-2 border border-border text-text font-medium rounded-lg py-3 transition-colors disabled:opacity-50">
              <CheckCircle className="w-4 h-4" /> Accept this
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const waiting = myChoice !== null;
  const othersWaiting = [0, 1, 2].filter(
    (i) => i !== playerIndex && !choicesSubmitted.includes(i),
  );

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold">Round {currentRound}</h2>
            <p className="text-sm text-text-secondary">
              Playing as{" "}
              <span className={`font-semibold ${PERSON_COLORS[playerIndex]}`}>
                {myName}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            {error ? (
              <WifiOff className="w-3.5 h-3.5 text-error" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-success" />
            )}
            Live
          </div>
        </div>

        {/* Player status bar */}
        <div className="flex gap-2 mb-6">
          {config.people.map((person, i) => {
            const hasSubmitted = choicesSubmitted.includes(i);
            const isMe = i === playerIndex;
            return (
              <div
                key={i}
                className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${
                  hasSubmitted
                    ? "border-success/30 bg-success/5"
                    : isMe && myChoice === null
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-surface"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    hasSubmitted
                      ? "bg-success text-black"
                      : isMe
                        ? "bg-accent text-black"
                        : "bg-surface-3 text-text-muted"
                  }`}
                >
                  {hasSubmitted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                </div>
                <span className="truncate text-xs">
                  {isMe ? "You" : person.name}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg p-3 mb-4 text-sm text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Room selection or waiting state */}
        <AnimatePresence mode="wait">
          {!waiting ? (
            <motion.div
              key="choosing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-text-secondary mb-4">
                Which room would you pick at these prices?
              </p>

              {config.rooms.map((room, rIdx) => {
                const color = ROOM_COLORS[rIdx];
                return (
                  <motion.button
                    key={rIdx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rIdx * 0.05 }}
                    onClick={() => !submitting && onChoice(rIdx)}
                    disabled={submitting}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all border-border bg-surface hover:${color.border} hover:${color.bg} hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-semibold ${color.text}`}>
                          {room.name}
                        </h3>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {room.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${color.text}`}>
                          {formatCurrency(currentPrices[rIdx])}
                        </p>
                        <p className="text-xs text-text-muted">
                          {((currentPrices[rIdx] / config.totalRent) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              {submitting && (
                <div className="flex items-center justify-center gap-2 text-sm text-text-muted py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-4"
              >
                <Loader2 className="w-8 h-8 text-accent" />
              </motion.div>

              <h3 className="text-lg font-semibold mb-2">
                You picked{" "}
                <span className={ROOM_COLORS[myChoice!].text}>
                  {config.rooms[myChoice!].name}
                </span>
              </h3>

              {othersWaiting.length > 0 ? (
                <p className="text-sm text-text-secondary">
                  Waiting for{" "}
                  {othersWaiting
                    .map((i) => config.people[i].name)
                    .join(" and ")}
                  ...
                </p>
              ) : (
                <p className="text-sm text-text-secondary">
                  Processing results...
                </p>
              )}

              {/* Show your choice */}
              <div className="mt-6 inline-block">
                <div
                  className={`px-4 py-3 rounded-xl border-2 ${ROOM_COLORS[myChoice!].border} ${ROOM_COLORS[myChoice!].bg}`}
                >
                  <p className={`font-semibold ${ROOM_COLORS[myChoice!].text}`}>
                    {config.rooms[myChoice!].name} —{" "}
                    {formatCurrency(currentPrices[myChoice!])}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {config.rooms[myChoice!].description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted">
            {waiting
              ? "Prices will adjust after everyone picks. Next round starts automatically."
              : "💡 Pick honestly — the algorithm finds the fairest split."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
