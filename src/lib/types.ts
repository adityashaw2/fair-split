export interface Person {
  name: string;
  income?: number;
}

export interface Room {
  name: string;
  description: string;
}

export interface GameConfig {
  people: [Person, Person, Person];
  rooms: [Room, Room, Room];
  totalRent: number;
  useIncomeWeighting: boolean;
}

export type Prices = [number, number, number];
/** choices[personIndex] = roomIndex they prefer */
export type Choices = [number, number, number];

export interface RoundData {
  round: number;
  prices: Prices;
  choices: Choices;
  isEnvyFree: boolean;
}

export interface Allocation {
  /** assignment[personIndex] = roomIndex */
  assignment: [number, number, number];
  prices: Prices;
  rounds: RoundData[];
  incomeAdjustedPrices?: Prices;
}

export type AppPhase = "setup" | "round" | "result";
