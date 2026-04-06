export const ROOM_COLORS = [
  { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", accent: "#3b82f6" },
  { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", accent: "#8b5cf6" },
  { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400", accent: "#ec4899" },
] as const;

export const PERSON_COLORS = [
  "text-amber-400",
  "text-emerald-400",
  "text-cyan-400",
] as const;

export const DEFAULT_ROOMS = [
  { name: "Room A", description: "Biggest, with balcony" },
  { name: "Room B", description: "Medium, decent" },
  { name: "Room C", description: "Smallest" },
];

export const DEFAULT_PEOPLE = [
  { name: "Person 1" },
  { name: "Person 2" },
  { name: "Person 3" },
];
