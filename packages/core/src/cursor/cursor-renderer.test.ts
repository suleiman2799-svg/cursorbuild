// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CursorBuildEngine } from "./engine.js";
import { CinematicAnimationEngine } from "./animation/cinematic-animation-engine.js";
import { MultiCursorCoordinationEngine } from "./coordination/multi-cursor-coordination-engine.js";
import { MultiCursorCoordinator } from "./coordination/multi-cursor-coordinator.js";
import { ScrollConstructionEngine } from "./scroll/scroll-construction-engine.js";

describe("CursorBuildEngine feature integration", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true)
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("constructs the reconciled animation, scroll, and coordination subsystems together", () => {
    const engine = new CursorBuildEngine();

    expect(engine.cinematic).toBeInstanceOf(CinematicAnimationEngine);
    expect(engine.construction).toBeInstanceOf(ScrollConstructionEngine);
    expect(engine.coordination).toBeInstanceOf(MultiCursorCoordinationEngine);
    expect(engine.coordinator).toBeInstanceOf(MultiCursorCoordinator);

    expect(() => engine.destroy()).not.toThrow();
    expect(() => engine.destroy()).not.toThrow();
  });

  it("disposes integrated subsystems and prevents new work after engine destruction", async () => {
    const engine = new CursorBuildEngine();
    engine.destroy();

    expect(() => engine.cinematic.createTimeline()).toThrow(/destroyed/);
    expect(() => engine.construction.createScene("after-destroy", { trigger: "#hero" }, () => {})).toThrow(/destroyed/);
    expect(() => engine.coordination.createTimeline("maya", [{ id: "move", run: () => {} }])).toThrow(/destroyed/);
    await expect(engine.coordinator.runGroup("after-destroy", [
      { id: "move", cursorId: "maya", run: () => {} }
    ])).rejects.toThrow(/destroyed/);
  });
});


describe("CursorRenderer responsive behaviour", () => {
  it("limits visible cursor nodes on mobile and restores them on desktop resize", async () => {
    const { manager, host, renderer } = setup([]);
    for (let index = 0; index < 4; index++) manager.add({ id: String(index), name: "Designer " + index, color: "#abc" });
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const nodes = Array.from(host.querySelectorAll<HTMLElement>(".cursorbuild-cursor"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(2);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    window.dispatchEvent(new Event("resize"));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(4);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    renderer.destroy();
  });

  it("applies a separate visible-cursor cap for coarse pointers and reacts to pointer changes", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    let pointerChanged: ((event: MediaQueryListEvent) => void) | undefined;
    const pointerMedia = {
      matches: true,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => { pointerChanged = listener; }),
      removeEventListener: vi.fn()
    };
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => query === "(pointer: coarse)"
      ? pointerMedia
      : { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;

    const { manager, host, renderer } = setup([]);
    for (let index = 0; index < 4; index++) manager.add({ id: String(index), name: "Touch " + index, color: "#abc" });
    const nodes = Array.from(host.querySelectorAll<HTMLElement>(".cursorbuild-cursor"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(2);

    pointerMedia.matches = false;
    pointerChanged?.({ matches: false } as MediaQueryListEvent);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(4);
    renderer.destroy();
    expect(pointerMedia.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });

  it("coalesces resize events into one animation-frame visibility update and cancels pending work on destroy", () => {
    const originalRequest = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;
    let frameCallback: FrameRequestCallback | undefined;
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 99;
    });
    window.cancelAnimationFrame = vi.fn();

    const { renderer } = setup(["a", "b", "c"]);
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();

    frameCallback?.(0);
    window.dispatchEvent(new Event("orientationchange"));
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
    renderer.destroy();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(99);

    window.requestAnimationFrame = originalRequest;
    window.cancelAnimationFrame = originalCancel;
  });

  it("recalculates visibility after orientation changes and validates touch limits", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    const { manager, host, renderer } = setup([]);
    for (let index = 0; index < 4; index++) manager.add({ id: String(index), name: "Designer " + index, color: "#abc" });
    const nodes = Array.from(host.querySelectorAll<HTMLElement>(".cursorbuild-cursor"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(4);

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
    window.dispatchEvent(new Event("orientationchange"));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(2);
    renderer.destroy();
    expect(() => setup(["invalid"], { touchMaxVisible: -1 })).toThrow(RangeError);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });
});
