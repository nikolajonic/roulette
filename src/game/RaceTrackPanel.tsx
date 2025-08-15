import { useMemo, useState, useEffect } from "react";
import type { Bet } from "../game/BetTypes";
import { neighborsStyle, redSet } from "../constants";

type Props = {
  chip: number;
  onPlace: (bets: Bet[]) => void;
  onHoverNumbers?: (nums: number[] | null) => void;
  neighbors?: number;
  disabled?: boolean;
  className?: string;
  width?: number;
  height?: number;
};

const GLOW_COLOR = "#ffffffff";

const WHEEL_CW: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const toBets = (nums: number[], amt: number): Bet[] =>
  nums.map((n) => ({ type: "straight", numbers: [n], amount: amt }));

const neighborsOf = (n: number, k: number) => {
  const i = WHEEL_CW.indexOf(n);
  const L = WHEEL_CW.length;
  const out: number[] = [];
  for (let d = -k; d <= k; d++) out.push(WHEEL_CW[(i + d + L) % L]);
  return out;
};

type Tile =
  | {
      kind: "arcR" | "arcL";
      cx: number;
      cy: number;
      rOuter: number;
      rInner: number;
      a0: number;
      a1: number;
      n: number;
    }
  | { kind: "rect"; x: number; y: number; w: number; h: number; n: number };

function arcPathRight(
  cx: number,
  cy: number,
  rO: number,
  rI: number,
  a0: number,
  a1: number
) {
  const p0x = cx + rO * Math.cos(a0),
    p0y = cy + rO * Math.sin(a0);
  const p1x = cx + rO * Math.cos(a1),
    p1y = cy + rO * Math.sin(a1);
  const q1x = cx + rI * Math.cos(a1),
    q1y = cy + rI * Math.sin(a1);
  const q0x = cx + rI * Math.cos(a0),
    q0y = cy + rI * Math.sin(a0);
  return `M ${p0x} ${p0y} A ${rO} ${rO} 0 0 1 ${p1x} ${p1y} L ${q1x} ${q1y} A ${rI} ${rI} 0 0 0 ${q0x} ${q0y} Z`;
}

function arcPathLeft(
  cx: number,
  cy: number,
  rO: number,
  rI: number,
  a0: number,
  a1: number
) {
  const p0x = cx + rO * Math.cos(a0),
    p0y = cy + rO * Math.sin(a0);
  const p1x = cx + rO * Math.cos(a1),
    p1y = cy + rO * Math.sin(a1);
  const q1x = cx + rI * Math.cos(a1),
    q1y = cy + rI * Math.sin(a1);
  const q0x = cx + rI * Math.cos(a0),
    q0y = cy + rI * Math.sin(a0);
  return `M ${p0x} ${p0y} A ${rO} ${rO} 0 0 0 ${p1x} ${p1y} L ${q1x} ${q1y} A ${rI} ${rI} 0 0 1 ${q0x} ${q0y} Z`;
}

function betsForTiers(unit: number): Bet[] {
  return [
    { type: "split", numbers: [5, 8], amount: unit },
    { type: "split", numbers: [10, 11], amount: unit },
    { type: "split", numbers: [13, 16], amount: unit },
    { type: "split", numbers: [23, 24], amount: unit },
    { type: "split", numbers: [27, 30], amount: unit },
    { type: "split", numbers: [33, 36], amount: unit },
  ];
}
function betsForOrphelins(unit: number): Bet[] {
  return [
    { type: "straight", numbers: [1], amount: unit },
    { type: "split", numbers: [6, 9], amount: unit },
    { type: "split", numbers: [14, 17], amount: unit },
    { type: "split", numbers: [17, 20], amount: unit },
    { type: "split", numbers: [31, 34], amount: unit },
  ];
}
function betsForZero(unit: number): Bet[] {
  return [
    { type: "split", numbers: [0, 3], amount: unit },
    { type: "split", numbers: [0, 2], amount: unit },
    { type: "split", numbers: [26, 32], amount: unit },
  ];
}

/** Number sets to HIGHLIGHT on hover */
const H_TIER = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
const H_ORPH = [1, 6, 9, 14, 17, 20, 31, 34];
const H_ZERO = [0, 3, 12, 15, 26, 32, 35];

function buildGroups() {
  const RIGHT_ARC = 7;
  const TOP_COUNT = 12;
  const LEFT_ARC = 6;
  const BOTTOM_COUNT = 12;

  const right = [0, 32, 15, 19, 4, 21, 2];
  const bottom = [14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const left = [20, 1, 33, 16, 24, 5];
  const top = [25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10];

  return {
    RIGHT_ARC,
    TOP_COUNT,
    LEFT_ARC,
    BOTTOM_COUNT,
    right,
    top,
    left,
    bottom,
  };
}

function pathLeftBand(
  bandX: number,
  bandY: number,
  bandW: number,
  bandH: number,
  bandR: number,
  colW: number
) {
  const xL = bandX;
  const yT = bandY;
  const yB = bandY + bandH;
  const xR = bandX + colW;
  const cxTop = xL + bandR;
  // arc from top mid to bottom mid, bulging LEFT (sweep=0)
  return `M ${cxTop} ${yT}
          A ${bandR} ${bandR} 0 0 0 ${cxTop} ${yB}
          L ${xR} ${yB}
          L ${xR} ${yT}
          Z`;
}

// Middle column: straight on both sides
function pathMidBand(
  bandX: number,
  bandY: number,
  bandW: number,
  bandH: number,
  colW: number
) {
  const xL = bandX + colW;
  const xR = bandX + 2 * colW;
  const yT = bandY;
  const yB = bandY + bandH;
  return `M ${xL} ${yT} H ${xR} V ${yB} H ${xL} Z`;
}

function pathRightBand(
  bandX: number,
  bandY: number,
  bandW: number,
  bandH: number,
  bandR: number,
  colW: number
) {
  const yT = bandY;
  const yB = bandY + bandH;
  const xL = bandX + 2 * colW;
  const xArc = bandX + bandW - bandR;

  return `M ${xL} ${yT}
          V ${yB}
          L ${xArc} ${yB}
          A ${bandR} ${bandR} 0 0 0 ${xArc} ${yT}
          Z`;
}

export default function RaceTrackOval({
  chip,
  onPlace,
  onHoverNumbers,
  neighbors = 2,
  disabled = false,
  className,
  width = 900,
  height = 240,
}: Props) {
  const [nb, setNb] = useState(neighbors);
  const [hover, setHover] = useState<number | null>(null);
  const [centerHover, setCenterHover] = useState<number[] | null>(null);

  // Layout
  const pad = 12;
  const track = 30;
  const r = (height - pad * 2) / 2;
  const wOut = width - pad * 2;
  const hOut = height - pad * 2;
  const gap = 2;

  const rightCx = pad + wOut - r;
  const leftCx = pad + r;
  const midCy = pad + r;

  const seq = useMemo(buildGroups, []);

  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = [];
    const aTop = Math.PI / 2;
    const aBot = -Math.PI / 2;
    const arcGap = 0.06;

    // RIGHT ARC (top → bottom)
    {
      const step = (aBot - aTop) / seq.RIGHT_ARC;
      for (let i = 0; i < seq.RIGHT_ARC; i++) {
        const s0 = aTop + i * step + step * arcGap;
        const s1 = aTop + (i + 1) * step - step * arcGap;
        out.push({
          kind: "arcR",
          cx: rightCx,
          cy: midCy,
          rOuter: r,
          rInner: r - track,
          a0: s1,
          a1: s0,
          n: seq.right[i],
        });
      }
    }

    // TOP STRAIGHT (right → left)
    {
      const widthTop = rightCx - leftCx;
      const cell = widthTop / seq.TOP_COUNT;
      for (let i = 0; i < seq.TOP_COUNT; i++) {
        const x = rightCx - (i + 1) * cell + gap / 2;
        out.push({
          kind: "rect",
          x,
          y: pad + 1,
          w: cell - gap,
          h: track - 3,
          n: seq.top[i],
        });
      }
    }

    // LEFT ARC (top → bottom)
    {
      const aL0 = Math.PI / 2;
      const aL1 = (3 * Math.PI) / 2;
      const step = (aL1 - aL0) / seq.LEFT_ARC;
      for (let i = 0; i < seq.LEFT_ARC; i++) {
        const s0 = aL0 + i * step + step * 0.06;
        const s1 = aL0 + (i + 1) * step - step * 0.06;
        out.push({
          kind: "arcL",
          cx: leftCx,
          cy: midCy,
          rOuter: r,
          rInner: r - track,
          a0: s1,
          a1: s0,
          n: seq.left[i],
        });
      }
    }

    // BOTTOM STRAIGHT (left → right)
    {
      const widthBot = rightCx - leftCx;
      const cell = widthBot / seq.BOTTOM_COUNT;
      for (let i = 0; i < seq.BOTTOM_COUNT; i++) {
        const x = leftCx + i * cell + gap / 2;
        out.push({
          kind: "rect",
          x,
          y: pad + hOut - track + 2,
          w: cell - gap,
          h: track - 3,
          n: seq.bottom[i],
        });
      }
    }

    return out;
  }, [gap, hOut, leftCx, midCy, pad, r, rightCx, seq, track]);

  const isNeighbor = (n: number) =>
    hover != null && neighborsOf(hover, nb).includes(n);
  const inCenterHover = (n: number) =>
    centerHover != null && centerHover.includes(n);

  const handleTileEnter = (n: number) => {
    setHover(n);
    setCenterHover(null);
    onHoverNumbers?.(neighborsOf(n, nb));
  };
  const handleTileLeave = (n: number) => {
    setHover((h) => (h === n ? null : h));
    onHoverNumbers?.(centerHover ?? null);
  };

  useEffect(() => {
    if (hover != null) onHoverNumbers?.(neighborsOf(hover, nb));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, nb]);

  const colorOf = (n: number) =>
    n === 0 ? "#16b862" : redSet.has(n) ? "#d61e21" : "#20252b";

  const onCell = (n: number) => {
    if (!disabled) onPlace(toBets(neighborsOf(n, nb), chip));
  };

  const innerTop = pad + track;
  const innerBottom = pad + hOut - track;
  const innerLeft = leftCx + track;
  const innerRight = rightCx - track;

  const bandX = innerLeft - 115;
  const bandY = innerTop;
  const bandW = innerRight - innerLeft + 230;
  const bandH = innerBottom - innerTop;
  const bandR = bandH / 2;
  const colW = bandW / 3;

  const BAND_HIT_PAD_Y = 10;
  const hitY = bandY + BAND_HIT_PAD_Y;
  const hitH = bandH - BAND_HIT_PAD_Y * 2;
  const hitR = hitH / 2;

  const setCenter = (nums: number[] | null) => {
    setHover(null);
    setCenterHover(nums);
    onHoverNumbers?.(nums);
  };

  const shouldGlow = (n: number) => isNeighbor(n) || inCenterHover(n);

  const leftPath = pathLeftBand(bandX, bandY, bandW, bandH, bandR, colW);
  const midPath = pathMidBand(bandX, bandY, bandW, bandH, colW);
  const rightPath = pathRightBand(bandX, bandY, bandW, bandH, bandR, colW);

  const leftHitPath = pathLeftBand(bandX, hitY, bandW, hitH, hitR, colW);
  const midHitPath = pathMidBand(bandX, hitY, bandW, hitH, colW);
  const rightHitPath = pathRightBand(bandX, hitY, bandW, hitH, hitR, colW);

  return (
    <div className={className} style={{ width, position: "relative" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <filter id="glow">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={GLOW_COLOR}
              floodOpacity="0.5"
            />
          </filter>
        </defs>

        {tiles.map((t, i) => {
          const fill = colorOf(t.n);
          const glow = shouldGlow(t.n);

          if (t.kind === "rect") {
            return (
              <g
                key={i}
                onMouseEnter={() => handleTileEnter(t.n)}
                onMouseLeave={() => handleTileLeave(t.n)}
                onClick={() => onCell(t.n)}
                style={{ cursor: disabled ? "default" : "pointer" }}
              >
                {glow && (
                  <rect
                    x={t.x - 2}
                    y={t.y - 2}
                    width={t.w + 4}
                    height={t.h + 4}
                    fill="none"
                    stroke={GLOW_COLOR}
                    strokeWidth={1}
                    filter="url(#glow)"
                  />
                )}
                <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={fill} />
                <text
                  x={t.x + t.w / 2}
                  y={t.y + t.h / 2 + 4}
                  textAnchor="middle"
                  fontFamily="Inter, system-ui, Arial, sans-serif"
                  fontWeight={800}
                  fontSize={13}
                  fill="#fff"
                  style={{ pointerEvents: "none" }}
                >
                  {t.n}
                </text>
              </g>
            );
          }

          const d =
            t.kind === "arcR"
              ? arcPathRight(t.cx, t.cy, t.rOuter, t.rInner, t.a0, t.a1)
              : arcPathLeft(t.cx, t.cy, t.rOuter, t.rInner, t.a0, t.a1);

          const mid = (t.a0 + t.a1) / 2;
          const tx =
            t.cx + (t.rInner + (t.rOuter - t.rInner) / 2) * Math.cos(mid);
          const ty =
            t.cy + (t.rInner + (t.rOuter - t.rInner) / 2) * Math.sin(mid);

          return (
            <g
              key={i}
              onMouseEnter={() => handleTileEnter(t.n)}
              onMouseLeave={() => handleTileLeave(t.n)}
              onClick={() => onCell(t.n)}
              style={{ cursor: disabled ? "default" : "pointer" }}
            >
              {glow && (
                <path
                  d={d}
                  fill="none"
                  stroke={GLOW_COLOR}
                  strokeWidth={2}
                  filter="url(#glow)"
                />
              )}
              <path d={d} fill={fill} />
              <text
                x={tx}
                y={ty + 4}
                textAnchor="middle"
                fontFamily="Inter, system-ui, Arial, sans-serif"
                fontWeight={800}
                fontSize={13}
                fill="#fff"
                style={{ pointerEvents: "none" }}
              >
                {t.n}
              </text>
            </g>
          );
        })}
      </svg>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <rect
          x={bandX}
          y={bandY}
          width={bandW}
          height={bandH}
          rx={bandR}
          ry={bandR}
          fill="#12824c"
        />

        <path d={rightPath} fill="#16b862" />

        <line
          x1={bandX + colW}
          y1={bandY}
          x2={bandX + colW}
          y2={bandY + bandH}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
        />
        <line
          x1={bandX + 2 * colW}
          y1={bandY}
          x2={bandX + 2 * colW}
          y2={bandY + bandH}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
        />

        {centerHover === H_TIER && (
          <path
            d={leftPath}
            fill="rgba(255,255,255,0.06)"
            stroke="#ffffff"
            strokeWidth={1}
          />
        )}
        {centerHover === H_ORPH && (
          <path
            d={midPath}
            fill="rgba(255,255,255,0.06)"
            stroke="#ffffff"
            strokeWidth={1}
          />
        )}
        {centerHover === H_ZERO && (
          <path
            d={rightPath}
            fill="rgba(255,255,255,0.08)"
            stroke="#ffffff"
            strokeWidth={1}
          />
        )}

        {/* Labels */}
        <text
          x={bandX + colW / 2}
          y={bandY + bandH / 2 + 5}
          textAnchor="middle"
          fontFamily="Inter, system-ui, Arial, sans-serif"
          fontWeight={900}
          fontSize={14}
          fill="#fff"
        >
          TIER
        </text>
        <text
          x={bandX + colW + colW / 2}
          y={bandY + bandH / 2 + 5}
          textAnchor="middle"
          fontFamily="Inter, system-ui, Arial, sans-serif"
          fontWeight={900}
          fontSize={14}
          fill="#fff"
        >
          ORPHELINS
        </text>
        <text
          x={bandX + 2 * colW + colW / 2}
          y={bandY + bandH / 2 + 5}
          textAnchor="middle"
          fontFamily="Inter, system-ui, Arial, sans-serif"
          fontWeight={900}
          fontSize={14}
          fill="#fff"
        >
          ZERO
        </text>
      </svg>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <path
          d={leftHitPath}
          fill="transparent"
          style={{
            pointerEvents: "auto",
            cursor: disabled ? "default" : "pointer",
          }}
          onMouseEnter={() => setCenter(H_TIER)}
          onMouseLeave={() => setCenter(null)}
          onClick={() => !disabled && onPlace(betsForTiers(chip))}
        />

        <path
          d={midHitPath}
          fill="transparent"
          style={{
            pointerEvents: "auto",
            cursor: disabled ? "default" : "pointer",
          }}
          onMouseEnter={() => setCenter(H_ORPH)}
          onMouseLeave={() => setCenter(null)}
          onClick={() => !disabled && onPlace(betsForOrphelins(chip))}
        />

        <path
          d={rightHitPath}
          fill="transparent"
          style={{
            pointerEvents: "auto",
            cursor: disabled ? "default" : "pointer",
          }}
          onMouseEnter={() => setCenter(H_ZERO)}
          onMouseLeave={() => setCenter(null)}
          onClick={() => !disabled && onPlace(betsForZero(chip))}
        />
      </svg>

      <style>{neighborsStyle}</style>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        <div className="nb-ctrl" style={{ marginTop: 8 }}>
          <span className="nb-label">Neighbours</span>
          <button
            className="nb-btn"
            aria-label="Decrease neighbours"
            title="Decrease (min 0)"
            disabled={disabled || nb <= 0}
            onClick={() => !disabled && setNb((v) => Math.max(0, v - 1))}
          >
            −
          </button>
          <span className="nb-value">{nb}</span>
          <button
            className="nb-btn"
            aria-label="Increase neighbours"
            title="Increase (max 4)"
            disabled={disabled || nb >= 4}
            onClick={() => !disabled && setNb((v) => Math.min(4, v + 1))}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
