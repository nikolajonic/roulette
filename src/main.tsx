// src/main.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import BetPanel from "./game/BetPanel";
import ResultDisplay from "./game/ResultDisplay";
import * as GameLogic from "./utils/gameLogic";
import WheelHost, { WheelHostHandle } from "./game/Wheel/WheelHost";
import type { Bet } from "./game/BetTypes";
import useSpinCycle from "./hooks/useSpinCycle";
import ChipTray from "./components/chips";
import { INIT_BALANCE } from "./constants";
import RaceTrackPanel from "./game/RaceTrackPanel";

const SPIN_EVERY_MS = 15_000;
const SPIN_ANIM_MS = 5_200;
const RESULT_SHOW_MS = 3_000;
const RIGHT_RAIL_WIDTH = 720;
const GRID_GAP = 24;
const WHEEL_SHIFT_X = RIGHT_RAIL_WIDTH / 2 + GRID_GAP / 2 + 25;

function OnlineRouletteGame() {
  const betPanelRef = useRef<BetPanel>(null);
  const resultRef = useRef<ResultDisplay>(null);
  const wheelRef = useRef<WheelHostHandle>(null);

  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [payout, setPayout] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [chip, setChip] = useState<number | null>(100);
  const [canRepeat, setCanRepeat] = useState(false);

  // responsive width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Spin cycle
  useSpinCycle({
    intervalMs: SPIN_EVERY_MS,
    animMs: SPIN_ANIM_MS,
    resultShowMs: RESULT_SHOW_MS,
    pauseWhenHidden: true,
    spin: () => wheelRef.current?.spin() ?? 0,
    onResolve: (result) => {
      const bets = betPanelRef.current?.getAllBets?.() ?? [];
      const totalReturn = bets.reduce(
        (sum, b) => sum + GameLogic.calculateReturn(b, result),
        0
      );
      if (totalReturn > 0) betPanelRef.current?.addWinnings(totalReturn);
      setWinningNumber(result);
      setPayout(totalReturn);
    },
    onSpinningChange: setIsSpinning,
    onOverlayChange: setShowOverlay,
    onNextSpinAtChange: setNextSpinAt,
  });

  useEffect(() => {
    if (winningNumber != null) {
      resultRef.current?.updateDisplay(winningNumber, payout);
    }
  }, [winningNumber, payout]);

  // countdown
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!nextSpinAt) {
        setRemainingMs(0);
        return;
      }
      const left = Math.max(0, nextSpinAt - Date.now());
      setRemainingMs(left);
    }, 200);
    return () => window.clearInterval(id);
  }, [nextSpinAt]);

  const prevOverlay = useRef(showOverlay);
  useEffect(() => {
    if (prevOverlay.current && !showOverlay) {
      const had = betPanelRef.current?.clearBets() ?? false;
      setCanRepeat(had);
    }
    prevOverlay.current = showOverlay;
  }, [showOverlay]);

  // ======== Styles ========
  const pageWrap: React.CSSProperties = {
    minHeight: "90vh",
    padding: 20,
    background:
      "linear-gradient(180deg, #1b344dff 0%, #1a2a3a 50%, #0e1720 100%)",
    color: "#fff",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  };

  const blurWrap: React.CSSProperties = {
    filter: showOverlay ? "blur(6px)" : "none",
    transition: "filter 600ms ease",
    pointerEvents: showOverlay ? "none" : "auto",
  };

  const isMobile = windowWidth <= 768;

  const grid: React.CSSProperties = {
    display: "grid",
    gap: GRID_GAP,
    alignItems: "start",
    justifyContent: "center",
    margin: "0 auto",
    maxWidth: 1220,
    width: "100%",
    gridTemplateColumns: isMobile ? "1fr" : "420px 1fr",
  };

  const wheelSize = isMobile ? windowWidth * 0.9 : 400;

  const wheelBox: React.CSSProperties = {
    width: wheelSize,
    height: wheelSize,
    margin: "0 auto",
    transform:
      isMobile && isSpinning
        ? "translate3d(0,130px,0) scale(1)" // 👈 always static on mobile
        : isSpinning
        ? `translate3d(${WHEEL_SHIFT_X}px, 90px, 0) scale(1.35)`
        : "translate3d(0,0,0) scale(1)",
    transition:
      "transform 2000ms cubic-bezier(0.22, 1, 0.36, 1), filter 2000ms ease",
    filter: isSpinning ? "drop-shadow(0 20px 60px rgba(0,0,0,0.55))" : "none",
    willChange: "transform, filter",
  };

  const rightRail: React.CSSProperties = {
    width: isMobile ? "90%" : RIGHT_RAIL_WIDTH,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: isMobile ? "20px auto 0" : "0 0 0 0",
    transform: isSpinning
      ? isMobile
        ? "translate3d(0,0,0)"
        : "translate3d(640px,0,0)"
      : "translate3d(0,0,0)",
    opacity: isSpinning ? 0 : 1,
    transition:
      "transform 2000ms cubic-bezier(0.22, 1, 0.36, 1), opacity 1800ms ease",
    willChange: "transform, opacity",
  };

  const chipTrayStyle: React.CSSProperties = {
    marginTop: 10,
    transform: isSpinning ? "translateY(8px) scale(0.98)" : "translateY(0)",
    opacity: isSpinning ? 0 : 1,
    transition:
      "transform 1200ms cubic-bezier(0.22,1,0.36,1), opacity 1800ms ease",
  };

  const betPanelStyle: React.CSSProperties = {
    marginTop: 16,
  };

  const progress = nextSpinAt
    ? Math.min(1, 1 - remainingMs / SPIN_EVERY_MS)
    : 0;

  const timerWrap: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    margin: "8px auto 12px",
    maxWidth: 820,
    width: "100%",
    padding: "0 12px",
    flexWrap: isMobile ? "wrap" : "nowrap",
  };

  const pill: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
    fontSize: isMobile ? 12 : 14,
    letterSpacing: 0.2,
    textAlign: "center",
    minWidth: isMobile ? "60%" : 180,
  };

  const bar: React.CSSProperties = {
    flex: 1,
    height: 6,
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  };

  const barFill: React.CSSProperties = {
    width: `${progress * 100}%`,
    height: "100%",
    background: "rgba(0,255,170,0.9)",
    transition: progress === 0 ? "none" : "width 200ms linear",
  };

  return (
    <div style={pageWrap}>
      <div style={blurWrap}>
        <h2 style={{ marginBottom: 6, textAlign: "center" }}>
          Online Roulette
        </h2>

        {/* countdown */}
        <div style={timerWrap}>
          <div style={pill}>
            {showOverlay
              ? "Showing result…"
              : isSpinning
              ? "Spinning…"
              : nextSpinAt
              ? `Next spin in ${String(Math.ceil(remainingMs / 1000)).padStart(
                  2,
                  "0"
                )}s`
              : "Preparing…"}
          </div>
          <div style={bar} key={nextSpinAt ?? 0}>
            <div style={barFill} />
          </div>
        </div>

        {/* main grid */}
        <div style={grid}>
          {/* LEFT — Wheel */}
          <div style={{ display: "grid", placeItems: "center" }}>
            <div style={wheelBox}>
              <WheelHost ref={wheelRef} width={wheelSize} height={wheelSize} />
            </div>
          </div>

          {/* RIGHT — panels */}
          <div style={rightRail}>
            {!isMobile && (
              <RaceTrackPanel
                chip={chip ?? 100}
                disabled={isSpinning || showOverlay}
                onPlace={(bets) =>
                  betPanelRef.current?.placeManyFromOutside?.(bets)
                }
                onHoverNumbers={(nums) => betPanelRef.current?.highlight(nums)}
                width={isMobile ? windowWidth * 0.85 : RIGHT_RAIL_WIDTH}
                height={260}
              />
            )}
            <div style={chipTrayStyle}>
              <ChipTray
                selected={chip}
                onSelect={setChip}
                chipSize={45}
                canRepeat={canRepeat}
                onRepeat={() => betPanelRef.current?.repeatLastBets?.()}
              />
            </div>

            <div style={betPanelStyle}>
              <BetPanel
                ref={betPanelRef}
                initialBalance={INIT_BALANCE}
                betAmount={10}
                selectedChip={chip}
              />
            </div>
          </div>
        </div>
      </div>

      <ResultDisplay ref={resultRef} open={showOverlay} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OnlineRouletteGame />
  </React.StrictMode>
);
