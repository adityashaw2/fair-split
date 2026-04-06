import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import type { GameConfig, Prices, Choices } from "@/lib/types";
import { roomColor, personColor } from "@/lib/constants";
import { formatCurrency } from "@/lib/algorithm";

interface Props {
  config: GameConfig;
  prices: Prices;
  round: number;
  softLimit?: number;
  onSubmitChoices: (choices: Choices) => void;
  onRestart: () => void;
}

export function RoundView({
  config,
  prices,
  round,
  softLimit,
  onSubmitChoices,
  onRestart,
}: Props) {
  const n = config.people.length;
  const [currentPerson, setCurrentPerson] = useState(0);
  const [choices, setChoices] = useState<(number | null)[]>(
    new Array(n).fill(null),
  );

  const handlePickRoom = (roomIdx: number) => {
    const next = [...choices];
    next[currentPerson] = roomIdx;
    setChoices(next);

    if (currentPerson < n - 1) {
      setTimeout(() => setCurrentPerson(currentPerson + 1), 300);
    }
  };

  const allChosen = choices.every((c) => c !== null);

  const handleSubmit = () => {
    if (!allChosen) return;
    onSubmitChoices(choices as Choices);
    setCurrentPerson(0);
    setChoices(new Array(n).fill(null));
  };

  const handleResetPerson = (pIdx: number) => {
    const next = [...choices];
    next[pIdx] = null;
    setChoices(next);
    setCurrentPerson(pIdx);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Round header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">Round {round}</h2>
              {softLimit && round > softLimit && (
                <span className="text-xs text-accent px-2 py-0.5 rounded-full bg-accent/10">
                  overtime
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              {config.people[currentPerson].name}, pick your preferred room
            </p>
          </div>
          <button
            onClick={onRestart}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
            title="Start over"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots for people */}
        <div className={`grid gap-2 mb-6 ${n <= 4 ? `grid-cols-${n}` : "grid-cols-3 sm:grid-cols-4"}`}
             style={n > 4 ? { gridTemplateColumns: `repeat(${Math.min(n, 5)}, 1fr)` } : undefined}
        >
          {config.people.map((person, i) => (
            <button
              key={i}
              onClick={() => choices[i] !== null && handleResetPerson(i)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-sm transition-all ${
                i === currentPerson
                  ? "border-accent/50 bg-accent/5"
                  : choices[i] !== null
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-surface"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  choices[i] !== null
                    ? "bg-success text-black"
                    : i === currentPerson
                      ? "bg-accent text-black"
                      : "bg-surface-3 text-text-muted"
                }`}
              >
                {choices[i] !== null ? (
                  <Check className="w-3 h-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`truncate ${i === currentPerson ? "text-text" : "text-text-secondary"}`}
              >
                {person.name}
              </span>
            </button>
          ))}
        </div>

        {/* Room cards */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {config.rooms.map((room, rIdx) => {
              const color = roomColor(rIdx);
              const isChosenByCurrent = choices[currentPerson] === rIdx;
              const chosenByOther = choices.findIndex(
                (c, i) => c === rIdx && i !== currentPerson,
              );

              return (
                <motion.button
                  key={`${currentPerson}-${rIdx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rIdx * 0.05 }}
                  onClick={() =>
                    choices[currentPerson] === null && handlePickRoom(rIdx)
                  }
                  disabled={choices[currentPerson] !== null}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isChosenByCurrent
                      ? `${color.bg} ${color.border} scale-[1.02]`
                      : choices[currentPerson] !== null
                        ? "border-border bg-surface opacity-50"
                        : `border-border bg-surface hover:${color.border} hover:${color.bg} hover:scale-[1.01] active:scale-[0.99]`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${color.text}`}>
                          {room.name}
                        </h3>
                        {isChosenByCurrent && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded"
                          >
                            Your pick
                          </motion.span>
                        )}
                        {chosenByOther >= 0 && chosenByOther !== currentPerson && (
                          <span className="text-xs text-text-muted">
                            {config.people[chosenByOther].name}'s pick
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {room.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${color.text}`}>
                        {formatCurrency(prices[rIdx])}
                      </p>
                      <p className="text-xs text-text-muted">
                        {((prices[rIdx] / config.totalRent) * 100).toFixed(0)}%
                        of rent
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <AnimatePresence>
          {allChosen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              {/* Summary */}
              <div className="bg-surface rounded-xl border border-border p-4 mb-4">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
                  Choices this round
                </p>
                {config.people.map((person, pIdx) => {
                  const roomIdx = choices[pIdx]!;
                  const room = config.rooms[roomIdx];
                  const color = roomColor(roomIdx);
                  return (
                    <div
                      key={pIdx}
                      className="flex items-center justify-between py-1"
                    >
                      <span className={`text-sm ${personColor(pIdx)}`}>
                        {person.name}
                      </span>
                      <span className={`text-sm font-medium ${color.text}`}>
                        {room.name} — {formatCurrency(prices[roomIdx])}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg py-3 transition-colors"
              >
                Lock in choices
                <Check className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-text-muted">
            💡 Be honest — pick the room you'd actually want at these prices.
            <br />
            The algorithm adjusts until no one envies anyone else.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
