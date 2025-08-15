import React from "react";
import RepeatSVG from "../../public/assets/svg/repeat-svg";

type Props = {
  selected?: number | null;
  onSelect?: (value: number) => void;
  chipSize?: number;
  className?: string;

  onRepeat?: () => void;
  canRepeat?: boolean;
};

const CHIPS: Array<{
  value: number;
  color: "green" | "blue" | "red" | "yellow";
  src: string;
}> = [
  { value: 50, color: "green", src: "/assets/chips/chip_green.png" },
  { value: 100, color: "blue", src: "/assets/chips/chip_blue.png" },
  { value: 200, color: "red", src: "/assets/chips/chip_red.png" },
  { value: 500, color: "yellow", src: "/assets/chips/chip_yellow.png" },
];

export default function ChipTray({
  selected = null,
  onSelect,
  chipSize = 45,
  className,
  onRepeat,
  canRepeat = true,
}: Props) {
  const wrap: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    userSelect: "none",
  };

  const baseButton: React.CSSProperties = {
    width: chipSize,
    height: chipSize,
    position: "relative",
    border: "none",
    padding: 0,
    background: "transparent",
    cursor: "pointer",
    borderRadius: "50%",
    outline: "none",
    transition: "transform 160ms ease, filter 160ms ease, opacity 160ms ease",
  };

  const renderRepeat = () => {
    const disabled = !canRepeat || !onRepeat;
    return (
      <button
        type="button"
        aria-label="Repeat last bet"
        title="Repeat last bet"
        disabled={disabled}
        onClick={() => !disabled && onRepeat?.()}
        style={{
          ...baseButton,
          filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.35))",
          transform: "translateY(0) scale(1)",
          opacity: disabled ? 0.5 : 1,
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <RepeatSVG />
      </button>
    );
  };

  return (
    <div className={className} style={wrap}>
      {renderRepeat()}

      {CHIPS.map(({ value, color, src }) => {
        const isSelected = selected === value;

        const btn: React.CSSProperties = {
          ...baseButton,
          filter: isSelected
            ? "drop-shadow(0 10px 20px rgba(0,0,0,0.5))"
            : "drop-shadow(0 6px 12px rgba(0,0,0,0.35))",
          transform: isSelected
            ? "translateY(-2px) scale(1.2)"
            : "translateY(0) scale(1)",
        };

        const img: React.CSSProperties = {
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        };

        const textColor = color === "yellow" ? "#111" : "#fff";

        const label: React.CSSProperties = {
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, Arial, sans-serif",
          fontWeight: 800,
          fontSize: Math.round(chipSize * 0.28),
          color: textColor,
          textShadow:
            color === "yellow"
              ? "0 1px 1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.35)"
              : "0 1px 1px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.45)",
          pointerEvents: "none",
        };

        return (
          <button
            key={value}
            type="button"
            style={btn}
            onClick={() => onSelect?.(value)}
            aria-pressed={isSelected}
            aria-label={`Select chip ${value}`}
          >
            <img src={src} alt="" style={img} />
            <div style={label}>{value}</div>
          </button>
        );
      })}
    </div>
  );
}
