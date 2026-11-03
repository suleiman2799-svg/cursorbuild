// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CinematicAnimationEngine } from "./cinematic-animation-engine.js";

const gsapState = vi.hoisted(() => ({
  timelines: [] as unknown[],
  set: vi.fn()
}));
type TimelineMock = {
  fromTo: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  eventCallback: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  reverse: ReturnType<typeof vi.fn>;
};
const timelines = gsapState.timelines as TimelineMock[];

vi.mock("gsap", () => ({
  gsap: {
    set: gsapState.set,
    timeline: vi.fn(() => {
      const timeline = {
        fromTo: vi.fn().mockReturnThis(),
        to: vi.fn().mockReturnThis(),
        eventCallback: vi.fn().mockReturnThis(),
        kill: vi.fn(),
        reverse: vi.fn().mockReturnThis()
      };
      gsapState.timelines.push(timeline);
      return timeline;
    })
  }
}));

const engines: CinematicAnimationEngine[] = [];
afterEach(() => {
  engines.splice(0).forEach((engine) => engine.destroy());
  document.body.innerHTML = "";
  timelines.length = 0;
  gsapState.set.mockReset();
  vi.clearAllMocks();
});

function setup() {
  const engine = new CinematicAnimationEngine();
  engines.push(engine);
  const first = document.createElement("div");
  const second = document.createElement("div");
  first.className = "cinematic-target";
  second.className = "cinematic-target";
  document.body.append(first, second);
  return { engine, first, second };
}

describe("CinematicAnimationEngine", () => {
  it("reveals text through a directional clip mask with configurable timing", () => {
    const { engine, first } = setup();
    const timeline = engine.revealText(first, { direction: "right", duration: 1.4, ease: "power4.out", delay: 0.2 });
    expect(timeline).toBeDefined();
    const [targets, from, to] = timelines[0].fromTo.mock.calls[0];
    expect(targets).toEqual([first]);
    expect(from).toMatchObject({ clipPath: "inset(0 0 0 100%)", opacity: 0 });
    expect(to).toMatchObject({ clipPath: "inset(0 0 0 0)", opacity: 1, duration: 1.4, ease: "power4.out", delay: 0.2 });
  });

  it("reveals images with a scale settle and supports each mask direction", () => {
    const { engine, first, second } = setup();
    engine.revealImage(first, { direction: "top" });
    expect(timelines[0].fromTo.mock.calls[0][1]).toMatchObject({
      clipPath: "inset(100% 0 0 0)", scale: 1.08, opacity: 0
    });
    engine.revealMask(second, { direction: "bottom" });
    expect(timelines[1].fromTo.mock.calls[0][1].clipPath).toBe("inset(0 0 100% 0)");
  });

  it("supports section entrance and element assembly with caller overrides", () => {
    const { engine, first, second } = setup();
    engine.enterSection(first, { from: { y: 80, rotate: -4 }, to: { y: 0, rotate: 0 }, duration: 0.6 });
    engine.assemble(second, { from: { scale: 0.5, x: 20 }, to: { scale: 1, x: 0 } });
    expect(timelines[0].fromTo.mock.calls[0][1]).toMatchObject({ y: 80, opacity: 0, rotate: -4 });
    expect(timelines[1].fromTo.mock.calls[0][1]).toMatchObject({ opacity: 0, scale: 0.5, y: 24, x: 20 });
  });

  it("supports configurable horizontal and vertical parallax offsets", () => {
    const { engine, first, second } = setup();
    engine.parallax(first, { distance: 120, axis: "y", duration: 2 });
    engine.parallax(second, { distance: 36, axis: "x" });
    expect(timelines[0].fromTo.mock.calls[0][2]).toMatchObject({ y: -120, duration: 2 });
    expect(timelines[1].fromTo.mock.calls[0][2]).toMatchObject({ x: -36 });
  });

  it("supports arbitrary smooth transitions and staggered multi-element sequences", () => {
    const { engine, first, second } = setup();
    engine.transition(first, { from: { opacity: 0, x: -10 }, to: { opacity: 1, x: 0 }, duration: 0.4 });
    engine.stagger(".cinematic-target", {
      from: { opacity: 0, y: 18 }, to: { opacity: 1, y: 0 }, stagger: 0.15, delay: 0.1
    });
    expect(timelines[1].fromTo.mock.calls[0][0]).toEqual([first, second]);
    expect(timelines[1].fromTo.mock.calls[0][2]).toMatchObject({ stagger: 0.15, delay: 0.1 });
  });

  it("returns reversible GSAP timelines and tracks caller-authored timelines", () => {
    const { engine, first } = setup();
    const timeline = engine.enterSection(first);
    timeline?.reverse();
    expect(timelines[0].reverse).toHaveBeenCalledOnce();
    const custom = engine.createTimeline({ paused: true });
    expect(custom).toBe(timelines[1]);
    engine.kill(custom);
    expect(timelines[1].kill).toHaveBeenCalledOnce();
  });

  it("supports independent concurrent timelines for separate targets", () => {
    const { engine, first, second } = setup();
    engine.revealText(first);
    engine.revealImage(second);
    expect(gsapState.timelines).toHaveLength(2);
    expect(timelines[0].kill).not.toHaveBeenCalled();
    expect(timelines[1].kill).not.toHaveBeenCalled();
  });

  it("applies final states immediately when reduced motion is active", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()
    }) as unknown as typeof window.matchMedia;
    const engine = new CinematicAnimationEngine();
    engines.push(engine);
    const target = document.createElement("div");
    expect(engine.enterSection(target)).toBeUndefined();
    expect(gsapState.timelines).toHaveLength(0);
    expect(gsapState.set).toHaveBeenCalledWith([target], expect.objectContaining({ opacity: 1, y: 0 }));
    window.matchMedia = original;
  });

  it("finishes active animations when the reduced-motion preference changes", () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const remove = vi.fn();
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => { listener = callback; },
      removeEventListener: remove
    }) as unknown as typeof window.matchMedia;
    const engine = new CinematicAnimationEngine();
    engines.push(engine);
    const target = document.createElement("div");
    engine.revealText(target);
    listener?.({ matches: true } as MediaQueryListEvent);
    expect(gsapState.set).toHaveBeenCalledWith([target], expect.objectContaining({ opacity: 1 }));
    expect(timelines[0].kill).toHaveBeenCalledOnce();
    engine.destroy();
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
    window.matchMedia = original;
  });

  it("kills all owned timelines and rejects new work after destruction", () => {
    const { engine, first, second } = setup();
    engine.revealText(first);
    engine.revealImage(second);
    engine.destroy();
    expect(timelines.every((timeline) => timeline.kill.mock.calls.length === 1)).toBe(true);
    expect(() => engine.enterSection(first)).toThrow(/destroyed/);
  });

  it("validates selectors, target collections, animation values, and timing", () => {
    const { engine, first } = setup();
    expect(() => engine.revealText("[")).toThrow(/valid CSS selector/);
    expect(() => engine.revealText("#missing")).toThrow(/did not match/);
    expect(() => engine.revealText([])).toThrow(/non-empty array/);
    expect(() => engine.transition(first, { from: {}, to: {}, duration: -1 })).toThrow(RangeError);
    expect(() => engine.transition(first, { from: {}, to: {}, delay: Number.NaN })).toThrow(RangeError);
    expect(() => engine.transition(first, { from: {}, to: {}, ease: "" })).toThrow(TypeError);
    expect(() => engine.parallax(first, { distance: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });
});
