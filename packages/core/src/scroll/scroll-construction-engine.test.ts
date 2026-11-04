import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const timelines: Array<{
    progress: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    to: ReturnType<typeof vi.fn>;
  }> = [];
  const createTimeline = vi.fn(() => {
    const timeline = {
      progress: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      kill: vi.fn(),
      to: vi.fn()
    };
    timelines.push(timeline);
    return timeline;
  });
  const triggers: Array<{ progress: number; kill: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> }> = [];
  const create = vi.fn((_vars: unknown) => {
    const trigger = { progress: 0, kill: vi.fn(), refresh: vi.fn() };
    triggers.push(trigger);
    return trigger;
  });
  return { timelines, createTimeline, triggers, create, registerPlugin: vi.fn() };
});

vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: mocks.registerPlugin,
    timeline: vi.fn(() => mocks.createTimeline())
  }
}));
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { create: mocks.create, refresh: vi.fn() }
}));

import { ScrollConstructionEngine } from "./scroll-construction-engine.js";

describe("ScrollConstructionEngine", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  afterEach(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.triggers.length = 0;
    mocks.timelines.length = 0;
    mocks.create.mockImplementation((_vars: unknown) => {
      const trigger = { progress: 0, kill: vi.fn(), refresh: vi.fn() };
      mocks.triggers.push(trigger);
      return trigger;
    });
  });

  it("builds a paused timeline and seeks it from normalized scroll progress", () => {
    const engine = new ScrollConstructionEngine();
    const onProgress = vi.fn();
    const scene = engine.createScene("hero", { trigger: "#hero", onProgress }, (timeline) => {
      timeline.to({}, { opacity: 1, duration: 1 });
    });

    expect(mocks.registerPlugin).toHaveBeenCalled();
    expect(scene.progress).toBe(0);
    expect(mocks.timelines[0]!.progress).toHaveBeenCalledWith(0);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      trigger: "#hero", start: "top 80%", end: "bottom 20%"
    }));

    const vars = mocks.create.mock.calls[0]?.[0] as unknown as { onUpdate: (self: { progress: number }) => void };
    vars.onUpdate({ progress: 0.65 });
    expect(scene.progress).toBe(0.65);
    expect(mocks.timelines[0]!.progress).toHaveBeenLastCalledWith(0.65);
    expect(onProgress).toHaveBeenCalledWith(0.65);
  });

  it("supports forward-only scenes without moving backwards", () => {
    const engine = new ScrollConstructionEngine();
    engine.createScene("forward-only", { trigger: "#forward-only", reverse: false }, () => {});
    const vars = mocks.create.mock.calls[0]?.[0] as unknown as { onUpdate: (self: { progress: number }) => void };
    vars.onUpdate({ progress: 0.7 });
    vars.onUpdate({ progress: 0.2 });
    expect(mocks.timelines[0]!.progress).toHaveBeenLastCalledWith(0.7);
  });

  it("completes scenes for reduced motion and removes the preference listener", () => {
    let motionListener: ((event: MediaQueryListEvent) => void) | undefined;
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => { motionListener = listener; }),
      removeEventListener: vi.fn()
    };
    vi.stubGlobal("window", { matchMedia: vi.fn(() => mediaQuery) });
    const engine = new ScrollConstructionEngine();
    const scene = engine.createScene("reduced", { trigger: "#reduced" }, () => {});
    expect(scene.progress).toBe(1);
    const vars = mocks.create.mock.calls[0]?.[0] as unknown as { onUpdate: (self: { progress: number }) => void };
    vars.onUpdate({ progress: 0.2 });
    expect(scene.progress).toBe(1);
    scene.destroy();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", motionListener);
  });

  it("pauses scroll updates and resumes at the current trigger position", () => {
    const engine = new ScrollConstructionEngine();
    const scene = engine.createScene("gallery", { trigger: "#gallery" }, () => {});
    const vars = mocks.create.mock.calls[0]?.[0] as unknown as { onUpdate: (self: { progress: number }) => void };
    vars.onUpdate({ progress: 0.4 });
    scene.pause();
    expect(scene.isPaused).toBe(true);
    vars.onUpdate({ progress: 0.9 });
    expect(scene.progress).toBe(0.4);
    mocks.triggers[0]!.progress = 0.8;
    scene.resume();
    expect(scene.isPaused).toBe(false);
    expect(scene.progress).toBe(0.8);
    expect(mocks.timelines[0]!.resume).not.toHaveBeenCalled();
  });

  it("keeps multiple scenes on independent timelines and progress streams", () => {
    const engine = new ScrollConstructionEngine();
    const firstProgress = vi.fn();
    const secondProgress = vi.fn();
    const first = engine.createScene("first", { trigger: "#first", onProgress: firstProgress }, () => {});
    const second = engine.createScene("second", { trigger: "#second", onProgress: secondProgress }, () => {});
    expect(mocks.timelines).toHaveLength(2);

    const firstVars = mocks.create.mock.calls[0]?.[0] as unknown as { onUpdate: (self: { progress: number }) => void };
    const secondVars = mocks.create.mock.calls[1]?.[0] as unknown as { onUpdate: (self: { progress: number }) => void };
    firstVars.onUpdate({ progress: 0.25 });
    secondVars.onUpdate({ progress: 0.75 });

    expect(first.progress).toBe(0.25);
    expect(second.progress).toBe(0.75);
    expect(mocks.timelines[0]!.progress).toHaveBeenLastCalledWith(0.25);
    expect(mocks.timelines[1]!.progress).toHaveBeenLastCalledWith(0.75);
    expect(firstProgress).toHaveBeenCalledWith(0.25);
    expect(secondProgress).toHaveBeenCalledWith(0.75);

    engine.destroyScene("first");
    expect(mocks.timelines[0]!.kill).toHaveBeenCalledOnce();
    expect(mocks.timelines[1]!.kill).not.toHaveBeenCalled();
    expect(mocks.triggers[0]!.kill).toHaveBeenCalledOnce();
    expect(mocks.triggers[1]!.kill).not.toHaveBeenCalled();

    secondVars.onUpdate({ progress: 0.9 });
    expect(second.progress).toBe(0.9);
    expect(mocks.timelines[1]!.progress).toHaveBeenLastCalledWith(0.9);
    expect(engine.getScene("second")).toBe(second);
  });

  it("destroys individual scenes and releases their trigger and timeline", () => {
    const engine = new ScrollConstructionEngine();
    const scene = engine.createScene("intro", { trigger: "#intro" }, () => {});
    engine.destroyScene("intro");
    expect(engine.getScene("intro")).toBeUndefined();
    expect(mocks.triggers[0]!.kill).toHaveBeenCalled();
    expect(mocks.timelines[0]!.kill).toHaveBeenCalled();
    scene.destroy();
  });

  it("rejects invalid and duplicate scene identifiers and cleans up a failed builder", () => {
    const engine = new ScrollConstructionEngine();
    expect(() => engine.createScene(" ", { trigger: "#hero" }, () => {})).toThrow(/id is required/);
    expect(() => engine.createScene("hero", { trigger: " " }, () => {})).toThrow(/trigger/);
    engine.createScene("hero", { trigger: "#hero" }, () => {});
    expect(() => engine.createScene("hero", { trigger: "#other" }, () => {})).toThrow(/already exists/);
    expect(() => engine.createScene("broken", { trigger: "#broken" }, () => { throw new Error("builder failed"); })).toThrow("builder failed");
    expect(mocks.timelines[0]!.kill).toHaveBeenCalled();
  });

  it("destroys every scene and rejects new scenes after engine destruction", () => {
    const engine = new ScrollConstructionEngine();
    engine.createScene("one", { trigger: "#one" }, () => {});
    engine.createScene("two", { trigger: "#two" }, () => {});
    engine.destroy();
    expect(mocks.triggers.every((trigger) => trigger.kill.mock.calls.length === 1)).toBe(true);
    expect(() => engine.createScene("three", { trigger: "#three" }, () => {})).toThrow(/destroyed/);
  });
});
