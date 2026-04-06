import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Users,
  IndianRupee,
  ChevronRight,
  Wallet,
  Sparkles,
} from "lucide-react";
import type { GameConfig, Person, Room } from "@/lib/types";
import { DEFAULT_ROOMS } from "@/lib/constants";

interface Props {
  onStart: (config: GameConfig) => void;
  onStartMultiplayer?: (config: GameConfig) => void;
}

export function Setup({ onStart, onStartMultiplayer }: Props) {
  const [people, setPeople] = useState<[Person, Person, Person]>([
    { name: "" },
    { name: "" },
    { name: "" },
  ]);
  const [rooms, setRooms] = useState<[Room, Room, Room]>([
    { ...DEFAULT_ROOMS[0] },
    { ...DEFAULT_ROOMS[1] },
    { ...DEFAULT_ROOMS[2] },
  ]);
  const [totalRent, setTotalRent] = useState<string>("");
  const [showIncome, setShowIncome] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePerson = (idx: number, updates: Partial<Person>) => {
    const next = [...people] as [Person, Person, Person];
    next[idx] = { ...next[idx], ...updates };
    setPeople(next);
  };

  const updateRoom = (idx: number, updates: Partial<Room>) => {
    const next = [...rooms] as [Room, Room, Room];
    next[idx] = { ...next[idx], ...updates };
    setRooms(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rent = Number(totalRent);
    if (!rent || rent <= 0) {
      setError("Enter a valid rent amount");
      return;
    }

    const names = people.map((p) => p.name.trim());
    if (names.some((n) => !n)) {
      setError("All names are required");
      return;
    }
    if (new Set(names).size < 3) {
      setError("Names must be unique");
      return;
    }

    if (showIncome) {
      const incomes = people.map((p) => p.income || 0);
      if (incomes.some((i) => i <= 0)) {
        setError("All incomes must be positive when income weighting is on");
        return;
      }
    }

    onStart({
      people: people.map((p) => ({
        ...p,
        name: p.name.trim(),
      })) as [Person, Person, Person],
      rooms,
      totalRent: rent,
      useIncomeWeighting: showIncome,
    });
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
          {/* People */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Roommates
              </h2>
            </div>
            <div className="space-y-2">
              {people.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Person ${i + 1}`}
                    value={p.name}
                    onChange={(e) => updatePerson(i, { name: e.target.value })}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  {showIncome && (
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="Income"
                        value={p.income || ""}
                        onChange={(e) =>
                          updatePerson(i, {
                            income: Number(e.target.value) || undefined,
                          })
                        }
                        className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                  )}
                </div>
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
                    placeholder={DEFAULT_ROOMS[i].description}
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

          {/* Income toggle */}
          <motion.div variants={itemVariants}>
            <button
              type="button"
              onClick={() => setShowIncome(!showIncome)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
            >
              <div
                className={`w-9 h-5 rounded-full transition-colors relative ${showIncome ? "bg-accent" : "bg-surface-3"}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showIncome ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
              <Wallet className="w-4 h-4" />
              Weight by income
            </button>
            {showIncome && (
              <p className="text-xs text-text-muted mt-1.5 ml-11">
                Adjusts final prices so rent-to-income ratio is balanced
              </p>
            )}
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
                  // Validate same as submit, then call multiplayer
                  const rent = Number(totalRent);
                  if (!rent || rent <= 0) { setError("Enter a valid rent amount"); return; }
                  const names = people.map((p) => p.name.trim());
                  if (names.some((n) => !n)) { setError("All names are required"); return; }
                  if (new Set(names).size < 3) { setError("Names must be unique"); return; }
                  if (showIncome && people.some((p) => !p.income || p.income <= 0)) {
                    setError("All incomes must be positive when income weighting is on"); return;
                  }
                  setError(null);
                  onStartMultiplayer({
                    people: people.map((p) => ({ ...p, name: p.name.trim() })) as [Person, Person, Person],
                    rooms,
                    totalRent: rent,
                    useIncomeWeighting: showIncome,
                  });
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
