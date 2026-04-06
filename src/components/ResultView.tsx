import { motion } from "framer-motion";
import { Trophy, RotateCcw, Share2, CheckCircle } from "lucide-react";
import type { GameConfig, Allocation } from "@/lib/types";
import { ROOM_COLORS, PERSON_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/algorithm";
import { TriangleViz } from "./TriangleViz";

interface Props {
  config: GameConfig;
  allocation: Allocation;
  onRestart: () => void;
}

export function ResultView({ config, allocation, onRestart }: Props) {
  const { assignment, prices, rounds } = allocation;
  const displayPrices = prices;

  const handleShare = async () => {
    const lines = config.people.map((person, pIdx) => {
      const roomIdx = assignment[pIdx];
      return `${person.name} → ${config.rooms[roomIdx].name}: ${formatCurrency(displayPrices[roomIdx])}`;
    });
    const text = `Fair Split Results 🏠\n\nTotal Rent: ${formatCurrency(config.totalRent)}\n\n${lines.join("\n")}\n\nSolved in ${rounds.length} round${rounds.length !== 1 ? "s" : ""} using Su's Rental Harmony Theorem\n\nhttps://fair-split.vercel.app`;

    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Trophy className="w-12 h-12 text-accent mx-auto mb-3" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-1">
            {allocation.exactEnvyFree === false ? "Best-Fit Allocation" : "Envy-Free Allocation"}
          </h2>
          <p className="text-sm text-text-secondary">
            {allocation.exactEnvyFree === false
              ? `Computed from ${rounds.length} rounds of preferences`
              : `Solved in ${rounds.length} round${rounds.length !== 1 ? "s" : ""} — nobody wants to swap`}
          </p>
        </motion.div>

        {/* Allocation cards */}
        <div className="space-y-3 mb-6">
          {config.people.map((person, pIdx) => {
            const roomIdx = assignment[pIdx];
            const room = config.rooms[roomIdx];
            const color = ROOM_COLORS[roomIdx];
            const price = displayPrices[roomIdx];
            const pct = ((price / config.totalRent) * 100).toFixed(1);

            return (
              <motion.div
                key={pIdx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: pIdx * 0.12 }}
                className={`p-4 rounded-xl border-2 ${color.border} ${color.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${PERSON_COLORS[pIdx]}`}
                    >
                      {person.name}
                    </p>
                    <p className={`text-lg font-bold ${color.text}`}>
                      {room.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {room.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${color.text}`}>
                      {formatCurrency(price)}
                    </p>
                    <p className="text-xs text-text-muted">{pct}% of rent</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total verification */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-surface rounded-xl border border-border p-4 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="font-bold">
              {formatCurrency(
                displayPrices[0] + displayPrices[1] + displayPrices[2],
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-success text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>
              {allocation.exactEnvyFree === false
                ? "Best allocation based on revealed preferences"
                : "Envy-free — no one wants to switch rooms"}
            </span>
          </div>

        </motion.div>

        {/* Triangle visualization */}
        {rounds.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
              Convergence Path
            </p>
            <TriangleViz
              rounds={rounds}
              config={config}
              finalPrices={displayPrices}
            />
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3"
        >
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 bg-surface hover:bg-surface-2 border border-border rounded-lg py-3 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Split
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black rounded-lg py-3 text-sm font-semibold transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share Result
          </button>
        </motion.div>

        {/* Algorithm explanation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <details className="text-left">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors text-center">
              How does this work?
            </summary>
            <div className="mt-3 bg-surface rounded-xl border border-border p-4 text-sm text-text-secondary space-y-2">
              <p>
                This uses <strong>Su's Rental Harmony Theorem</strong> (1999),
                which proves that an envy-free rent division always exists using{" "}
                <strong>Sperner's lemma</strong> from combinatorial topology.
              </p>
              <p>
                The algorithm proposes room prices and asks each person to pick
                their preferred room. If two people want the same room, its
                price goes up. This process provably converges to a point where
                everyone prefers a different room at the given prices.
              </p>
              <p>
                The result is <strong>envy-free</strong>: no one would rather
                have someone else's room at someone else's price.
              </p>
            </div>
          </details>
        </motion.div>
      </motion.div>
    </div>
  );
}
