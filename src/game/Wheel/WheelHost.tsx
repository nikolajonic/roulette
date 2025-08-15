import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as PIXI from "pixi.js";
import RouletteWheel from "./RouletteWheel";

export type WheelHostHandle = { spin: () => number };

type Props = { width?: number; height?: number; className?: string };

const WheelHost = forwardRef<WheelHostHandle, Props>(
  ({ width = 360, height = 360, className }, ref) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const wheelRef = useRef<RouletteWheel | null>(null);

    useEffect(() => {
      let canceled = false;

      (async () => {
        const app = new PIXI.Application();
        await app.init({ width, height, backgroundAlpha: 0 });
        if (canceled) return;

        appRef.current = app;
        hostRef.current?.appendChild(app.canvas);

        const wheel = new RouletteWheel();
        wheel.x = app.screen.width / 2;
        wheel.y = app.screen.height / 2;
        app.stage.addChild(wheel);
        wheelRef.current = wheel;
      })();

      return () => {
        canceled = true;
        try {
          appRef.current?.destroy(true, { children: true });
        } catch {}
        appRef.current = null;
        wheelRef.current = null;
        if (hostRef.current) hostRef.current.innerHTML = "";
      };
    }, [width, height]);

    useImperativeHandle(ref, () => ({
      spin: () => wheelRef.current?.spin() ?? Math.floor(Math.random() * 37),
    }));

    return (
      <div
        ref={hostRef}
        className={className}
        style={{ width, height, marginBottom: "20px" }}
      />
    );
  }
);

export default WheelHost;
