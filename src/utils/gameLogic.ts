// utils/gameLogic.ts
import type { Bet } from "../game/BetTypes";
import { payoutMultipliers } from "../game/BetTypes";
import { redSet, blackSet } from "../constants";

export function validateBet(amount: number, balance: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= balance;
}

export function calculateProfit(bet: Bet, winningNumber: number): number {
  if (!isValidWinningNumber(winningNumber)) return 0;
  if (!betWins(bet, winningNumber)) return 0;
  const mult = payoutMultipliers[bet.type] ?? 0;
  return bet.amount * mult;
}

export function calculateReturn(bet: Bet, winningNumber: number): number {
  if (!isValidWinningNumber(winningNumber)) return 0;
  if (!betWins(bet, winningNumber)) return 0;
  const mult = payoutMultipliers[bet.type] ?? 0;
  return bet.amount * (mult + 1);
}

function isValidWinningNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 36;
}

function betWins(bet: Bet, n: number): boolean {
  switch (bet.type) {
    case "red":
      return n !== 0 && redSet.has(n);
    case "black":
      return n !== 0 && blackSet.has(n);
    case "even":
      return n !== 0 && n % 2 === 0;
    case "odd":
      return n !== 0 && n % 2 === 1;
    case "low":
      return n >= 1 && n <= 18;
    case "high":
      return n >= 19 && n <= 36;
    case "dozen":
    case "column":
    case "straight":
    case "split":
    case "street":
    case "corner":
    case "line":
      return bet.numbers?.includes(n) ?? false;
    default:
      return false;
  }
}

export function numbersForDozen(index: 1 | 2 | 3): number[] {
  const start = (index - 1) * 12 + 1;
  return Array.from({ length: 12 }, (_, i) => start + i);
}

export function numbersForColumn(index: 1 | 2 | 3): number[] {
  return Array.from({ length: 12 }, (_, i) => i * 3 + index);
}
