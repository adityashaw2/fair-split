export const ROOM_COLORS = [
  { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", accent: "#3b82f6" },
  { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", accent: "#8b5cf6" },
  { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400", accent: "#ec4899" },
  { bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400", accent: "#14b8a6" },
  { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", accent: "#f97316" },
  { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", accent: "#6366f1" },
  { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", accent: "#f43f5e" },
  { bg: "bg-lime-500/10", border: "border-lime-500/30", text: "text-lime-400", accent: "#84cc16" },
  { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-400", accent: "#0ea5e9" },
  { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", text: "text-fuchsia-400", accent: "#d946ef" },
];

export const PERSON_COLORS = [
  "text-amber-400",
  "text-emerald-400",
  "text-cyan-400",
  "text-rose-400",
  "text-lime-400",
  "text-sky-400",
  "text-fuchsia-400",
  "text-orange-400",
  "text-indigo-400",
  "text-teal-400",
];

/** Safe color access with wrap-around for large N */
export function roomColor(idx: number) {
  return ROOM_COLORS[idx % ROOM_COLORS.length];
}

export function personColor(idx: number) {
  return PERSON_COLORS[idx % PERSON_COLORS.length];
}

export const DEFAULT_ROOM_NAMES = [
  "Room A", "Room B", "Room C", "Room D", "Room E",
  "Room F", "Room G", "Room H", "Room I", "Room J",
];

export const DEFAULT_ROOM_DESCRIPTIONS = [
  "Biggest, with balcony",
  "Medium, decent",
  "Smallest",
  "Corner room",
  "Next to bathroom",
  "With window",
  "Quiet side",
  "Street-facing",
  "Top floor",
  "Ground floor",
];

export function makeDefaultRooms(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    name: DEFAULT_ROOM_NAMES[i] || `Room ${String.fromCharCode(65 + i)}`,
    description: DEFAULT_ROOM_DESCRIPTIONS[i] || "",
  }));
}

export function makeDefaultPeople(n: number) {
  return Array.from({ length: n }, (_, i) => ({ name: "" }));
}
