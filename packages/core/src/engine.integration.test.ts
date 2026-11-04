// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CursorBuildEngine } from "./engine.js";
import { CinematicAnimationEngine } from "./animation/cinematic-animation-engine.js";
import { MultiCursorCoordinationEngine } from "./coordination/multi-cursor-coordination-engine.js";
import { MultiCursorCoordinator } from "./coordination/multi-cursor-coordinator.js";
import { ScrollConstructionEngine } from "./scroll/scroll-construction-engine.js";

describe("CursorBuildEngine feature integration", () => {
  const originalMatchMedia = window.matchMedia;
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
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
    window.scrollTo = originalScrollTo;
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


  it("resizes a real target while responsive visibility adapts to viewport changes", async () => {
    const engine = new CursorBuildEngine();
    const host = document.createElement("div");
    const target = document.createElement("article");
    target.id = "resizable";
    target.style.width = "100px";
    target.style.height = "50px";
    host.appendChild(target);
    document.body.appendChild(host);
    const identities = ["one", "two", "three", "four"];
    identities.forEach((id) => engine.cursors.add({ id, name: id, color: "#8b5cf6" }));
    const renderer = engine.mountCursors(host, { mobileMaxVisible: 2, touchMaxVisible: 2 });
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    expect([...host.querySelectorAll<HTMLElement>(".cursorbuild-cursor")].filter((node) => node.style.display === "flex")).toHaveLength(2);
    renderer.resize("four", { target, to: { width: 180, height: 90 }, duration: 0 });
    expect(target.style.width).toBe("180px");
    expect(target.style.height).toBe("90px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    window.dispatchEvent(new Event("orientationchange"));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    expect([...host.querySelectorAll<HTMLElement>(".cursorbuild-cursor")].filter((node) => node.style.display === "flex")).toHaveLength(4);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    engine.destroy();
  });

  it("keeps a resize operation alive across viewport changes and completes its cleanup", async () => {
    const engine = new CursorBuildEngine();
    const host = document.createElement("div");
    const target = document.createElement("article");
    target.style.width = "100px";
    target.style.height = "60px";
    host.appendChild(target);
    document.body.appendChild(host);
    engine.cursors.add({ id: "resize-cursor", name: "Resize", color: "#8b5cf6" });
    const renderer = engine.mountCursors(host);
    const timeline = renderer.resize("resize-cursor", { target, to: { width: 220, height: 110 }, duration: 0.08 });
    expect(renderer.isResizing("resize-cursor")).toBe(true);
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
    await timeline?.then(() => undefined);
    expect(renderer.isResizing("resize-cursor")).toBe(false);
    expect(target.style.width).toBe("220px");
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
    engine.destroy();
  });

  it("lets coordinated actions invoke cursor resizing and cinematic timelines", async () => {
    const engine = new CursorBuildEngine();
    const host = document.createElement("div");
    const target = document.createElement("article");
    target.style.width = "80px";
    target.style.height = "40px";
    const cinematicTarget = document.createElement("section");
    host.append(target, cinematicTarget);
    document.body.appendChild(host);
    engine.cursors.add({ id: "designer", name: "Designer", color: "#8b5cf6" });
    const renderer = engine.mountCursors(host);
    const group = engine.coordinator.runGroup("combined-actions", [
      { id: "resize-card", cursorId: "designer", run: () => renderer.resize("designer", { target, to: { width: 160, height: 80 }, duration: 0.03 }) },
      { id: "animate-section", cursorId: "designer", run: () => engine.cinematic.enterSection(cinematicTarget, { duration: 0.03 }) }
    ], { mode: "parallel" });
    await group;
    expect(target.style.width).toBe("160px");
    expect(target.style.height).toBe("80px");
    expect(cinematicTarget.style.opacity).toBe("1");
    engine.destroy();
  });

  it("drives a scroll-construction scene through its pause, resume, refresh, and destroy lifecycle", () => {
    const engine = new CursorBuildEngine();
    const trigger = document.createElement("section");
    const target = document.createElement("div");
    trigger.appendChild(target);
    document.body.appendChild(trigger);
    const progress: number[] = [];
    const scene = engine.construction.createScene("hero-build", { trigger, onProgress: (value) => progress.push(value) }, (timeline) => {
      timeline.to(target, { opacity: 0.25, duration: 1 });
    });
    expect(scene.animation).toBeDefined();
    scene.pause();
    expect(scene.isPaused).toBe(true);
    scene.resume();
    expect(scene.isPaused).toBe(false);
    scene.refresh();
    scene.destroy();
    scene.destroy();
    expect(engine.construction.getScene("hero-build")).toBe(scene);
    expect(progress.every((value) => value >= 0 && value <= 1)).toBe(true);
    engine.destroy();
  });

  it("supports independent action cancellation and whole-group cancellation", async () => {
    const engine = new CursorBuildEngine();
    const independent = engine.coordination.createTimeline("cursor-a", [
      { id: "cancel-me", run: ({ wait }) => wait(1000) },
      { id: "finish-me", run: async () => {} }
    ], { mode: "parallel" });
    const independentGroup = engine.coordination.createGroup("independent-cancel", [independent]);
    const independentRun = independentGroup.run();
    await Promise.resolve();
    independentGroup.cancelAction("cancel-me");
    await independentRun;
    expect(independentGroup.getActionStatus("cancel-me")).toBe("cancelled");
    expect(independentGroup.getActionStatus("finish-me")).toBe("completed");

    const grouped = engine.coordination.createTimeline("cursor-b", [
      { id: "group-wait", run: ({ wait }) => wait(1000) }
    ]);
    const group = engine.coordination.createGroup("whole-group-cancel", [grouped]);
    const groupRun = group.run();
    await Promise.resolve();
    engine.coordination.cancelGroup("whole-group-cancel");
    await groupRun;
    expect(group.status).toBe("cancelled");
    engine.destroy();
  });

  it("adapts visual-effects cost to viewport changes and bounds trail and blueprint work", async () => {
    const originalWidth = window.innerWidth;
    const originalHardwareConcurrency = Object.getOwnPropertyDescriptor(navigator, "hardwareConcurrency");
    const originalDeviceMemory = Object.getOwnPropertyDescriptor(navigator, "deviceMemory");
    const originalTouchPoints = Object.getOwnPropertyDescriptor(navigator, "maxTouchPoints");
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    const host = document.createElement("div");
    for (let index = 0; index < 100; index += 1) {
      const item = document.createElement("div");
      item.getBoundingClientRect = () => ({ left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      host.appendChild(item);
    }
    document.body.appendChild(host);
    const engine = new CursorBuildEngine();
    const effects = engine.mountVisualEffects(host);
    expect(effects.showGrid().element.style.backgroundSize).toBe("24px 24px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    expect(effects.showGrid().element.style.backgroundSize).toBe("40px 40px");
    const trail = effects.showCursorTrail(Array.from({ length: 120 }, (_, index) => ({ x: index, y: index })));
    expect(trail.querySelector("polyline")!.getAttribute("points")!.split(" ")).toHaveLength(64);
    expect(effects.setBlueprintMode(true)!.element.childElementCount).toBe(80);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    if (originalHardwareConcurrency) Object.defineProperty(navigator, "hardwareConcurrency", originalHardwareConcurrency);
    else Reflect.deleteProperty(navigator, "hardwareConcurrency");
    if (originalDeviceMemory) Object.defineProperty(navigator, "deviceMemory", originalDeviceMemory);
    else Reflect.deleteProperty(navigator, "deviceMemory");
    if (originalTouchPoints) Object.defineProperty(navigator, "maxTouchPoints", originalTouchPoints);
    else Reflect.deleteProperty(navigator, "maxTouchPoints");
    engine.destroy();
  });

  it("runs cursor, cinematic, scroll, coordination, and effects subsystems concurrently", async () => {
    const engine = new CursorBuildEngine();
    const host = document.createElement("div");
    const card = document.createElement("article");
    card.style.width = "50px";
    card.style.height = "30px";
    const section = document.createElement("section");
    host.append(card, section);
    document.body.appendChild(host);
    engine.cursors.add({ id: "multi", name: "Multi", color: "#8b5cf6" });
    const renderer = engine.mountCursors(host);
    const effects = engine.mountVisualEffects(host);
    const scene = engine.construction.createScene("concurrent-scene", { trigger: section }, (timeline) => {
      timeline.to(section, { opacity: 0.5, duration: 1 });
    });
    effects.highlight(card);
    const resize = renderer.resize("multi", { target: card, to: { width: 100, height: 60 }, duration: 0.03 });
    const cinematic = engine.cinematic.enterSection(section, { duration: 0.03 });
    const coordinated = engine.coordination.createGroup("concurrent-group", [
      engine.coordination.createTimeline("multi", [{ id: "concurrent-action", run: async ({ wait }) => wait(5) }])
    ]);
    const coordinationRun = coordinated.run();
    await Promise.all([
      resize ? resize.then(() => undefined) : Promise.resolve(),
      cinematic ? cinematic.then(() => undefined) : Promise.resolve(),
      coordinationRun
    ]);
    expect(card.style.width).toBe("100px");
    expect(scene).toBe(engine.construction.getScene("concurrent-scene"));
    expect(effects.overlay.childElementCount).toBeGreaterThan(0);
    engine.destroy();
  });

  it("cleans up every mounted subsystem and rejects all new work after destruction", async () => {
    const engine = new CursorBuildEngine();
    const host = document.createElement("div");
    const target = document.createElement("div");
    host.appendChild(target);
    document.body.appendChild(host);
    engine.cursors.add({ id: "cleanup", name: "Cleanup", color: "#8b5cf6" });
    const renderer = engine.mountCursors(host);
    const effects = engine.mountVisualEffects(host);
    const scene = engine.construction.createScene("cleanup-scene", { trigger: target }, (timeline) => {
      timeline.to(target, { opacity: 0, duration: 1 });
    });
    const group = engine.coordination.createGroup("cleanup-group", [
      engine.coordination.createTimeline("cleanup", [{ id: "cleanup-wait", run: ({ wait }) => wait(1000) }])
    ]);
    const groupRun = group.run();
    await Promise.resolve();
    engine.destroy();
    await groupRun;
    expect(host.querySelector(".cursorbuild-overlay")).toBeNull();
    expect(host.querySelector(".cursorbuild-effects")).toBeNull();
    expect(scene.animation).toBeDefined();
    expect(group.status).toBe("cancelled");
    expect(() => engine.mountCursors(host)).toThrow(/destroyed/);
    expect(() => engine.mountVisualEffects(host)).toThrow(/destroyed/);
    expect(() => engine.cinematic.createTimeline()).toThrow(/destroyed/);
    expect(() => engine.construction.createScene("late", { trigger: target }, () => {})).toThrow(/destroyed/);
    expect(() => engine.coordination.createTimeline("late", [{ id: "late", run: () => {} }])).toThrow(/destroyed/);
    await expect(engine.coordinator.runGroup("late", [{ id: "late", cursorId: "late", run: () => {} }])).rejects.toThrow(/destroyed/);
    renderer.destroy();
    effects.destroy();
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
