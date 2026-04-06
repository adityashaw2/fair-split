export interface Person {
  name: string;
}

export interface Room {
  name: string;
  description: string;
}

export interface GameConfig {
  people: Person[];
  rooms: Room[];
  totalRent: number;
}

export type Prices = number[];
/** choices[personIndex] = roomIndex they prefer */
export type Choices = number[];

export interface RoundData {
  round: number;
  prices: Prices;
  choices: Choices;
  isEnvyFree: boolean;
}

export interface Allocation {
  /** assignment[personIndex] = roomIndex */
  assignment: number[];
  prices: Prices;
  rounds: RoundData[];
  /** true if found via direct envy-free, false if auto-resolved */
  exactEnvyFree?: boolean;
}

export type AppPhase = "setup" | "round" | "result";
