export interface Bet {
  amount: number;
  type: "number" | "color" | "odd" | "even";
  selection: number | "red" | "black" | "odd" | "even";
}

export interface Result {
  winningNumber: number;
  winningColor: "red" | "black" | "green";
  payouts: Record<string, number>;
}

export interface Player {
  name: string;
  balance: number;
  bets: Bet[];
}