// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VisualEffectsManager } from "./visual-effects-manager.js";

describe("VisualEffectsManager", () => {
  let manager: VisualEffectsManager | undefined;
  let container: HTMLDivElement;
  afterEach(() => { manager?.destroy(); manager = undefined; document.body.replaceChildren(); });
  function setup(): void {
    container = document.createElement("div");
    container.innerHTML = '<section id="card"><h2>Card</h2></section>';
    document.body.appendChild(container); manager = new VisualEffectsManager(container);
  }
  it("mounts a pointer-transparent overlay without changing child layout", () => {
    setup();
    expect(manager!.overlay.parentElement).toBe(container);
    expect(manager!.overlay.style.pointerEvents).toBe("none");
    expect(container.querySelector("#card")).not.toBeNull();
  });
  it("highlights and refreshes a contained element", () => {
    setup();
    const card = container.querySelector<HTMLElement>("#card")!;
    card.getBoundingClientRect = () => ({ left: 20, top: 30, right: 120, bottom: 90, width: 100, height: 60, x: 20, y: 30, toJSON: () => ({}) });
    const highlight = manager!.highlight("#card", { color: "#ff0000" });
    expect(highlight.element.className).toContain("highlight");
    expect(highlight.element.style.width).toBe("100px");
    highlight.destroy();
    expect(manager!.overlay.querySelector(".cursorbuild-effect-highlight")).toBeNull();
  });
  it("rejects outside targets and invalid geometry", () => {
    setup();
    expect(() => manager!.highlight(document.body)).toThrow(/contained/);
    expect(() => manager!.showMeasurement({ x: 0, y: 0 }, { x: Number.NaN, y: 1 })).toThrow(/finite/);
    expect(() => manager!.setProgress(1.2)).toThrow(/between 0 and 1/);
  });
  it("renders alignment and snap guides and measurements", () => {
    setup();
    const remove = manager!.showGuides([{ axis: "vertical", position: 40, label: "Center" }, { axis: "horizontal", position: 80 }]);
    expect(manager!.overlay.querySelectorAll(".cursorbuild-effect-guides > div")).toHaveLength(2);
    remove(); expect(manager!.overlay.querySelector(".cursorbuild-effect-guides")).toBeNull();
    manager!.showSnapGuide("vertical", 12);
    expect(manager!.overlay.querySelector(".cursorbuild-effect-guides")).not.toBeNull();
    expect(manager!.showMeasurement({ x: 0, y: 0 }, { x: 30, y: 40 }, "50px").style.width).toBe("50px");
  });
  it("supports grid, blueprint, trails, and progress completion", () => {
    setup();
    expect(manager!.showGrid().element.className).toContain("grid");
    expect(manager!.setBlueprintMode(true)?.element.className).toContain("blueprint");
    expect(manager!.showCursorTrail([{ x: 0, y: 0 }, { x: 10, y: 10 }]).querySelector("polyline")?.getAttribute("points")).toBe("0,0 10,10");
    manager!.setProgress(0.5); manager!.complete();
    expect(manager!.overlay.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("100");
    expect(manager!.overlay.querySelector('[role="progressbar"]')?.getAttribute("data-complete")).toBe("true");
  });
  it("bounds trail and blueprint rendering in the performance profile", () => {
    container = document.createElement("div");
    let geometryReads = 0;
    for (let index = 0; index < 5; index += 1) {
      const item = document.createElement("div");
      item.textContent = "item " + index;
      item.getBoundingClientRect = () => {
        geometryReads += 1;
        expect(manager!.overlay.querySelector(".cursorbuild-effect-blueprint")).toBeNull();
        return {
          left: index * 10, top: 0, right: index * 10 + 8, bottom: 8,
          width: 8, height: 8, x: index * 10, y: 0, toJSON: () => ({})
        } as DOMRect;
      };
      container.appendChild(item);
    }
    document.body.appendChild(container);
    manager = new VisualEffectsManager(container, {
      performanceMode: "performance",
      maxTrailPoints: 4,
      maxBlueprintElements: 2
    });

    const trail = manager.showCursorTrail(Array.from({ length: 10 }, (_, index) => ({ x: index, y: index * 2 })));
    const points = trail.querySelector("polyline")!.getAttribute("points")!.split(" ");
    expect(points).toHaveLength(4);
    expect(points[0]).toBe("0,0");
    expect(points[3]).toBe("9,18");

    const blueprint = manager.setBlueprintMode(true)!;
    expect(blueprint.element.childElementCount).toBe(2);
    expect(geometryReads).toBe(2);
    expect(manager.showGrid().element.style.backgroundSize).toBe("40px 40px");
    manager.setProgress(0.5);
    expect((manager.overlay.querySelector(".cursorbuild-effect-progress__fill") as HTMLElement).style.transition).toBe("none");
  });

  it("automatically selects the lighter effects profile on a small viewport", () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    container = document.createElement("div");
    document.body.appendChild(container);
    manager = new VisualEffectsManager(container);
    expect(manager.showGrid().element.style.backgroundSize).toBe("40px 40px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });

  it("reselects auto performance profiles across desktop and mobile viewport changes without repeated frame work", () => {
    const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    const originalRaf = Object.getOwnPropertyDescriptor(window, "requestAnimationFrame");
    const originalCancel = Object.getOwnPropertyDescriptor(window, "cancelAnimationFrame");
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
    const originalTouchPoints = Object.getOwnPropertyDescriptor(navigator, "maxTouchPoints");
    const originalHardwareConcurrency = Object.getOwnPropertyDescriptor(navigator, "hardwareConcurrency");
    const originalDeviceMemory = Object.getOwnPropertyDescriptor(navigator, "deviceMemory");
    let scheduled: FrameRequestCallback | undefined;
    let nextFrame = 0;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      scheduled = callback;
      nextFrame += 1;
      return nextFrame;
    });
    const cancelFrame = vi.fn();
    Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: requestFrame });
    Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: cancelFrame });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 8 });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    try {
      container = document.createElement("div");
      document.body.appendChild(container);
      manager = new VisualEffectsManager(container);
      expect(manager.showGrid().element.style.backgroundSize).toBe("24px 24px");

      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("resize"));
      expect(requestFrame).toHaveBeenCalledOnce();
      scheduled?.(0);
      expect(manager.showGrid().element.style.backgroundSize).toBe("40px 40px");

      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
      window.dispatchEvent(new Event("resize"));
      scheduled?.(16);
      expect(manager.showGrid().element.style.backgroundSize).toBe("24px 24px");

      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      window.dispatchEvent(new Event("resize"));
      manager.destroy();
      expect(cancelFrame).toHaveBeenCalledWith(3);
      window.dispatchEvent(new Event("resize"));
      expect(requestFrame).toHaveBeenCalledTimes(3);
    } finally {
      if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
      else Reflect.deleteProperty(window, "innerWidth");
      if (originalRaf) Object.defineProperty(window, "requestAnimationFrame", originalRaf);
      else Reflect.deleteProperty(window, "requestAnimationFrame");
      if (originalCancel) Object.defineProperty(window, "cancelAnimationFrame", originalCancel);
      else Reflect.deleteProperty(window, "cancelAnimationFrame");
      if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia);
      else Reflect.deleteProperty(window, "matchMedia");
      if (originalTouchPoints) Object.defineProperty(navigator, "maxTouchPoints", originalTouchPoints);
      else Reflect.deleteProperty(navigator, "maxTouchPoints");
      if (originalHardwareConcurrency) Object.defineProperty(navigator, "hardwareConcurrency", originalHardwareConcurrency);
      else Reflect.deleteProperty(navigator, "hardwareConcurrency");
      if (originalDeviceMemory) Object.defineProperty(navigator, "deviceMemory", originalDeviceMemory);
      else Reflect.deleteProperty(navigator, "deviceMemory");
    }
  });


  it("updates active progress transitions when the reduced-motion preference changes", () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type: string, callback: (event: MediaQueryListEvent) => void) => {
        if (query === "(prefers-reduced-motion: reduce)") listener = callback;
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true)
    })) as unknown as typeof window.matchMedia;
    try {
      container = document.createElement("div");
      document.body.appendChild(container);
      manager = new VisualEffectsManager(container, { performanceMode: "balanced" });
      manager.setProgress(0.4);
      const fill = manager.overlay.querySelector(".cursorbuild-effect-progress__fill") as HTMLElement;
      expect(fill.style.transition).toBe("width 180ms ease");
      listener?.({ matches: true } as MediaQueryListEvent);
      expect(fill.style.transition).toBe("none");
      listener?.({ matches: false } as MediaQueryListEvent);
      expect(fill.style.transition).toBe("width 180ms ease");
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("clear removes every active effect, including transient guides, measurements, and trails", () => {
    setup();
    const highlight = manager!.highlight("#card");
    const selection = manager!.showSelectionBox("#card", "Card");
    const grid = manager!.showGrid();
    const measurement = manager!.showMeasurement({ x: 0, y: 0 }, { x: 30, y: 40 }, "50px");
    const trail = manager!.showCursorTrail([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    const removeGuides = manager!.showGuides([{ axis: "vertical", position: 20 }]);
    const removeSnapGuide = manager!.showSnapGuide("horizontal", 35);
    manager!.setProgress(0.5);

    expect(manager!.overlay.childElementCount).toBeGreaterThan(0);
    manager!.clear();

    for (const element of [highlight.element, selection.element, grid.element, measurement, trail]) {
      expect(element.isConnected).toBe(false);
    }
    expect(manager!.overlay.childElementCount).toBe(0);
    // Cleanup callbacks remain safe when callers invoke them after clear().
    expect(() => { removeGuides(); removeSnapGuide(); }).not.toThrow();

    // clear() is reusable; it does not destroy the manager or its container.
    manager!.setProgress(0.25);
    expect(manager!.overlay.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("25");
  });
  it("destroy removes every effect and restores the container's original positioning", () => {
    setup();
    const originalChild = container.querySelector("#card");
    const measurement = manager!.showMeasurement({ x: 0, y: 0 }, { x: 10, y: 10 });
    const trail = manager!.showCursorTrail([{ x: 0, y: 0 }, { x: 5, y: 5 }]);
    manager!.showGuides([{ axis: "vertical", position: 10 }]);
    manager!.showSnapGuide("horizontal", 15);
    manager!.setProgress(0.75);

    expect(container.style.position).toBe("relative");
    manager!.destroy();

    expect(manager!.overlay.isConnected).toBe(false);
    expect(measurement.isConnected).toBe(false);
    expect(trail.isConnected).toBe(false);
    expect(container.style.position).toBe("");
    expect(container.querySelector("#card")).toBe(originalChild);
    expect(() => manager!.showGrid()).toThrow(/destroyed/);
  });
  it("preserves an explicitly positioned container when destroyed", () => {
    container = document.createElement("div");
    container.style.position = "absolute";
    document.body.appendChild(container);
    manager = new VisualEffectsManager(container);
    manager!.destroy();
    expect(container.style.position).toBe("absolute");
  });
});
