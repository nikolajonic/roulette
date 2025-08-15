export type BetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "dozen"
  | "column"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high";

export interface Bet {
  type: BetType;
  numbers: number[];
  amount: number;
}

export const payoutMultipliers: Record<BetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  line: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  low: 1,
  high: 1,
};
