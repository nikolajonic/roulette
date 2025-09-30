export const ROULETTE_WHEEL_WIDTH = 400;
export const ROULETTE_WHEEL_HEIGHT = 400;
export const BET_PANEL_HEIGHT = 200;
export const RESULT_DISPLAY_WIDTH = 300;
export const RESULT_DISPLAY_HEIGHT = 100;

export const NUMBER_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
export const RADIUS = 200;

export const angleStep = (Math.PI * 2) / NUMBER_ORDER.length;

export const redSet = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
export const blackSet = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export const INIT_BALANCE = 500000;

export const neighborsStyle = `.nb-ctrl {
    display:inline-flex; align-items:center; gap:12px;
    padding:6px 10px; border-radius:9999px;
    background: linear-gradient(180deg,#151a22,#0f1318);
    border:1px solid #2a2f36;
    box-shadow: 0 6px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
    color:#e6edf5; user-select:none;
    font-family: Inter, system-ui, Arial, sans-serif;
  }
  .nb-label { font-weight:600; font-size:13px; opacity:.85; }
  .nb-btn {
    width:32px; height:32px; border-radius:9999px;
    display:flex; align-items:center; justify-content:center;
    background:#1e252f; border:1px solid #2e3642; color:#e7edf6;
    cursor:pointer; line-height:1;
    transition: transform .08s ease, background .15s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .nb-btn:hover { background:#243041; box-shadow:0 0 0 3px rgba(0,255,224,.18); }
  .nb-btn:active { transform: translateY(1px) scale(.98); }
  .nb-btn:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; }
  .nb-value {
    min-width:38px; text-align:center; font-variant-numeric: tabular-nums;
    font-weight:800; font-size:14px; padding:4px 10px; border-radius:10px;
    background:#0b0f14; border:1px solid #222a33;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
  }
`;
