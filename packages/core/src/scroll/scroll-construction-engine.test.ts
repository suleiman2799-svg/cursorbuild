// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollConstructionEngine } from "./scroll-construction-engine.js";

const state = vi.hoisted(() => ({
  timelines: [] as unknown[],
  triggers: [] as unknown[],
  create: vi.fn(),
  registerPlugin: vi.fn()
}));
type TimelineMock = {
  to: ReturnType<typeof vi.fn>;
  fromTo: ReturnType<typeof vi.fn>;
  progress: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
};
type TriggerMock = {
  enable: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
};
const timelines = state.timelines as TimelineMock[];
const triggers = state.triggers as TriggerMock[];

vi.mock("gsap", () => ({
  gsap: {
    timeline: vi.fn(() => {
      const timeline = {
        to: vi.fn().mockReturnThis(),
        fromTo: vi.fn().mockReturnThis(),
        progress: vi.fn(),
        pause: vi.fn().mockReturnThis(),
        resume: vi.fn().mockReturnThis(),
        kill: vi.fn()
      };
      let progressValue = 0.35;
      timeline.progress.mockImplementation((value?: number) => {
        if (value === undefined) return progressValue;
        progressValue = value;
        return timeline;
      });
      timelines.push(timeline);
      return timeline;
    }),
    registerPlugin: state.registerPlugin
  }
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    create: state.create
  }
}));

const engines: ScrollConstructionEngine[] = [];
afterEach(() => {
  engines.splice(0).forEach((engine) => engine.destroy());
  document.body.innerHTML = "";
  timelines.length = 0;
  triggers.length = 0;
  state.create.mockReset();
  state.registerPlugin.mockReset();
  vi.clearAllMocks();
});

function setup() {
  const engine = new ScrollConstructionEngine();
  engines.push(engine);
  const section = document.createElement("section");
  const heading = document.createElement("h1");
  const image = document.createElement("div");
  section.id = "scene";
  heading.id = "heading";
  image.id = "image";
  section.append(heading, image);
  document.body.append(section);
  const trigger = {
    enable: vi.fn(),
    disable: vi.fn(),
    kill: vi.fn()
  };
  state.create.mockImplementation(() => {
    if (triggers.length === 0) {
      triggers.push(trigger);
      return trigger;
    }
    const next = { enable: vi.fn(), disable: vi.fn(), kill: vi.fn() };
    triggers.push(next);
    return next;
  });
  return { engine, section, heading, image, trigger };
}

describe("ScrollConstructionEngine", () => {
  it("creates a selector-based scene with configurable scroll boundaries and scrub", () => {
    const { engine, section, heading } = setup();
    const scene = engine.createScene("hero", {
      trigger: "#scene",
      start: "top 75%",
      end: "bottom 15%",
      scrub: 0.8,
      steps: [{ id: "heading", target: "#heading", from: { opacity: 0, y: 28 }, to: { opacity: 1, y: 0 }, duration: 1.2 }]
    });
    expect(scene.trigger).toBe(triggers[0]);
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      trigger: section, animation: timelines[0], start: "top 75%", end: "bottom 15%", scrub: 0.8
    }));
    expect(timelines[0].fromTo).toHaveBeenCalledWith([heading], { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.2 });
  });

  it("supports sequential steps and simultaneous steps through GSAP timeline positions", () => {
    const { engine } = setup();
    engine.createScene("layout", {
      trigger: "#scene",
      steps: [
        { id: "heading", target: "#heading", to: { opacity: 1 }, duration: 0.4 },
        { id: "image", target: "#image", to: { scale: 1 }, duration: 0.6, position: "<" },
        { id: "section", target: "#scene", to: { opacity: 1 }, duration: 0.5 }
      ]
    });
    expect(timelines[0].to.mock.calls[0]).toHaveLength(2);
    expect(timelines[0].to.mock.calls[1][2]).toBe("<");
    expect(timelines[0].to.mock.calls[2]).toHaveLength(2);
  });

  it("supports pause, resume, progress inspection, and per-scene cleanup", () => {
    const { engine, trigger } = setup();
    const scene = engine.createScene("hero", { trigger: "#scene", steps: [{ id: "heading", target: "#heading", to: { opacity: 1 } }] });
    expect(scene.progress()).toBe(0.35);
    scene.pause();
    expect(trigger.disable).toHaveBeenCalledOnce();
    expect(timelines[0].pause).toHaveBeenCalledOnce();
    scene.resume();
    expect(trigger.enable).toHaveBeenCalledOnce();
    expect(timelines[0].resume).toHaveBeenCalledOnce();
    scene.kill();
    expect(trigger.kill).toHaveBeenCalledOnce();
    expect(timelines[0].kill).toHaveBeenCalledOnce();
    expect(engine.getScene("hero")).toBeUndefined();
  });

  it("reports scroll progress and allows multiple scenes to run independently", () => {
    const { engine } = setup();
    const progress = vi.fn();
    engine.createScene("one", { trigger: "#scene", onProgress: progress, steps: [{ id: "one", target: "#heading", to: { opacity: 1 } }] });
    engine.createScene("two", { trigger: "#scene", steps: [{ id: "two", target: "#image", to: { scale: 1 } }] });
    expect(timelines).toHaveLength(2);
    const vars = state.create.mock.calls[0][0] as { onUpdate: (self: { progress: number }) => void };
    vars.onUpdate({ progress: 0.62 });
    expect(progress).toHaveBeenCalledWith(0.62);
    engine.killScene("one");
    expect(triggers[0].kill).toHaveBeenCalledOnce();
    expect(triggers[1].kill).not.toHaveBeenCalled();
  });

  it("uses reverse toggle actions when scrub is disabled unless reverse is explicitly disabled", () => {
    const { engine } = setup();
    engine.createScene("reversible", { trigger: "#scene", scrub: false, steps: [{ id: "a", target: "#heading", to: { opacity: 1 } }] });
    engine.createScene("forward-only", { trigger: "#scene", scrub: false, reverseOnScrollUp: false, steps: [{ id: "b", target: "#image", to: { opacity: 1 } }] });
    expect(state.create.mock.calls[0][0].toggleActions).toBe("play reverse play reverse");
    expect(state.create.mock.calls[1][0].toggleActions).toBe("play none none none");
  });

  it("completes scenes immediately when reduced motion is already active", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    const engine = new ScrollConstructionEngine();
    engines.push(engine);
    const section = document.createElement("section");
    const target = document.createElement("div");
    section.append(target);
    document.body.append(section);
    const progress = vi.fn();
    const scene = engine.createScene("reduced", { trigger: section, onProgress: progress, steps: [{ id: "final", target, to: { opacity: 1 } }] });
    expect(scene.trigger).toBeUndefined();
    expect(scene.progress()).toBe(1);
    expect(timelines[0].progress).toHaveBeenCalledWith(1);
    expect(timelines[0].pause).toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledWith(1);
    window.matchMedia = original;
  });

  it("settles active scenes when the reduced-motion preference changes", () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => { listener = callback; },
      removeEventListener: vi.fn()
    }) as unknown as typeof window.matchMedia;
    const { engine, trigger } = setup();
    const scene = engine.createScene("active", { trigger: "#scene", steps: [{ id: "final", target: "#heading", to: { opacity: 1 } }] });
    listener?.({ matches: true } as MediaQueryListEvent);
    expect(timelines[0].progress).toHaveBeenCalledWith(1);
    expect(trigger.kill).toHaveBeenCalledOnce();
    expect(scene.trigger).toBeUndefined();
    window.matchMedia = original;
  });

  it("validates identifiers, duplicate steps, selectors, and timing", () => {
    const { engine } = setup();
    const valid = [{ id: "a", target: "#heading", to: { opacity: 1 } }];
    expect(() => engine.createScene("", { trigger: "#scene", steps: valid })).toThrow(/id is required/);
    expect(() => engine.createScene("bad-trigger", { trigger: "[", steps: valid })).toThrow(/valid CSS selector/);
    expect(() => engine.createScene("missing", { trigger: "#missing", steps: valid })).toThrow(/did not match/);
    expect(() => engine.createScene("empty", { trigger: "#scene", steps: [] })).toThrow(/at least one step/);
    expect(() => engine.createScene("bad-scrub", { trigger: "#scene", scrub: -1, steps: valid })).toThrow(RangeError);
    expect(() => engine.createScene("bad-duration", { trigger: "#scene", steps: [{ id: "a", target: "#heading", to: {}, duration: -1 }] })).toThrow(RangeError);
    expect(() => engine.createScene("duplicate", { trigger: "#scene", steps: [...valid, ...valid] })).toThrow(/Duplicate construction step/);
  });

  it("rejects duplicate scene ids and cleans every scene on destroy", () => {
    const { engine, trigger } = setup();
    engine.createScene("hero", { trigger: "#scene", steps: [{ id: "a", target: "#heading", to: { opacity: 1 } }] });
    expect(() => engine.createScene("hero", { trigger: "#scene", steps: [{ id: "b", target: "#image", to: { opacity: 1 } }] })).toThrow(/already exists/);
    engine.destroy();
    expect(trigger.kill).toHaveBeenCalledOnce();
    expect(timelines[0].kill).toHaveBeenCalledOnce();
    expect(() => engine.createScene("after-destroy", { trigger: "#scene", steps: [{ id: "c", target: "#heading", to: {} }] })).toThrow(/destroyed/);
  });
});
