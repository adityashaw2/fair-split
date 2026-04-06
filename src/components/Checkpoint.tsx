import { motion } from "framer-motion";
import { Pause, ArrowRight, CheckCircle } from "lucide-react";
import type { GameConfig, RoundData, Prices } from "@/lib/types";
import { fallbackAllocation, formatCurrency } from "@/lib/algorithm";
import { roomColor, personColor } from "@/lib/constants";

interface Props {
  config: GameConfig;
  rounds: RoundData[];
  currentPrices: Prices;
  onKeepGoing: () => void;
  onAcceptBest: () => void;
}

export function Checkpoint({
  config,
  rounds,
  currentPrices,
  onKeepGoing,
  onAcceptBest,
}: Props) {
  const fb = fallbackAllocation(rounds, config.totalRent, config.people.length);
  const roundCount = rounds.length;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 mb-4">
            <Pause className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-xl font-bold mb-1">
            {roundCount} rounds and counting
          </h2>
          <p className="text-sm text-text-secondary">
            No envy-free split found yet. Your preferences are close — keep
            going or accept the best allocation so far?
          </p>
        </div>

        {/* Best allocation preview */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-6">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
            Best allocation from {roundCount} rounds
          </p>
          <div className="space-y-2">
            {config.people.map((person, pIdx) => {
              const roomIdx = fb.assignment[pIdx];
              const room = config.rooms[roomIdx];
              const color = roomColor(roomIdx);
              return (
                <div
                  key={pIdx}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${personColor(pIdx)}`}>
                      {person.name}
                    </span>
                    <span className="text-text-muted">→</span>
                    <span className={`text-sm font-semibold ${color.text}`}>
                      {room.name}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${color.text}`}>
                    {formatCurrency(fb.prices[roomIdx])}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-muted mt-3">
            Based on who preferred which room most consistently
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onKeepGoing}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg py-3 transition-colors"
          >
            Keep going
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onAcceptBest}
            className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-surface-2 border border-border text-text font-medium rounded-lg py-3 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Accept this allocation
          </button>
        </div>

        <p className="text-xs text-text-muted text-center mt-4">
          More rounds = finer price adjustments. The algorithm will keep
          narrowing until everyone picks a different room.
        </p>
      </motion.div>
    </div>
  );
}
