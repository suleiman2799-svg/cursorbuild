export type VisualEffectTarget = string | HTMLElement;
export interface VisualPoint { x: number; y: number; }
export interface VisualGuide { axis: "vertical" | "horizontal"; position: number; label?: string; color?: string; }
export interface VisualEffectHandle { readonly element: HTMLElement; refresh(): void; destroy(): void; }
export type VisualEffectsPerformanceMode = "auto" | "quality" | "balanced" | "performance";
export interface VisualEffectsOptions {
  zIndex?: number;
  gridSize?: number;
  respectReducedMotion?: boolean;
  /** Auto selects a lighter profile on touch/small/low-capability devices. */
  performanceMode?: VisualEffectsPerformanceMode;
  /** Maximum SVG points retained in one cursor trail. */
  maxTrailPoints?: number;
  /** Maximum target outlines created by blueprint snapshots. */
  maxBlueprintElements?: number;
}
export interface HighlightOptions { color?: string; opacity?: number; padding?: number; }
export interface GridOptions { size?: number; color?: string; opacity?: number; }
export interface TrailOptions { color?: string; width?: number; opacity?: number; }
const SVG_NS = "http://www.w3.org/2000/svg";

/** Optional pointer-transparent overlays. Geometry uses container-relative CSS pixels. */
export class VisualEffectsManager {
  readonly overlay: HTMLDivElement;
  private readonly zIndex: number;
  private performanceMode: Exclude<VisualEffectsPerformanceMode, "auto">;
  private gridSize: number;
  private maxTrailPoints: number;
  private maxBlueprintElements: number;
  private readonly requestedMode: VisualEffectsPerformanceMode;
  private readonly configuredGridSize?: number;
  private readonly configuredMaxTrailPoints?: number;
  private readonly configuredMaxBlueprintElements?: number;
  private readonly coarsePointerQuery?: MediaQueryList;
  private viewportFrame?: number;
  private readonly reducedMotionQuery?: MediaQueryList;
  private readonly respectReducedMotion: boolean;
  private reducedMotion: boolean;
  private readonly originalPosition: string;
  private readonly changedPosition: boolean;
  private readonly handles = new Set<VisualEffectHandle>();
  private readonly transientCleanups = new Set<() => void>();
  private progress?: HTMLDivElement;
  private destroyed = false;

  constructor(private readonly container: HTMLElement, options: VisualEffectsOptions = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") throw new Error("VisualEffectsManager requires a browser DOM.");
    this.zIndex = options.zIndex ?? 40;
    this.requestedMode = options.performanceMode ?? "auto";
    if (!["auto", "quality", "balanced", "performance"].includes(this.requestedMode)) throw new TypeError("Unknown visual-effects performance mode.");
    this.configuredGridSize = options.gridSize;
    this.configuredMaxTrailPoints = options.maxTrailPoints;
    this.configuredMaxBlueprintElements = options.maxBlueprintElements;
    this.coarsePointerQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)")
      : undefined;
    this.performanceMode = this.resolvePerformanceMode();
    this.gridSize = this.configuredGridSize ?? (this.performanceMode === "performance" ? 40 : 24);
    this.maxTrailPoints = this.configuredMaxTrailPoints ?? (this.performanceMode === "quality" ? 1024 : this.performanceMode === "performance" ? 64 : 256);
    this.maxBlueprintElements = this.configuredMaxBlueprintElements ?? (this.performanceMode === "quality" ? 1000 : this.performanceMode === "performance" ? 80 : 250);
    if (!Number.isInteger(this.zIndex)) throw new RangeError("zIndex must be an integer.");
    if (!Number.isFinite(this.gridSize) || this.gridSize <= 0) throw new RangeError("gridSize must be finite and greater than zero.");
    if (!Number.isInteger(this.maxTrailPoints) || this.maxTrailPoints < 2) throw new RangeError("maxTrailPoints must be an integer of at least 2.");
    if (!Number.isInteger(this.maxBlueprintElements) || this.maxBlueprintElements < 1) throw new RangeError("maxBlueprintElements must be a positive integer.");
    this.originalPosition = container.style.position;
    const position = window.getComputedStyle(container).position;
    this.changedPosition = !position || position === "static";
    if (this.changedPosition) container.style.position = "relative";
    this.respectReducedMotion = options.respectReducedMotion ?? true;
    this.reducedMotionQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : undefined;
    this.reducedMotion = this.respectReducedMotion && !!this.reducedMotionQuery?.matches;
    this.reducedMotionQuery?.addEventListener?.("change", this.handleMotionChange);
    this.overlay = document.createElement("div"); this.overlay.className = "cursorbuild-effects";
    this.overlay.setAttribute("aria-hidden", "true");
    Object.assign(this.overlay.style, { position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: String(this.zIndex), contain: "layout style", isolation: "isolate" });
    container.appendChild(this.overlay);
    if (this.requestedMode === "auto") {
      window.addEventListener("resize", this.handleViewportChange, { passive: true });
      this.coarsePointerQuery?.addEventListener?.("change", this.handleViewportChange);
    }
  }
  highlight(target: VisualEffectTarget, options: HighlightOptions = {}): VisualEffectHandle {
    this.assertActive(); const element = this.resolveTarget(target); const color = options.color ?? "#8b5cf6";
    const box = this.box("cursorbuild-effect-highlight");
    Object.assign(box.style, { border: "2px solid " + color, background: this.alpha(color, options.opacity ?? 0.12), margin: -(options.padding ?? 0) + "px" });
    return this.track(box, () => this.positionBox(box, element, options.padding ?? 0));
  }
  showSelectionBox(target: VisualEffectTarget, label?: string): VisualEffectHandle {
    this.assertActive(); const element = this.resolveTarget(target); const box = this.box("cursorbuild-effect-selection");
    Object.assign(box.style, { border: "1px solid #3b82f6", outline: "1px solid rgba(59,130,246,.28)", outlineOffset: "3px" });
    if (label) { const tag = document.createElement("span"); tag.textContent = label; Object.assign(tag.style, { position: "absolute", left: "0", bottom: "100%", padding: "2px 6px", color: "#fff", background: "#3b82f6", font: "11px/1.4 sans-serif" }); box.appendChild(tag); }
    return this.track(box, () => this.positionBox(box, element));
  }
  showGuides(guides: readonly VisualGuide[]): () => void {
    this.assertActive(); if (!Array.isArray(guides)) throw new TypeError("guides must be an array.");
    const group = document.createElement("div"); group.className = "cursorbuild-effect-guides";
    for (const guide of guides) {
      if (!guide || !["vertical", "horizontal"].includes(guide.axis) || !Number.isFinite(guide.position)) throw new TypeError("Each guide needs a valid axis and finite position.");
      const line = document.createElement("div");
      Object.assign(line.style, { position: "absolute", background: guide.color ?? "#ec4899", ...(guide.axis === "vertical" ? { left: guide.position + "px", top: "0", width: "1px", height: "100%" } : { top: guide.position + "px", left: "0", height: "1px", width: "100%" }) });
      group.appendChild(line);
      if (guide.label) { const tag = document.createElement("span"); tag.textContent = guide.label; Object.assign(tag.style, { position: "absolute", padding: "2px 5px", color: "#fff", background: guide.color ?? "#ec4899", font: "10px/1.4 sans-serif", ...(guide.axis === "vertical" ? { left: guide.position + "px", top: "4px" } : { left: "4px", top: guide.position + "px" }) }); group.appendChild(tag); }
    }
    this.overlay.appendChild(group); return this.registerTransient(group);
  }
  showSnapGuide(axis: VisualGuide["axis"], position: number, label = "Snap"): () => void { return this.showGuides([{ axis, position, label, color: "#10b981" }]); }
  showMeasurement(from: VisualPoint, to: VisualPoint, label?: string): HTMLElement {
    this.assertActive(); this.validatePoint(from); this.validatePoint(to);
    const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
    const line = this.box("cursorbuild-effect-measurement");
    Object.assign(line.style, { left: from.x + "px", top: from.y + "px", width: length + "px", height: "1px", background: "#f59e0b", transformOrigin: "0 50%", transform: "rotate(" + Math.atan2(dy, dx) + "rad)" });
    if (label) { const tag = document.createElement("span"); tag.textContent = label; Object.assign(tag.style, { position: "absolute", left: length / 2 + "px", top: "-18px", transform: "translateX(-50%)", padding: "1px 4px", color: "#111827", background: "#fbbf24", font: "11px/1.4 sans-serif", whiteSpace: "nowrap" }); line.appendChild(tag); }
    this.registerTransient(line);
    return line;
  }
  showGrid(options: GridOptions = {}): VisualEffectHandle {
    this.assertActive(); const size = options.size ?? this.gridSize, opacity = options.opacity ?? 0.22, color = options.color ?? "#64748b";
    if (!Number.isFinite(size) || size <= 0) throw new RangeError("Grid size must be finite and greater than zero.");
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new RangeError("Grid opacity must be between 0 and 1.");
    const grid = this.box("cursorbuild-effect-grid");
    Object.assign(grid.style, { backgroundImage: "linear-gradient(to right, " + this.alpha(color, opacity) + " 1px, transparent 1px), linear-gradient(to bottom, " + this.alpha(color, opacity) + " 1px, transparent 1px)", backgroundSize: size + "px " + size + "px" });
    return this.track(grid, () => Object.assign(grid.style, { width: this.container.clientWidth + "px", height: this.container.clientHeight + "px" }));
  }
  setBlueprintMode(enabled: boolean): VisualEffectHandle | undefined {
    this.assertActive(); if (!enabled) return undefined;
    // Build the snapshot off-DOM: interleaving DOM writes with geometry reads
    // would repeatedly invalidate layout on large pages.
    const layer = document.createElement("div");
    layer.className = "cursorbuild-effect-blueprint";
    Object.assign(layer.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    const origin = this.origin();
    let outlined = 0;
    const walker = document.createTreeWalker(this.container, NodeFilter.SHOW_ELEMENT);
    let current = walker.nextNode();
    while (current && outlined < this.maxBlueprintElements) {
      const element = current as HTMLElement;
      current = walker.nextNode();
      if (element === this.overlay || this.overlay.contains(element) || element.classList.contains("cursorbuild-overlay")) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      outlined += 1;
      const outline = document.createElement("div");
      Object.assign(outline.style, { position: "absolute", left: rect.left - origin.x + "px", top: rect.top - origin.y + "px", width: rect.width + "px", height: rect.height + "px", border: "1px solid rgba(56,189,248,.55)", boxSizing: "border-box" });
      layer.appendChild(outline);
    }
    this.overlay.appendChild(layer);
    return this.track(layer, () => {});
  }
  showCursorTrail(points: readonly VisualPoint[], options: TrailOptions = {}): SVGSVGElement {
    this.assertActive(); if (points.length < 2) throw new RangeError("A cursor trail needs at least two points."); points.forEach(p => this.validatePoint(p));
    const svg = document.createElementNS(SVG_NS, "svg"); svg.setAttribute("class", "cursorbuild-effect-trail");
    svg.setAttribute("width", String(this.container.clientWidth)); svg.setAttribute("height", String(this.container.clientHeight));
    Object.assign(svg.style, { position: "absolute", inset: "0", overflow: "visible", pointerEvents: "none" });
    const path = document.createElementNS(SVG_NS, "polyline");
    const trailPoints = points.length > this.maxTrailPoints
      ? Array.from({ length: this.maxTrailPoints }, (_, index) => points[Math.round(index * (points.length - 1) / (this.maxTrailPoints - 1))]!)
      : points;
    path.setAttribute("points", trailPoints.map(p => p.x + "," + p.y).join(" ")); path.setAttribute("fill", "none");
    path.setAttribute("stroke", options.color ?? "#8b5cf6"); path.setAttribute("stroke-width", String(options.width ?? 3));
    path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round"); path.setAttribute("opacity", String(options.opacity ?? 0.65));
    svg.appendChild(path); this.overlay.appendChild(svg); this.registerTransient(svg); return svg;
  }
  setProgress(value: number, label = "Construction progress"): void {
    this.assertActive(); if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("Progress must be between 0 and 1.");
    if (!this.progress) {
      const bar = document.createElement("div"); bar.className = "cursorbuild-effect-progress"; bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0"); bar.setAttribute("aria-valuemax", "100");
      Object.assign(bar.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "4px", background: "rgba(100,116,139,.2)" });
      const fill = document.createElement("div"); fill.className = "cursorbuild-effect-progress__fill";
      Object.assign(fill.style, { height: "100%", width: "0%", background: "#8b5cf6", transition: this.reducedMotion || this.performanceMode === "performance" ? "none" : "width 180ms ease" });
      bar.appendChild(fill); this.overlay.appendChild(bar); this.progress = bar;
    }
    this.progress.setAttribute("aria-label", label); this.progress.setAttribute("aria-valuenow", String(Math.round(value * 100)));
    const fill = this.progress.firstElementChild as HTMLElement | null; if (fill) fill.style.width = value * 100 + "%";
  }
  complete(label = "Construction complete"): void {
    this.assertActive(); this.setProgress(1, label);
    if (this.progress) { this.progress.dataset.complete = "true"; const fill = this.progress.firstElementChild as HTMLElement | null; if (fill) fill.style.background = "#10b981"; }
  }
  clear(): void {
    if (this.destroyed) return;
    for (const handle of Array.from(this.handles)) handle.destroy();
    for (const cleanup of Array.from(this.transientCleanups)) cleanup();
    this.overlay.replaceChildren();
    this.progress = undefined;
  }
  destroy(): void {
    if (this.destroyed) return;
    this.clear();
    window.removeEventListener("resize", this.handleViewportChange);
    this.coarsePointerQuery?.removeEventListener?.("change", this.handleViewportChange);
    this.reducedMotionQuery?.removeEventListener?.("change", this.handleMotionChange);
    if (this.viewportFrame !== undefined && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(this.viewportFrame);
      this.viewportFrame = undefined;
    }
    this.overlay.remove();
    if (this.changedPosition) this.container.style.position = this.originalPosition;
    this.destroyed = true;
  }
  private resolvePerformanceMode(): Exclude<VisualEffectsPerformanceMode, "auto"> {
    if (this.requestedMode !== "auto") return this.requestedMode;
    const touchDevice = !!this.coarsePointerQuery?.matches
      || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
    const hardware = typeof navigator === "undefined" ? undefined : navigator as Navigator & { deviceMemory?: number };
    const constrainedHardware = !!hardware && (
      (hardware.hardwareConcurrency > 0 && hardware.hardwareConcurrency <= 4)
      || (typeof hardware.deviceMemory === "number" && hardware.deviceMemory <= 4)
    );
    return touchDevice || constrainedHardware || window.innerWidth <= 600 ? "performance" : "balanced";
  }
  private readonly handleMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = this.respectReducedMotion && event.matches;
    const fill = this.progress?.firstElementChild as HTMLElement | null;
    if (fill) fill.style.transition = this.reducedMotion || this.performanceMode === "performance" ? "none" : "width 180ms ease";
  };
  private readonly handleViewportChange = (): void => {
    if (this.destroyed || this.requestedMode !== "auto" || this.viewportFrame !== undefined) return;
    const update = (): void => {
      this.viewportFrame = undefined;
      if (this.destroyed) return;
      const nextMode = this.resolvePerformanceMode();
      if (nextMode === this.performanceMode) return;
      this.performanceMode = nextMode;
      if (this.configuredGridSize === undefined) this.gridSize = nextMode === "performance" ? 40 : 24;
      if (this.configuredMaxTrailPoints === undefined) this.maxTrailPoints = nextMode === "quality" ? 1024 : nextMode === "performance" ? 64 : 256;
      if (this.configuredMaxBlueprintElements === undefined) this.maxBlueprintElements = nextMode === "quality" ? 1000 : nextMode === "performance" ? 80 : 250;
      const fill = this.progress?.firstElementChild as HTMLElement | null;
      if (fill) fill.style.transition = this.reducedMotion || nextMode === "performance" ? "none" : "width 180ms ease";
    };
    if (typeof window.requestAnimationFrame === "function") {
      this.viewportFrame = window.requestAnimationFrame(update);
    } else {
      update();
    }
  };
  private registerTransient<T extends HTMLElement | SVGSVGElement>(element: T): () => void {
    let active = true;
    const cleanup = (): void => {
      if (!active) return;
      active = false;
      element.remove();
      this.transientCleanups.delete(cleanup);
    };
    this.transientCleanups.add(cleanup);
    return cleanup;
  }
  private box(className: string): HTMLDivElement { const el = document.createElement("div"); el.className = className; Object.assign(el.style, { position: "absolute", boxSizing: "border-box", pointerEvents: "none" }); this.overlay.appendChild(el); return el; }
  private track(element: HTMLElement, refresh: () => void): VisualEffectHandle {
    let active = true; const handle: VisualEffectHandle = { element, refresh, destroy: () => { if (!active) return; active = false; element.remove(); this.handles.delete(handle); } };
    this.handles.add(handle); refresh(); return handle;
  }
  private positionBox(box: HTMLElement, target: HTMLElement, padding = 0): void {
    const r = target.getBoundingClientRect(), o = this.origin();
    Object.assign(box.style, { left: r.left - o.x - padding + "px", top: r.top - o.y - padding + "px", width: r.width + padding * 2 + "px", height: r.height + padding * 2 + "px" });
  }
  private origin(): VisualPoint { const r = this.container.getBoundingClientRect(); return { x: r.left + this.container.clientLeft - this.container.scrollLeft, y: r.top + this.container.clientTop - this.container.scrollTop }; }
  private resolveTarget(target: VisualEffectTarget): HTMLElement {
    const el = typeof target === "string" ? this.container.querySelector<HTMLElement>(target) : target;
    if (!(el instanceof HTMLElement) || el === this.container || !this.container.contains(el)) throw new Error("Effect target must be an HTMLElement contained by the mounted container.");
    return el;
  }
  private validatePoint(p: VisualPoint): void { if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new TypeError("Effect coordinates must be finite numbers."); }
  private alpha(color: string, opacity: number): string {
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new RangeError("Opacity must be between 0 and 1.");
    if (/^#[0-9a-f]{6}$/i.test(color)) { const n = Number.parseInt(color.slice(1), 16); return "rgba(" + (n >> 16) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + opacity + ")"; }
    return color;
  }
  private assertActive(): void { if (this.destroyed) throw new Error("VisualEffectsManager has been destroyed."); }
}
