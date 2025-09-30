// src/game/BetPanel.tsx
import React from "react";
import type { Bet, BetType } from "./BetTypes";
import { blackSet, redSet } from "../constants";
import { isMobile } from "pixi.js";

type Props = {
  initialBalance?: number;
  betAmount?: number;
  selectedChip?: number | null;
  onBetPlaced?: (bet: Bet) => void;
  className?: string;
};

type ChipEntry = { bet: Bet; label?: string; pos?: { x: number; y: number } };

type State = {
  balance: number;
  highlighted: Set<number>;
  chips: Record<string, ChipEntry>;
  lastBets: ChipEntry[];
};

/** ========= Mobile-aware sizing ========= **/
const BASE_CELL_SIZE = 48;
const BASE_GAP = 4;
const MOBILE_SCALE = 0.5;

// Fallback detection if PIXI's isMobile.any isn't available in your setup
const isMobileDevice =
  !!isMobile?.any ||
  (typeof navigator !== "undefined" &&
    /Mobi|Android/i.test(navigator.userAgent));

const SCALE = isMobileDevice ? MOBILE_SCALE : 1;

const cellSize = Math.max(22, Math.round(BASE_CELL_SIZE * SCALE));
const GAP = Math.max(2, Math.round(BASE_GAP * SCALE));
const LABEL_EXTRA_W = Math.round(20 * SCALE);

/** ========= Chip assets ========= **/
const CHIP_SRC = {
  green: "assets/chips/chip_green.png",
  blue: "assets/chips/chip_blue.png",
  red: "assets/chips/chip_red.png",
  yellow: "assets/chips/chip_yellow.png",
};

const chipSrcForAmount = (amount: number) => {
  if (amount >= 500) return CHIP_SRC.yellow;
  if (amount >= 200) return CHIP_SRC.red;
  if (amount >= 100) return CHIP_SRC.blue;
  return CHIP_SRC.green;
};

/** ========= Helpers for outside bets ========= **/
const numbersForLabel = (label: string): number[] => {
  switch (label) {
    case "1st 12":
      return Array.from({ length: 12 }, (_, i) => i + 1);
    case "2nd 12":
      return Array.from({ length: 12 }, (_, i) => i + 13);
    case "3rd 12":
      return Array.from({ length: 12 }, (_, i) => i + 25);
    case "1 to 18":
      return Array.from({ length: 18 }, (_, i) => i + 1);
    case "19 to 36":
      return Array.from({ length: 18 }, (_, i) => i + 19);
    case "EVEN":
      return Array.from({ length: 36 }, (_, i) => i + 1).filter(
        (n) => n % 2 === 0
      );
    case "ODD":
      return Array.from({ length: 36 }, (_, i) => i + 1).filter(
        (n) => n % 2 === 1
      );
    case "RED":
      return Array.from(redSet);
    case "BLACK":
      return Array.from(blackSet);
    case "Column 1":
      return Array.from({ length: 12 }, (_, i) => i * 3 + 1);
    case "Column 2":
      return Array.from({ length: 12 }, (_, i) => i * 3 + 2);
    case "Column 3":
      return Array.from({ length: 12 }, (_, i) => i * 3 + 3);
    default:
      return [];
  }
};

const betTypeForLabel = (label: string): BetType | null => {
  switch (label) {
    case "1st 12":
    case "2nd 12":
    case "3rd 12":
      return "dozen";
    case "Column 1":
    case "Column 2":
    case "Column 3":
      return "column";
    case "1 to 18":
      return "low";
    case "19 to 36":
      return "high";
    case "EVEN":
      return "even";
    case "ODD":
      return "odd";
    case "RED":
      return "red";
    case "BLACK":
      return "black";
    default:
      return null;
  }
};

/** ========= Board math ========= **/
const colOf = (n: number) => Math.floor((n - 1) / 3);
const rowOf = (n: number) => 3 - ((n - 1) % 3);
const nAt = (col: number, row: number) => {
  const base = col * 3;
  if (row === 1) return base + 3;
  if (row === 2) return base + 2;
  return base + 1;
};

export default class BetPanel extends React.Component<Props, State> {
  static defaultProps = { initialBalance: 1000, betAmount: 10 };

  constructor(props: Props) {
    super(props);
    this.state = {
      balance: props.initialBalance ?? 1000,
      highlighted: new Set<number>(),
      chips: {},
      lastBets: [],
    };
  }

  /** Call via ref to highlight cells (e.g., racetrack hover) */
  public highlight = (nums: number[] | null) => {
    if (!nums?.length) {
      if (this.state.highlighted.size)
        this.setState({ highlighted: new Set() });
      return;
    }
    const same =
      this.state.highlighted.size === nums.length &&
      nums.every((n) => this.state.highlighted.has(n));
    if (!same) this.setState({ highlighted: new Set(nums) });
  };

  getAllBets = (): Bet[] => Object.values(this.state.chips).map((e) => e.bet);

  clearBets = (): boolean => {
    const had = Object.keys(this.state.chips).length > 0;
    const last = Object.values(this.state.chips).map(({ bet, label, pos }) => ({
      bet: { ...bet },
      label,
      pos,
    }));
    this.setState({ chips: {}, lastBets: last });
    return had;
  };

  hasLastBets = () => this.state.lastBets.length > 0;

  repeatLastBets = () => {
    let { balance, chips } = this.state;

    for (const entry of this.state.lastBets) {
      const { bet, label, pos } = entry;
      if (bet.amount <= balance) {
        const { nextChips } = this.addToChipMap(chips, bet, label, pos);
        chips = nextChips;
        balance -= bet.amount;
        this.props.onBetPlaced?.(bet);
      }
    }
    this.setState({ chips, balance });
  };

  addWinnings = (amount: number) => {
    this.setState((s) => ({ balance: s.balance + amount }));
  };

  getBalance = () => this.state.balance;

  /** Unique key for merging chip stacks */
  private keyForBet(bet: Bet, label?: string) {
    if (bet.type === "straight" && bet.numbers.length === 1) {
      return `S:${bet.numbers[0]}`;
    }
    if (label) return `L:${label}`;
    const nums = [...bet.numbers].sort((a, b) => a - b).join(",");
    const t =
      bet.type === "split"
        ? "SP"
        : bet.type === "corner"
        ? "CR"
        : bet.type === "street"
        ? "ST"
        : bet.type === "line"
        ? "LN"
        : bet.type.toUpperCase();
    return `${t}:${nums}`;
  }

  /** Cell centers */
  private centerForCell(col: number, row: number) {
    const zeroColW = cellSize;
    const baseX = zeroColW + GAP;
    const x = baseX + col * (cellSize + GAP) + cellSize / 2;
    const y = (row - 1) * (cellSize + GAP) + cellSize / 2;
    return { x, y };
  }

  private centerForZeroAtRow(row: 1 | 2 | 3) {
    const x = cellSize / 2;
    const y = (row - 1) * (cellSize + GAP) + cellSize / 2;
    return { x, y };
  }

  /** Ideal chip positions for merged bets (non-straight, non-label) */
  private posForBet(
    bet: Bet,
    label?: string
  ): { x: number; y: number } | undefined {
    if (label) return undefined;
    if (bet.type === "straight" && bet.numbers.length === 1) return undefined;

    if (bet.type === "split" && bet.numbers.length === 2) {
      const [a, b] = [...bet.numbers].sort((x, y) => x - y);
      if (a === 0) {
        const rb: 1 | 2 | 3 = rowOf(b) as 1 | 2 | 3;
        const A = this.centerForZeroAtRow(rb);
        const B = this.centerForCell(colOf(b), rb);
        return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      }
      const ca = colOf(a),
        ra = rowOf(a);
      const cb = colOf(b),
        rb = rowOf(b);
      const A = this.centerForCell(ca, ra);
      const B = this.centerForCell(cb, rb);
      return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    }

    if (bet.type === "street" && bet.numbers.length === 3) {
      if (bet.numbers.includes(0)) {
        const dx = -Math.round(cellSize * 0.18);
        const dy = Math.round(cellSize * 0.18);

        const has12 = bet.numbers.includes(1) && bet.numbers.includes(2);
        const has23 = bet.numbers.includes(2) && bet.numbers.includes(3);

        if (has12) {
          const Z = this.centerForZeroAtRow(2);
          const A = this.centerForCell(colOf(1), rowOf(1));
          const B = this.centerForCell(colOf(2), rowOf(2));
          const baseX = (Z.x + A.x + B.x) / 3;
          const baseY = (Z.y + A.y + B.y) / 3;
          return { x: baseX + dx, y: baseY + dy };
        }
        if (has23) {
          const Z = this.centerForZeroAtRow(1);
          const A = this.centerForCell(colOf(2), rowOf(2));
          const B = this.centerForCell(colOf(3), rowOf(3));
          const baseX = (Z.x + A.x + B.x) / 3;
          const baseY = (Z.y + A.y + B.y) / 3;
          return { x: baseX + dx, y: baseY + dy };
        }
      }

      const pts = bet.numbers.map((n) =>
        this.centerForCell(colOf(n), rowOf(n))
      );
      const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      return { x, y };
    }

    if (bet.type === "corner" && bet.numbers.length === 4) {
      if (bet.numbers.includes(0)) {
        const Z = this.centerForZeroAtRow(2);
        const A = this.centerForCell(colOf(1), rowOf(1));
        const B = this.centerForCell(colOf(2), rowOf(2));
        const C = this.centerForCell(colOf(3), rowOf(3));
        return {
          x: (Z.x + A.x + B.x + C.x) / 4,
          y: (Z.y + A.y + B.y + C.y) / 4,
        };
      }
      const pts = bet.numbers.map((n) =>
        this.centerForCell(colOf(n), rowOf(n))
      );
      const x = pts.reduce((s, p) => s + p.x, 0) / 4;
      const y = pts.reduce((s, p) => s + p.y, 0) / 4;
      return { x, y };
    }

    return undefined;
  }

  /** Merge/stack chips for same bet key */
  private addToChipMap(
    chips: State["chips"],
    placedBet: Bet,
    label?: string,
    posOverride?: { x: number; y: number }
  ) {
    const key = this.keyForBet(placedBet, label);
    const prev = chips[key];
    const newAmount = (prev?.bet.amount ?? 0) + placedBet.amount;
    const bet: Bet = { ...placedBet, amount: newAmount };

    const computed = this.posForBet(bet, label);
    const pos = posOverride ?? computed ?? prev?.pos;

    const nextChips: State["chips"] = {
      ...chips,
      [key]: { bet, label, pos },
    };
    return { nextChips, key };
  }

  private tryPlace = (bet: Bet, label?: string) => {
    const amount = bet.amount;
    if (amount <= 0) return;
    if (amount > this.state.balance) return;
    const { nextChips } = this.addToChipMap(this.state.chips, bet, label);
    this.setState(
      (s) => ({ chips: nextChips, balance: s.balance - amount }),
      () => this.props.onBetPlaced?.(bet)
    );
  };

  private highlightNumbersForLabel = (label: string, highlight: boolean) => {
    const numbers = numbersForLabel(label);
    this.setState({ highlighted: highlight ? new Set(numbers) : new Set() });
  };

  public placeFromOutside = (bet: Bet) => {
    if (!bet || bet.amount <= 0) return;
    this.setState(
      (prev) => {
        if (bet.amount > prev.balance) return null; // not enough balance
        const { nextChips } = this.addToChipMap(prev.chips, bet, undefined);
        return {
          chips: nextChips,
          balance: prev.balance - bet.amount,
        };
      },
      () => this.props.onBetPlaced?.(bet)
    );
  };

  public placeManyFromOutside = (bets: Bet[]) => {
    if (!bets?.length) return;
    this.setState(
      (prev) => {
        let balance = prev.balance;
        let chips = prev.chips;
        const placed: Bet[] = [];

        for (const bet of bets) {
          if (!bet || bet.amount <= 0) continue;
          if (bet.amount > balance) break; // stop if we run out of balance
          const { nextChips } = this.addToChipMap(chips, bet, undefined);
          chips = nextChips;
          balance -= bet.amount;
          placed.push(bet);
        }

        if (!placed.length) return null;
        return { chips, balance };
      },
      () => {
        bets.forEach((b) => this.props.onBetPlaced?.(b));
      }
    );
  };

  /** ========= Styles ========= **/
  private numberCellStyle = (n: number): React.CSSProperties => {
    const isHi = this.state.highlighted.has(n);
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Math.max(4, Math.round(6 * SCALE)),
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      fontWeight: 600,
      fontSize: Math.max(10, Math.round(14 * SCALE)),
      color: "#fff",
      cursor: "pointer",
      background: n === 0 ? "#00aa00" : redSet.has(n) ? "#cc0000" : "#111",
      boxShadow: isHi ? "0 0 0 2px #ffffff" : "none",
      transition: "box-shadow 120ms ease",
      touchAction: "manipulation",
    };
  };

  private baseLabel: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Math.max(4, Math.round(6 * SCALE)),
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    fontWeight: 600,
    fontSize: Math.max(10, Math.round(14 * SCALE)),
    color: "#fff",
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
  };

  private gridStyle: React.CSSProperties = {
    position: "relative",
    display: "grid",
    gap: GAP,
    gridTemplateColumns: `${cellSize}px repeat(12, ${cellSize}px) ${
      cellSize + LABEL_EXTRA_W
    }px`,
    gridTemplateRows: `repeat(3, ${cellSize}px) ${cellSize}px ${cellSize}px`,
    userSelect: "none",
    width: (1 + 12 + 1) * (cellSize + GAP) - GAP,
    maxWidth: "100%",
  };

  private numberCellGridPos = (n: number): React.CSSProperties => {
    const col = Math.floor((n - 1) / 3);
    const rowIndex = (n - 1) % 3;
    const row = 3 - rowIndex;
    return { gridColumn: 2 + col, gridRow: row };
  };

  private chipGridPosForLabel(label: string): React.CSSProperties {
    if (label?.startsWith("Column")) {
      const row =
        label === "Column 3"
          ? 1
          : label === "Column 2"
          ? 2
          : label === "Column 1"
          ? 3
          : 2;
      return { gridColumn: 14, gridRow: row };
    }
    if (label === "1st 12") return { gridColumn: "2 / span 4", gridRow: 4 };
    if (label === "2nd 12") return { gridColumn: "6 / span 4", gridRow: 4 };
    if (label === "3rd 12") return { gridColumn: "10 / span 4", gridRow: 4 };
    const outside = ["1 to 18", "EVEN", "RED", "BLACK", "ODD", "19 to 36"];
    const idx = outside.indexOf(label ?? "");
    if (idx >= 0) {
      const startCol = 2 + idx * 2;
      return { gridColumn: `${startCol} / span 2`, gridRow: 5 };
    }
    return { gridColumn: 1, gridRow: 1 };
  }

  private placeLabelBet = (label: string) => {
    const { selectedChip, betAmount = 10 } = this.props;
    const amount = selectedChip ?? betAmount;
    const type = betTypeForLabel(label);
    if (!type) return;
    const numbers = numbersForLabel(label);
    const bet: Bet = { type, numbers, amount };
    this.tryPlace(bet, label);
  };

  /** ========= Hotspots (scaled) ========= **/
  private renderSplitHotspots(amount: number) {
    const hs: React.ReactNode[] = [];
    const w = Math.max(10, Math.round(cellSize * 0.33));
    const h = Math.max(14, Math.round(cellSize * 0.5));

    for (let c = 0; c <= 10; c++) {
      for (let r = 1; r <= 3; r++) {
        const left = nAt(c, r);
        const right = nAt(c + 1, r);
        const A = this.centerForCell(c, r);
        const B = this.centerForCell(c + 1, r);
        const x = (A.x + B.x) / 2;
        const y = (A.y + B.y) / 2;

        hs.push(
          <div
            key={`hs-h-${c}-${r}`}
            style={{
              position: "absolute",
              left: x - w / 2,
              top: y - h / 2,
              width: w,
              height: h,
              cursor: "pointer",
            }}
            onMouseEnter={() =>
              this.setState({ highlighted: new Set([left, right]) })
            }
            onMouseLeave={() => this.setState({ highlighted: new Set() })}
            onClick={() =>
              this.tryPlace({ type: "split", numbers: [left, right], amount })
            }
          />
        );
      }
    }

    for (let c = 0; c <= 11; c++) {
      for (let r = 1; r <= 2; r++) {
        const top = nAt(c, r);
        const bottom = nAt(c, r + 1);
        const A = this.centerForCell(c, r);
        const B = this.centerForCell(c, r + 1);
        const x = (A.x + B.x) / 2;
        const y = (A.y + B.y) / 2;

        hs.push(
          <div
            key={`hs-v-${c}-${r}`}
            style={{
              position: "absolute",
              left: x - h / 2,
              top: y - w / 2,
              width: h,
              height: w,
              cursor: "pointer",
            }}
            onMouseEnter={() =>
              this.setState({ highlighted: new Set([top, bottom]) })
            }
            onMouseLeave={() => this.setState({ highlighted: new Set() })}
            onClick={() =>
              this.tryPlace({ type: "split", numbers: [top, bottom], amount })
            }
          />
        );
      }
    }

    const zeroSplits: Array<[number, 1 | 2 | 3]> = [
      [1, 3],
      [2, 2],
      [3, 1],
    ];
    zeroSplits.forEach(([b, zr], i) => {
      const Z = this.centerForZeroAtRow(zr);
      const B = this.centerForCell(colOf(b), rowOf(b));
      const x = (Z.x + B.x) / 2;
      const y = (Z.y + B.y) / 2;
      hs.push(
        <div
          key={`hs-0-${i}`}
          style={{
            position: "absolute",
            left: x - w / 2,
            top: y - h / 2,
            width: w,
            height: h,
            cursor: "pointer",
          }}
          onMouseEnter={() => this.setState({ highlighted: new Set([0, b]) })}
          onMouseLeave={() => this.setState({ highlighted: new Set() })}
          onClick={() =>
            this.tryPlace({ type: "split", numbers: [0, b], amount })
          }
        />
      );
    });

    return hs;
  }

  private renderCornerHotspots(amount: number) {
    const hs: React.ReactNode[] = [];
    const size = Math.max(12, Math.round(cellSize * 0.375));

    for (let c = 0; c <= 10; c++) {
      for (let r = 1; r <= 2; r++) {
        const tl = nAt(c, r);
        const tr = nAt(c + 1, r);
        const bl = nAt(c, r + 1);
        const br = nAt(c + 1, r + 1);
        const A = this.centerForCell(c, r);
        const B = this.centerForCell(c + 1, r + 1);
        const x = (A.x + B.x) / 2;
        const y = (A.y + B.y) / 2;
        const nums = [tl, tr, bl, br];

        hs.push(
          <div
            key={`hc-${c}-${r}`}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              cursor: "pointer",
            }}
            onMouseEnter={() => this.setState({ highlighted: new Set(nums) })}
            onMouseLeave={() => this.setState({ highlighted: new Set() })}
            onClick={() =>
              this.tryPlace({ type: "corner", numbers: nums, amount })
            }
          />
        );
      }
    }

    const z = this.centerForZeroAtRow(2);
    const a = this.centerForCell(colOf(1), rowOf(1));
    const b = this.centerForCell(colOf(2), rowOf(2));
    const c = this.centerForCell(colOf(3), rowOf(3));
    const x = (z.x + a.x + b.x + c.x) / 4;
    const y = (z.y + a.y + b.y + c.y) / 4;

    hs.push(
      <div
        key={`hc-first4`}
        style={{
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          cursor: "pointer",
        }}
        onMouseEnter={() =>
          this.setState({ highlighted: new Set([0, 1, 2, 3]) })
        }
        onMouseLeave={() => this.setState({ highlighted: new Set() })}
        onClick={() =>
          this.tryPlace({ type: "corner", numbers: [0, 1, 2, 3], amount })
        }
      />
    );

    return hs;
  }

  private renderZeroHotspots(amount: number) {
    const hs: React.ReactNode[] = [];

    const zeroColW = cellSize;
    const baseX = zeroColW + GAP;
    const edgeX = baseX - GAP / 2;

    const size = Math.max(12, Math.round(cellSize * 0.375));

    const p3 = this.centerForCell(0, 1);
    const p2 = this.centerForCell(0, 2);
    const p1 = this.centerForCell(0, 3);

    const mk = (key: string, y: number, nums: number[]) => (
      <div
        key={key}
        style={{
          position: "absolute",
          left: edgeX - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          cursor: "pointer",
        }}
        onMouseEnter={() => this.setState({ highlighted: new Set(nums) })}
        onMouseLeave={() => this.setState({ highlighted: new Set() })}
        onClick={() => this.tryPlace({ type: "split", numbers: nums, amount })}
      />
    );

    hs.push(mk("split-0-3", p3.y, [0, 3]));
    hs.push(mk("split-0-2", p2.y, [0, 2]));
    hs.push(mk("split-0-1", p1.y, [0, 1]));

    return hs;
  }

  private renderZeroTrioHotspots(amount: number) {
    const hs: React.ReactNode[] = [];

    const zeroColW = cellSize;
    const baseX = zeroColW + GAP;
    const edgeX = baseX - GAP / 2;

    const triX = edgeX + Math.round(cellSize * 0.18);

    const p3 = this.centerForCell(0, 1);
    const p2 = this.centerForCell(0, 2);
    const p1 = this.centerForCell(0, 3);

    const y12 = (p1.y + p2.y) / 2;
    const y23 = (p2.y + p3.y) / 2;

    const w = Math.max(14, Math.round(cellSize * 0.5));
    const h = Math.max(10, Math.round(cellSize * 0.33));

    const mk = (key: string, y: number, nums: number[]) => (
      <div
        key={key}
        style={{
          position: "absolute",
          left: triX - w / 2,
          top: y - h / 2,
          width: w,
          height: h,
          cursor: "pointer",
        }}
        onMouseEnter={() => this.setState({ highlighted: new Set(nums) })}
        onMouseLeave={() => this.setState({ highlighted: new Set() })}
        onClick={() => this.tryPlace({ type: "street", numbers: nums, amount })}
      />
    );

    hs.push(mk("trio-0-1-2", y12, [0, 1, 2]));
    hs.push(mk("trio-0-2-3", y23, [0, 2, 3]));

    return hs;
  }

  render() {
    const { betAmount = 10, className, selectedChip } = this.props;
    const { balance, chips } = this.state;

    const amount = selectedChip ?? betAmount;
    const chipSizePx = Math.round(cellSize * 0.66);

    const columnDefs = [
      { label: "2 to 1", tag: "Column 3", row: 1 },
      { label: "2 to 1", tag: "Column 2", row: 2 },
      { label: "2 to 1", tag: "Column 1", row: 3 },
    ];
    const dozens = ["1st 12", "2nd 12", "3rd 12"];
    const outside = ["1 to 18", "EVEN", "RED", "BLACK", "ODD", "19 to 36"];

    return (
      <div className={className} style={{ touchAction: "manipulation" }}>
        <style>{`
  @keyframes chip-in {
    from { opacity: 0; transform: translateY(12px) scale(0.92); }
    to   { opacity: 1; transform: translateY(-2px) scale(1); }
  }
  @keyframes chip-bump {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
`}</style>

        <div style={this.gridStyle}>
          {/* Zero cell */}
          <div
            style={{
              ...this.numberCellStyle(0),
              gridColumn: 1,
              gridRow: "1 / span 3",
            }}
            onClick={() =>
              this.tryPlace({ type: "straight", numbers: [0], amount })
            }
            onMouseEnter={() => this.setState({ highlighted: new Set([0]) })}
            onMouseLeave={() => this.setState({ highlighted: new Set() })}
          >
            0
          </div>

          {/* Numbers 1-36 */}
          {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              style={{
                ...this.numberCellStyle(n),
                ...this.numberCellGridPos(n),
              }}
              onClick={() =>
                this.tryPlace({ type: "straight", numbers: [n], amount })
              }
              onMouseEnter={() => this.setState({ highlighted: new Set([n]) })}
              onMouseLeave={() => this.setState({ highlighted: new Set() })}
            >
              {n}
            </div>
          ))}

          {/* Columns */}
          {columnDefs.map(({ label, tag, row }) => (
            <div
              key={tag}
              style={{
                ...this.baseLabel,
                background: "#444",
                gridColumn: 14,
                gridRow: row,
              }}
              onMouseEnter={() => this.highlightNumbersForLabel(tag, true)}
              onMouseLeave={() => this.highlightNumbersForLabel(tag, false)}
              onClick={() => this.placeLabelBet(tag)}
            >
              {label}
            </div>
          ))}

          {/* Dozens */}
          {dozens.map((label, i) => (
            <div
              key={label}
              style={{
                ...this.baseLabel,
                background: "#222",
                gridColumn: `${2 + i * 4} / span 4`,
                gridRow: 4,
              }}
              onMouseEnter={() => this.highlightNumbersForLabel(label, true)}
              onMouseLeave={() => this.highlightNumbersForLabel(label, false)}
              onClick={() => this.placeLabelBet(label)}
            >
              {label}
            </div>
          ))}

          {/* Outside */}
          {outside.map((label, i) => (
            <div
              key={label}
              style={{
                ...this.baseLabel,
                background: "#555",
                gridColumn: `${2 + i * 2} / span 2`,
                gridRow: 5,
              }}
              onMouseEnter={() => this.highlightNumbersForLabel(label, true)}
              onMouseLeave={() => this.highlightNumbersForLabel(label, false)}
              onClick={() => this.placeLabelBet(label)}
            >
              {label}
            </div>
          ))}

          {/* Hotspots */}
          {this.renderSplitHotspots(amount)}
          {this.renderCornerHotspots(amount)}
          {this.renderZeroHotspots(amount)}
          {this.renderZeroTrioHotspots(amount)}

          {/* Chips */}
          {Object.entries(chips).map(([key, entry]) => {
            const colorSrc = chipSrcForAmount(entry.bet.amount);
            const labelColor = colorSrc === CHIP_SRC.yellow ? "#111" : "#fff";

            const formatChipValue = (v: number) => {
              if (v >= 1000) {
                const k = v / 1000;
                return `${k.toFixed(2).replace(/\.?0+$/, "")}K`;
              }
              return String(v);
            };

            // Absolutely positioned chips (splits/streets/corners/zero combos)
            if (entry.pos) {
              return (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    left: entry.pos.x - chipSizePx / 2,
                    top: entry.pos.y - chipSizePx / 2,
                    width: chipSizePx,
                    height: chipSizePx,
                    zIndex: 5,
                    pointerEvents: "none",
                    filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))",
                    animation:
                      "chip-in 240ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    willChange: "transform, opacity",
                  }}
                >
                  <img
                    src={colorSrc}
                    alt=""
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Inter, system-ui, Arial, sans-serif",
                      fontWeight: 800,
                      fontSize: Math.max(9, Math.round(chipSizePx * 0.28)),
                      color: labelColor,
                      textShadow:
                        colorSrc === CHIP_SRC.yellow
                          ? "0 1px 1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.35)"
                          : "0 1px 1px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.45)",
                    }}
                  >
                    {formatChipValue(entry.bet.amount)}
                  </div>
                </div>
              );
            }

            // Grid-placed chips (single-number or label bets)
            let gridPos: React.CSSProperties;
            if (
              entry.bet.type === "straight" &&
              entry.bet.numbers.length === 1
            ) {
              const n = entry.bet.numbers[0]!;
              gridPos =
                n === 0
                  ? { gridColumn: 1, gridRow: "2" }
                  : this.numberCellGridPos(n);
            } else {
              gridPos = this.chipGridPosForLabel(entry.label ?? "");
            }

            return (
              <div
                key={key}
                style={{
                  ...gridPos,
                  alignSelf: "center",
                  justifySelf: "center",
                  position: "relative",
                  zIndex: 5,
                  width: chipSizePx,
                  height: chipSizePx,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))",
                  animation:
                    "chip-in 240ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src={colorSrc}
                  alt=""
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Inter, system-ui, Arial, sans-serif",
                    fontWeight: 800,
                    fontSize: Math.max(9, Math.round(chipSizePx * 0.28)),
                    color: labelColor,
                    textShadow:
                      colorSrc === CHIP_SRC.yellow
                        ? "0 1px 1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.35)"
                        : "0 1px 1px rgba(0,0,0,0.45)",
                  }}
                >
                  {formatChipValue(entry.bet.amount)}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: Math.max(6, Math.round(10 * SCALE)),
            marginLeft: isMobile ? 40 : 0,
          }}
        >
          <strong>Balance:</strong>{" "}
          <span style={{ fontSize: Math.max(12, Math.round(14 * SCALE)) }}>
            {balance}
          </span>
        </div>
      </div>
    );
  }
}
