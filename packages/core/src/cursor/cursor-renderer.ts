import { gsap } from "gsap";
import type { CursorManager } from "./cursor-manager.js";
import type { CursorIdentity } from "../types.js";
import { NaturalCursorMovementEngine } from "./natural-cursor-movement.js";
import type { NaturalMovementOptions, NaturalMovementStep } from "./natural-cursor-movement.js";

export interface CursorPoint { x: number; y: number; }
export interface CursorRendererOptions {
  duration?: number;
  ease?: string;
  zIndex?: number;
  maxVisible?: number;
  tabletMaxVisible?: number;
  mobileMaxVisible?: number;
  respectReducedMotion?: boolean;
  initialPositions?: Record<string, CursorPoint>;
  naturalMovement?: NaturalMovementOptions;
}
interface CursorNode { element: HTMLDivElement; label: HTMLSpanElement; color: string; name: string; }

/**
 * Renders cursor identities into a non-interactive overlay. Coordinates are
 * relative to the supplied container's top-left corner, in CSS pixels.
 */
export class CursorRenderer {
  private readonly overlay: HTMLDivElement;
  readonly naturalMovement: NaturalCursorMovementEngine;
  private readonly nodes = new Map<string, CursorNode>();
  private readonly positions = new Map<string, CursorPoint>();
  private readonly tweens = new Map<string, gsap.core.Tween>();
  private readonly pulses = new Map<string, gsap.core.Timeline>();
  private readonly unsubscribe: () => void;
  private readonly options: Required<Omit<CursorRendererOptions, "initialPositions">>;
  private readonly initialPositions: Record<string, CursorPoint>;
  private readonly originalPosition: string;
  private readonly changedContainerPosition: boolean;
  private reducedMotion: boolean;
  private mediaQuery?: MediaQueryList;
  private destroyed = false;

  constructor(private readonly manager: CursorManager, private readonly container: HTMLElement, options: CursorRendererOptions = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") throw new Error("CursorRenderer requires a browser DOM.");
    this.options = {
      duration: options.duration ?? 0.72,
      ease: options.ease ?? "power3.out",
      zIndex: options.zIndex ?? 50,
      maxVisible: options.maxVisible ?? 8,
      tabletMaxVisible: options.tabletMaxVisible ?? 3,
      mobileMaxVisible: options.mobileMaxVisible ?? 2,
      respectReducedMotion: options.respectReducedMotion ?? true
    };
    if (!Number.isFinite(this.options.duration) || this.options.duration < 0) throw new RangeError("duration must be finite and non-negative.");
    for (const limit of [this.options.maxVisible, this.options.tabletMaxVisible, this.options.mobileMaxVisible]) {
      if (!Number.isInteger(limit) || limit < 0) throw new RangeError("Visible cursor limits must be non-negative integers.");
    }
    this.initialPositions = options.initialPositions ?? {};
    this.mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : undefined;
    this.reducedMotion = this.options.respectReducedMotion && !!this.mediaQuery?.matches;

    this.originalPosition = container.style.position;
    const computedPosition = window.getComputedStyle(container).position;
    // Some DOM test environments return an empty computed value for the default
    // static position. Treat that as static so the absolute overlay has a
    // reliable containing block in browsers and non-layout DOM environments.
    this.changedContainerPosition = !computedPosition || computedPosition === "static";
    if (this.changedContainerPosition) container.style.position = "relative";

    this.overlay = document.createElement("div");
    this.overlay.className = "cursorbuild-overlay";
    this.overlay.setAttribute("aria-hidden", "true");
    Object.assign(this.overlay.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      overflow: "visible", pointerEvents: "none", zIndex: String(this.options.zIndex),
      contain: "layout style", isolation: "isolate"
    });
    container.appendChild(this.overlay);

    this.unsubscribe = manager.subscribe(() => this.sync());
    this.mediaQuery?.addEventListener?.("change", this.handleMotionChange);
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.sync();
  }

  /** Animate one cursor to container-relative CSS pixel coordinates. */
  moveTo(id: string, point: CursorPoint, duration = this.options.duration): void {
    this.assertActive();
    if (!this.nodes.has(id)) throw new Error("Unknown rendered cursor: " + id);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new TypeError("Cursor coordinates must be finite numbers.");
    if (!Number.isFinite(duration) || duration < 0) throw new RangeError("Movement duration must be finite and non-negative.");
    this.positions.set(id, { ...point });
    const node = this.nodes.get(id)!.element;
    this.tweens.get(id)?.kill();
    if (this.reducedMotion || duration <= 0) {
      gsap.set(node, { x: point.x, y: point.y });
      return;
    }
    const tween = gsap.to(node, { x: point.x, y: point.y, duration, ease: this.options.ease, overwrite: "auto" });
    this.tweens.set(id, tween);
  }

  /** Move one cursor along a natural curved path with configurable GSAP easing. */
  moveNaturally(id: string, point: CursorPoint, options: Omit<NaturalMovementStep, "pauseAfter"> = {}): gsap.core.Timeline | undefined {
    this.assertActive();
    return this.naturalMovement.moveTo(id, point, options);
  }

  /** Move one cursor through multiple curved destinations, with optional pauses between them. */
  moveSequence(id: string, steps: NaturalMovementStep[], options: NaturalMovementOptions = {}): gsap.core.Timeline | undefined {
    this.assertActive();
    return this.naturalMovement.playSequence(id, steps, options);
  }

  /** Stop only the selected cursor's natural movement. */
  stopNaturalMovement(id: string): void {
    this.assertActive();
    this.naturalMovement.cancel(id);
  }

  /** Play a restrained click pulse on a cursor without dispatching a DOM click. */
  click(id: string): void {
    this.assertActive();
    const cursor = this.nodes.get(id);
    if (!cursor) throw new Error("Unknown rendered cursor: " + id);
    const halo = cursor.element.querySelector<HTMLElement>(".cursorbuild-cursor__halo");
    if (!halo || this.reducedMotion) return;
    this.pulses.get(id)?.kill();
    gsap.set(halo, { scale: 0.45, opacity: 0.65 });
    const timeline = gsap.timeline();
    timeline.to(halo, { scale: 1.9, opacity: 0, duration: 0.42, ease: "power2.out" });
    this.pulses.set(id, timeline);
  }

  getPosition(id: string): CursorPoint | undefined {
    const point = this.positions.get(id);
    return point ? { ...point } : undefined;
  }

  /** Remove DOM, GSAP resources, subscriptions, and listeners owned by this renderer. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe();
    this.mediaQuery?.removeEventListener?.("change", this.handleMotionChange);
    window.removeEventListener("resize", this.handleResize);
    this.tweens.forEach((tween) => tween.kill());
    this.pulses.forEach((timeline) => timeline.kill());
    this.nodes.forEach(({ element }) => gsap.killTweensOf(element));
    this.tweens.clear(); this.pulses.clear(); this.nodes.clear(); this.positions.clear();
    this.overlay.remove();
    if (this.changedContainerPosition && this.container.style.position === "relative") this.container.style.position = this.originalPosition;
  }

  private readonly handleMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = this.options.respectReducedMotion && event.matches;
    if (this.reducedMotion) {
      this.tweens.forEach((tween) => tween.kill()); this.tweens.clear();
      this.positions.forEach((point, id) => { const node = this.nodes.get(id); if (node) gsap.set(node.element, { x: point.x, y: point.y }); });
      this.pulses.forEach((timeline) => timeline.kill()); this.pulses.clear();
    }
  };

  private readonly handleResize = (): void => this.updateVisibility();

  private assertActive(): void { if (this.destroyed) throw new Error("CursorRenderer has been destroyed."); }

  private sync(): void {
    if (this.destroyed) return;
    const identities = this.manager.getAll();
    const activeIds = new Set(identities.map((identity) => identity.id));
    for (const id of this.nodes.keys()) if (!activeIds.has(id)) this.removeNode(id);
    identities.forEach((identity, index) => this.upsertNode(identity, index));
    this.updateVisibility();
  }

  private upsertNode(identity: CursorIdentity, index: number): void {
    let cursor = this.nodes.get(identity.id);
    if (!cursor) {
      const element = document.createElement("div");
      element.className = "cursorbuild-cursor";
      element.dataset.cursorId = identity.id;
      Object.assign(element.style, {
        position: "absolute", left: "0", top: "0", display: "flex",
        alignItems: "flex-start", gap: "5px", pointerEvents: "none",
        willChange: "transform", transform: "translate3d(0,0,0)"
      });
      element.innerHTML = '<span class="cursorbuild-cursor__pointer"><span class="cursorbuild-cursor__halo"></span><svg viewBox="0 0 24 30" width="25" height="30" aria-hidden="true"><path class="cursorbuild-cursor__shape" d="M2 1.5v22l5.8-5.5 4.1 9 4-1.8-4.2-8.8 8-.2L2 1.5Z" stroke="white" stroke-width="1.7" stroke-linejoin="round"/></svg></span><span class="cursorbuild-cursor__label"></span>';
      const label = element.querySelector<HTMLSpanElement>(".cursorbuild-cursor__label")!;
      cursor = { element, label, color: "", name: "" };
      this.nodes.set(identity.id, cursor);
      this.overlay.appendChild(element);
      const initial = this.initialPositions[identity.id] ?? { x: 24 + (index % 4) * 38, y: 28 + (index % 3) * 32 };
      if (!Number.isFinite(initial.x) || !Number.isFinite(initial.y)) throw new TypeError("Initial cursor coordinates must be finite numbers.");
      this.positions.set(identity.id, { ...initial });
      gsap.set(element, { x: initial.x, y: initial.y });
    }
    if (cursor.name !== identity.name) { cursor.name = identity.name; cursor.label.textContent = identity.name; }
    if (cursor.color !== identity.color) {
      cursor.color = identity.color;
      cursor.element.style.setProperty("--cursorbuild-color", identity.color);
      const shape = cursor.element.querySelector<SVGPathElement>(".cursorbuild-cursor__shape");
      if (shape) shape.setAttribute("fill", identity.color);
      cursor.label.style.backgroundColor = identity.color;
    }
  }

  private setNaturalPosition(id: string, point: CursorPoint): void {
    const cursor = this.nodes.get(id);
    if (!cursor) return;
    this.positions.set(id, { ...point });
    gsap.set(cursor.element, { x: point.x, y: point.y });
  }

  private removeNode(id: string): void {
    this.tweens.get(id)?.kill(); this.tweens.delete(id);
    this.pulses.get(id)?.kill(); this.pulses.delete(id);
    const cursor = this.nodes.get(id);
    if (cursor) { gsap.killTweensOf(cursor.element); cursor.element.remove(); this.nodes.delete(id); }
    this.positions.delete(id);
  }

  private updateVisibility(): void {
    const width = window.innerWidth;
    const limit = width <= 600 ? this.options.mobileMaxVisible : width <= 900 ? this.options.tabletMaxVisible : this.options.maxVisible;
    const entries = [...this.nodes.entries()];
    const visibleIds = new Set(entries.slice(Math.max(0, entries.length - limit)).map(([id]) => id));
    entries.forEach(([id, cursor]) => {
      const display = visibleIds.has(id) ? "flex" : "none";
      if (cursor.element.style.display !== display) cursor.element.style.display = display;
    });
  }
}
