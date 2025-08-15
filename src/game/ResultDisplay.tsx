import React from "react";
import { blackSet, NUMBER_ORDER, redSet } from "../constants";

type Props = {
  open?: boolean; // when true, show overlay
  className?: string;
};

type State = {
  winningNumber: number | null;
  payout: number;
  entered: boolean; // for the fade-in animation
};

function bgColorFor(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "#555";
  if (n === 0) return "#00b33c";
  if (redSet.has(n)) return "#e53935";
  if (blackSet.has(n)) return "#111";
  return "#555";
}

export default class ResultDisplay extends React.Component<Props, State> {
  state: State = { winningNumber: null, payout: 0, entered: false };

  updateDisplay = (winningNumber: number | null, payout: number) => {
    this.setState({ winningNumber, payout });
  };

  private getPrevNext(n: number | null) {
    if (n == null)
      return { prev: null as number | null, next: null as number | null };
    const idx = NUMBER_ORDER.indexOf(n);
    if (idx === -1) return { prev: null, next: null };
    const prev =
      NUMBER_ORDER[(idx - 1 + NUMBER_ORDER.length) % NUMBER_ORDER.length];
    const next = NUMBER_ORDER[(idx + 1) % NUMBER_ORDER.length];
    return { prev, next };
  }

  componentDidUpdate(prevProps: Props) {
    // when opening: trigger enter animation on next frame
    if (this.props.open && !prevProps.open) {
      this.setState({ entered: false }, () => {
        requestAnimationFrame(() => this.setState({ entered: true }));
      });
    }
    // when closing: reset entered so the next open re-animates
    if (!this.props.open && prevProps.open) {
      this.setState({ entered: false });
    }
  }

  render() {
    const { className, open } = this.props;
    const { winningNumber, payout, entered } = this.state;
    const { prev, next } = this.getPrevNext(winningNumber);

    if (!open) return null;

    const overlayWrap: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      opacity: entered ? 1 : 0,
      transition: "opacity 500ms ease",
      willChange: "opacity",
    };

    const card: React.CSSProperties = {
      minWidth: 280,
      padding: "22px 28px",
      borderRadius: 16,
      background: "rgba(34, 42, 53, 0.9)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      textAlign: "center",
      color: "#fff",
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      transform: entered
        ? "scale(1) translateY(0)"
        : "scale(0.96) translateY(8px)",
      transition: "transform 500ms ease",
      willChange: "transform",
    };

    const line: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      marginTop: 10,
    };

    const sideNumStyle = (n: number | null): React.CSSProperties => ({
      width: 44,
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 22,
      fontWeight: 800,
      background: bgColorFor(n),
      color: "#fff",
      opacity: 0.6,
      borderRadius: "50%",
    });

    const centerNumStyle: React.CSSProperties = {
      width: 80,
      height: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 48,
      fontWeight: 900,
      background: bgColorFor(winningNumber),
      color: "#fff",
      lineHeight: 1,
      borderRadius: "50%",
    };

    const sub: React.CSSProperties = {
      marginTop: 12,
      fontSize: 18,
      opacity: 0.9,
    };

    return (
      <div className={className} style={overlayWrap}>
        <div style={card}>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Result</div>
          <div style={line}>
            <div style={sideNumStyle(prev)}>{prev ?? "-"}</div>
            <div style={centerNumStyle}>{winningNumber ?? "-"}</div>
            <div style={sideNumStyle(next)}>{next ?? "-"}</div>
          </div>
          <div style={sub}>{payout > 0 ? `Win: +${payout}` : "No win"}</div>
        </div>
      </div>
    );
  }
}
