import * as PIXI from "pixi.js";
import { angleStep, NUMBER_ORDER, RADIUS } from "../../constants";

const pocketShift = 0;
const wheelDirection = +1;
const rotationAdjust = -0.08;
const wheelOffset = -Math.PI / 2 + rotationAdjust;

const extraTurns = 8;
const spinSeconds = 5;

// 🔽 Mobile scale
const MOBILE_SCALE = 0.8;
const isMobile = typeof window !== "undefined" && window.innerWidth <= 868;

const BASE_RADIUS = RADIUS;
const EFFECTIVE_RADIUS = isMobile ? BASE_RADIUS * MOBILE_SCALE : BASE_RADIUS;

export default class RouletteWheel extends PIXI.Container {
  private wheelContainer = new PIXI.Container();
  private overlayContainer = new PIXI.Container();
  private ballGraphic = new PIXI.Graphics();
  private spinTicker = new PIXI.Ticker();

  private resultNumber = 0;
  private ballAngleRad = 0;

  private ballTrackRadius = EFFECTIVE_RADIUS - 27;

  private dropDepthPx = isMobile ? 50 : 75;
  private dropStartRatio = 0.3;

  private overlayReverse = true;
  private overlayShift = 0;
  private overlayVisible = false;
  private overlayScale = 0.9;

  private slotToNumber: number[] = [];
  private numberToSlot = new Map<number, number>();

  constructor() {
    super();
    this.sortableChildren = true;
    this.wheelContainer.sortableChildren = true;

    this.buildSlotMaps();
    this.initWheel();
    this.initBall();
    this.addChild(this.wheelContainer);
  }

  private easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }
  private easeInCubic(t: number) {
    return t * t * t;
  }
  private normalizeAngle(a: number) {
    const tau = Math.PI * 2;
    a %= tau;
    if (a < 0) a += tau;
    return a;
  }
  private clockwiseDelta(from: number, to: number) {
    return this.normalizeAngle(from - to);
  }
  private angleForSlot(slot: number) {
    return wheelOffset + slot * angleStep;
  }

  private buildSlotMaps() {
    const n = NUMBER_ORDER.length;
    this.slotToNumber = new Array(n);
    this.numberToSlot.clear();
    for (let slot = 0; slot < n; slot++) {
      const sourceIndex = wheelDirection === +1 ? slot : (n - slot) % n;
      const idx = (sourceIndex + pocketShift) % n;
      const num = NUMBER_ORDER[idx];
      this.slotToNumber[slot] = num;
      this.numberToSlot.set(num, slot);
    }
  }

  private async initWheel() {
    const texture = await PIXI.Assets.load(
      import.meta.env.BASE_URL + "assets/roulette-background.jpg"
    );
    const background = new PIXI.Sprite(texture);
    background.anchor.set(0.5);
    background.width = EFFECTIVE_RADIUS * 2;
    background.height = EFFECTIVE_RADIUS * 2;
    background.zIndex = 0;

    this.wheelContainer.addChild(background);
    this.wheelContainer.addChild(this.overlayContainer);
    this.overlayContainer.scale.set(this.overlayScale);
    this.drawOverlay();
    this.drawSpokes();
  }

  private drawSpokes() {
    for (let i = 0; i < 4; i++) {
      const spoke = new PIXI.Graphics();
      spoke.lineStyle(4, 0x333333);
      const ang = (Math.PI / 2) * i;
      spoke.moveTo(0, 0);
      spoke.lineTo(40 * Math.cos(ang), 40 * Math.sin(ang));
      spoke.zIndex = 1;
      this.wheelContainer.addChild(spoke);
    }
  }

  private drawOverlay() {
    this.overlayContainer.removeChildren();
    if (!this.overlayVisible) return;

    const n = NUMBER_ORDER.length;
    const dir = this.overlayReverse ? -1 : 1;

    const indexForSlot = (slot: number) => {
      const base = this.overlayReverse ? (n - slot) % n : slot;
      return (base + this.overlayShift) % n;
    };

    for (let slot = 0; slot < n; slot++) {
      const start = wheelOffset + dir * slot * angleStep;
      const end = start + dir * angleStep;
      const mid = start + dir * (angleStep / 2);
      const number = NUMBER_ORDER[indexForSlot(slot)];

      const sector = new PIXI.Graphics();
      sector.lineStyle(1, 0xff0000);
      sector.beginFill(0x000000, 0);
      sector.moveTo(0, 0);
      sector.lineTo(
        EFFECTIVE_RADIUS * Math.cos(start),
        EFFECTIVE_RADIUS * Math.sin(start)
      );
      sector.lineTo(
        EFFECTIVE_RADIUS * Math.cos(end),
        EFFECTIVE_RADIUS * Math.sin(end)
      );
      sector.lineTo(0, 0);
      sector.endFill();
      this.overlayContainer.addChild(sector);

      const text = new PIXI.Text(number.toString(), {
        fontSize: 14 * (isMobile ? MOBILE_SCALE : 1),
        fill: "green",
        fontFamily: "Arial",
        fontWeight: "bold",
        align: "center",
      });
      text.anchor.set(0.5);
      text.position.set(
        (EFFECTIVE_RADIUS - 15) * Math.cos(mid),
        (EFFECTIVE_RADIUS - 15) * Math.sin(mid)
      );
      text.rotation = mid + Math.PI / 2;
      text.zIndex = 2;
      this.overlayContainer.addChild(text);
    }
  }

  private initBall() {
    this.ballGraphic.clear();
    this.ballGraphic
      .beginFill(0xffffff)
      .drawCircle(0, 0, 6 * (isMobile ? MOBILE_SCALE : 1))
      .endFill();
    this.ballGraphic.zIndex = 12;
    this.wheelContainer.addChild(this.ballGraphic);
    this.setBallPosition(this.ballAngleRad, this.ballTrackRadius);
  }

  private setBallPosition(angle: number, radius: number) {
    this.ballGraphic.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    );
  }

  public spin() {
    this.resultNumber = Math.floor(Math.random() * 37);
    this.animateSpin();
    return this.resultNumber;
  }

  private animateSpin() {
    const targetSlot = this.numberToSlot.get(this.resultNumber);
    if (targetSlot == null) return;

    const targetAngle = this.angleForSlot(targetSlot) + angleStep / 2;
    const start = this.ballAngleRad;

    const tau = Math.PI * 2;
    const deltaCW = this.clockwiseDelta(start, targetAngle);
    const totalCW = extraTurns * tau + deltaCW;

    let elapsed = 0;

    this.spinTicker.stop();
    this.spinTicker.destroy();
    this.spinTicker = new PIXI.Ticker();

    this.spinTicker.add((tk: PIXI.Ticker) => {
      elapsed += tk.deltaMS / 1000;
      const p = Math.min(elapsed / spinSeconds, 1);

      const angleEase = this.easeOutCubic(p);
      const angle = start - totalCW * angleEase;

      let radius = this.ballTrackRadius;
      if (p >= this.dropStartRatio) {
        const t = (p - this.dropStartRatio) / (1 - this.dropStartRatio);
        const dropEased = this.easeInCubic(t);
        radius = this.ballTrackRadius - this.dropDepthPx * dropEased;
      }

      this.setBallPosition(angle, radius);

      if (p === 1) {
        this.ballAngleRad = this.normalizeAngle(angle);
        this.spinTicker.stop();
      }
    });

    this.spinTicker.start();
  }

  public setBallMargin(pixelsFromEdge: number) {
    this.ballTrackRadius = EFFECTIVE_RADIUS - Math.max(0, pixelsFromEdge);
    this.setBallPosition(this.ballAngleRad, this.ballTrackRadius);
  }

  public setFallDepth(px: number) {
    this.dropDepthPx = Math.max(0, px);
  }

  public setFallStartRatio(ratio: number) {
    this.dropStartRatio = Math.max(0, Math.min(1, ratio));
  }

  public setOverlayVisible(visible: boolean) {
    this.overlayVisible = visible;
    this.drawOverlay();
  }

  public setOverlayShift(shift: number) {
    const n = NUMBER_ORDER.length;
    this.overlayShift = ((shift % n) + n) % n;
    this.drawOverlay();
  }

  public setOverlayReversed(reversed: boolean) {
    this.overlayReverse = reversed;
    this.drawOverlay();
  }

  public setOverlayScale(scale: number) {
    this.overlayScale = Math.max(0.1, scale);
    this.overlayContainer.scale.set(this.overlayScale);
  }
}
