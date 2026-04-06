import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Users,
  IndianRupee,
  ChevronRight,
  Sparkles,
  Minus,
  Plus,
} from "lucide-react";
import type { GameConfig, Person, Room } from "@/lib/types";
import { makeDefaultRooms, makeDefaultPeople } from "@/lib/constants";

interface Props {
  onStart: (config: GameConfig) => void;
  onStartMultiplayer?: (config: GameConfig) => void;
}

const MIN_COUNT = 2;
const MAX_COUNT = 10;

export function Setup({ onStart, onStartMultiplayer }: Props) {
  const [count, setCount] = useState(3);
  const [people, setPeople] = useState<Person[]>(makeDefaultPeople(3));
  const [rooms, setRooms] = useState<Room[]>(makeDefaultRooms(3));
  const [totalRent, setTotalRent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleCountChange = (n: number) => {
    const clamped = Math.min(MAX_COUNT, Math.max(MIN_COUNT, n));
    setCount(clamped);

    // Resize people array
    setPeople((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...makeDefaultPeople(clamped - prev.length)];
      }
      return prev.slice(0, clamped);
    });

    // Resize rooms array
    setRooms((prev) => {
      if (clamped > prev.length) {
        const defaults = makeDefaultRooms(clamped);
        return [...prev, ...defaults.slice(prev.length)];
      }
      return prev.slice(0, clamped);
    });
  };

  const updatePerson = (idx: number, updates: Partial<Person>) => {
    const next = [...people];
    next[idx] = { ...next[idx], ...updates };
    setPeople(next);
  };

  const updateRoom = (idx: number, updates: Partial<Room>) => {
    const next = [...rooms];
    next[idx] = { ...next[idx], ...updates };
    setRooms(next);
  };

  const validate = (): GameConfig | null => {
    setError(null);
    const rent = Number(totalRent);
    if (!rent || rent <= 0) {
      setError("Enter a valid rent amount");
      return null;
    }
    const names = people.map((p) => p.name.trim());
    if (names.some((n) => !n)) {
      setError("All names are required");
      return null;
    }
    if (new Set(names).size < count) {
      setError("Names must be unique");
      return null;
    }
    return {
      people: people.map((p) => ({ ...p, name: p.name.trim() })),
      rooms,
      totalRent: rent,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cfg = validate();
    if (cfg) onStart(cfg);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Su's Rental Harmony Theorem
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Fair Split
          </h1>
          <p className="text-text-secondary text-sm">
            Split rent fairly. Mathematically guaranteed.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Count selector */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                How many roommates?
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCountChange(count - 1)}
                disabled={count <= MIN_COUNT}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface border border-border hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold">{count}</span>
                <span className="text-sm text-text-muted ml-1.5">
                  {count === 2 ? "people" : "people"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCountChange(count + 1)}
                disabled={count >= MAX_COUNT}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface border border-border hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* People */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Names
              </h2>
            </div>
            <div className="space-y-2">
              {people.map((p, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Person ${i + 1}`}
                  value={p.name}
                  onChange={(e) => updatePerson(i, { name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                />
              ))}
            </div>
          </motion.div>

          {/* Rooms */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Rooms
              </h2>
            </div>
            <div className="space-y-2">
              {rooms.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Room ${String.fromCharCode(65 + i)}`}
                    value={r.name}
                    onChange={(e) => updateRoom(i, { name: e.target.value })}
                    className="w-28 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder={r.description || "Description"}
                    value={r.description}
                    onChange={(e) =>
                      updateRoom(i, { description: e.target.value })
                    }
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Rent */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Total Rent
              </h2>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                ₹
              </span>
              <input
                type="number"
                placeholder="30,000"
                value={totalRent}
                onChange={(e) => setTotalRent(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-3 text-lg placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </motion.div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-error text-sm"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <motion.div variants={itemVariants} className="space-y-3">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg py-3 transition-colors"
            >
              Play Together (Same Device)
              <ChevronRight className="w-4 h-4" />
            </button>
            {onStartMultiplayer && (
              <button
                type="button"
                onClick={() => {
                  const cfg = validate();
                  if (cfg) onStartMultiplayer(cfg);
                }}
                className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-surface-2 border border-border text-text font-semibold rounded-lg py-3 transition-colors"
              >
                <Users className="w-4 h-4" />
                Share Links (Each on Own Phone)
              </button>
            )}
          </motion.div>
        </form>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-text-muted mt-6"
        >
          Based on Francis Su's Rental Harmony Theorem (1999)
        </motion.p>
      </motion.div>
    </div>
  );
}
