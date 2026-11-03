import { afterEach, describe, expect, it, vi } from "vitest";
import { NaturalCursorMovementEngine, getNaturalControlPoints } from "./natural-cursor-movement.js";
import type { CursorPoint } from "./cursor-renderer.js";

const gsapState = vi.hoisted(() => ({ timelines: [] as Array<{
  steps: Array<{ target: Record<string, number>; vars: Record<string, unknown> }>;
  callbacks: Record<string, (() => void) | undefined>;
  to: ReturnType<typeof vi.fn>;
  eventCallback: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
}> }));
vi.mock("gsap", () => ({
  gsap: {
    timeline: vi.fn(() => {
      const timeline = {
        steps: [] as Array<{ target: Record<string, number>; vars: Record<string, unknown> }>,
        callbacks: {} as Record<string, (() => void) | undefined>,
        to: vi.fn(function (this: typeof timeline, target: Record<string, number>, vars: Record<string, unknown>) {
          this.steps.push({ target, vars }); return this;
        }),
        eventCallback: vi.fn(function (this: typeof timeline, name: string, callback: () => void) {
          this.callbacks[name] = callback; return this;
        }),
        kill: vi.fn()
      };
      gsapState.timelines.push(timeline);
      return timeline;
    })
  }
}));

function createAdapter(reducedMotion = false) {
  const positions = new Map<string, CursorPoint>([["one", { x: 0, y: 0 }], ["two", { x: 20, y: 10 }]]);
  return {
    positions,
    adapter: {
      hasCursor: (id: string) => positions.has(id),
      getPosition: (id: string) => positions.get(id),
      setPosition: (id: string, point: CursorPoint) => positions.set(id, { ...point }),
      isReducedMotion: () => reducedMotion
    }
  };
}

afterEach(() => { gsapState.timelines.length = 0; vi.clearAllMocks(); });

describe("NaturalCursorMovementEngine", () => {
  it("builds a curved cubic path rather than a straight-line path", () => {
    const [control1, control2] = getNaturalControlPoints({ x: 0, y: 0 }, { x: 120, y: 0 }, 0.2, "one");
    expect(control1.y).not.toBe(0);
    expect(control2.y).not.toBe(0);
    expect(control1.x).toBeCloseTo(40);
    expect(control2.x).toBeCloseTo(80);
  });

  it("animates independent cursors on separate simultaneous timelines", () => {
    const { adapter } = createAdapter();
    const engine = new NaturalCursorMovementEngine(adapter);
    const first = engine.moveTo("one", { x: 100, y: 80 });
    const second = engine.moveTo("two", { x: 200, y: 90 });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
    expect(gsapState.timelines).toHaveLength(2);
    engine.cancel("one");
    expect(gsapState.timelines[0].kill).toHaveBeenCalledOnce();
    expect(gsapState.timelines[1].kill).not.toHaveBeenCalled();
    engine.destroy();
  });

  it("updates positions along the curved path as GSAP progress advances", () => {
    const { adapter, positions } = createAdapter();
    const engine = new NaturalCursorMovementEngine(adapter, { curvature: 0.25 });
    const timeline = engine.moveTo("one", { x: 120, y: 0 })!;
    const segment = gsapState.timelines[0].steps[0];
    segment.target.value = 0.5;
    (segment.vars.onUpdate as () => void)();
    expect(positions.get("one")!.x).toBeCloseTo(60);
    expect(Math.abs(positions.get("one")!.y)).toBeGreaterThan(0);
    (segment.vars.onComplete as () => void)();
    expect(positions.get("one")).toEqual({ x: 120, y: 0 });
    timeline.eventCallback("onComplete");
    engine.destroy();
  });

  it("adds configurable pauses between sequence destinations", () => {
    const { adapter } = createAdapter();
    const engine = new NaturalCursorMovementEngine(adapter);
    engine.playSequence("one", [
      { to: { x: 30, y: 20 } },
      { to: { x: 60, y: 40 }, pauseAfter: 0.4 },
      { to: { x: 90, y: 60 } }
    ], { duration: 0.8, ease: "power2.inOut", pauseBetween: 0.2 });
    const steps = gsapState.timelines[0].steps;
    expect(steps).toHaveLength(3);
    expect(steps[0].vars.duration).toBe(0.8);
    expect(steps[0].vars.ease).toBe("power2.inOut");
    expect(steps[1].vars.duration).toBe(0.4);
    expect(steps[1].target).toEqual({});
    engine.destroy();
  });

  it("snaps to the final destination without animation when reduced motion is active", () => {
    const { adapter, positions } = createAdapter(true);
    const engine = new NaturalCursorMovementEngine(adapter);
    const timeline = engine.playSequence("one", [
      { to: { x: 40, y: 50 } },
      { to: { x: 80, y: 100 } }
    ], { pauseBetween: 1 });
    expect(timeline).toBeUndefined();
    expect(gsapState.timelines).toHaveLength(0);
    expect(positions.get("one")).toEqual({ x: 80, y: 100 });
  });

  it("validates movement targets, durations, curvature, and pause ranges", () => {
    const { adapter } = createAdapter();
    const engine = new NaturalCursorMovementEngine(adapter);
    expect(() => engine.moveTo("one", { x: Number.NaN, y: 2 })).toThrow(TypeError);
    expect(() => engine.moveTo("one", { x: 2, y: 3 }, { duration: -1 })).toThrow(RangeError);
    expect(() => engine.moveTo("one", { x: 2, y: 3 }, { curvature: 2 })).toThrow(RangeError);
    expect(() => engine.playSequence("one", [{ to: { x: 2, y: 3 } }], { pauseBetween: [2, 1] })).toThrow(RangeError);
    expect(() => engine.moveTo("missing", { x: 1, y: 1 })).toThrow("Unknown rendered cursor");
    engine.destroy();
  });

  it("finishes active paths at their destinations when reduced motion is enabled", () => {
    const { adapter, positions } = createAdapter();
    const engine = new NaturalCursorMovementEngine(adapter);
    engine.moveTo("one", { x: 70, y: 80 });
    engine.finishAll();
    expect(positions.get("one")).toEqual({ x: 70, y: 80 });
    expect(gsapState.timelines[0].kill).toHaveBeenCalledOnce();
  });
});
