import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiCursorCoordinator } from "./multi-cursor-coordinator.js";

type AnimationMock = {
  progress: ReturnType<typeof vi.fn>;
  eventCallback: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
};

function createAnimation() {
  const callbacks = new Map<string, ((...args: unknown[]) => void) | null>();
  const animation = {
    progress: vi.fn(() => 0),
    eventCallback: vi.fn(function (this: AnimationMock, event: string, callback?: ((...args: unknown[]) => void) | null) {
      if (arguments.length === 1) return callbacks.get(event) ?? null;
      callbacks.set(event, callback ?? null);
      return this;
    }),
    kill: vi.fn(function (this: AnimationMock) {
      callbacks.get("onInterrupt")?.call(this);
      return this;
    })
  };
  return {
    animation,
    complete: () => callbacks.get("onComplete")?.call(animation),
    interrupt: () => callbacks.get("onInterrupt")?.call(animation)
  };
}

const coordinators: MultiCursorCoordinator[] = [];
afterEach(() => {
  coordinators.splice(0).forEach((coordinator) => coordinator.destroy());
  vi.clearAllMocks();
});

function setup() {
  const coordinator = new MultiCursorCoordinator();
  coordinators.push(coordinator);
  return coordinator;
}

describe("MultiCursorCoordinator", () => {
  it("runs collaborator actions concurrently and passes cursor-scoped context", async () => {
    const coordinator = setup();
    const calls: string[] = [];
    const contexts: Array<{ groupId: string; actionId: string; cursorId: string; signal: AbortSignal }> = [];
    await coordinator.runGroup("hero", [
      { id: "maya-title", cursorId: "maya", run: (context) => { calls.push("maya"); contexts.push(context); } },
      { id: "noah-image", cursorId: "noah", run: (context) => { calls.push("noah"); contexts.push(context); } }
    ], { mode: "parallel" });
    expect(calls).toEqual(["maya", "noah"]);
    expect(contexts.map((context) => [context.groupId, context.actionId, context.cursorId])).toEqual([
      ["hero", "maya-title", "maya"], ["hero", "noah-image", "noah"]
    ]);
    expect(contexts.every((context) => context.signal instanceof AbortSignal)).toBe(true);
    expect(coordinator.getActiveGroupIds()).toEqual([]);
  });

  it("runs actions sequentially when requested", async () => {
    const coordinator = setup();
    const order: string[] = [];
    await coordinator.runGroup("sequence", [
      { id: "first", cursorId: "maya", run: () => { order.push("first"); } },
      { id: "second", cursorId: "noah", run: () => { order.push("second"); } },
      { id: "third", cursorId: "zoe", run: () => { order.push("third"); } }
    ], { mode: "sequence" });
    expect(order).toEqual(["first", "second", "third"]);
  });

  it("staggers parallel collaborator starts by the configured delay", async () => {
    vi.useFakeTimers();
    const coordinator = setup();
    const starts: string[] = [];
    const done = coordinator.runGroup("staggered", [
      { id: "first", cursorId: "maya", run: () => { starts.push("first"); } },
      { id: "second", cursorId: "noah", run: () => { starts.push("second"); } }
    ], { mode: "parallel", delayBetween: 0.05 });
    await Promise.resolve();
    expect(starts).toEqual(["first"]);
    await vi.advanceTimersByTimeAsync(49);
    expect(starts).toEqual(["first"]);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(starts).toEqual(["first", "second"]);
  });

  it("honours explicit dependencies and topologically orders actions", async () => {
    const coordinator = setup();
    const order: string[] = [];
    await coordinator.runGroup("dependencies", [
      { id: "third", cursorId: "zoe", dependsOn: ["second"], run: () => { order.push("third"); } },
      { id: "first", cursorId: "maya", run: () => { order.push("first"); } },
      { id: "second", cursorId: "noah", dependsOn: ["first"], run: () => { order.push("second"); } }
    ]);
    expect(order).toEqual(["first", "second", "third"]);
  });

  it("waits for returned GSAP animations before completing a group", async () => {
    const coordinator = setup();
    const { animation, complete } = createAnimation();
    const done = coordinator.runGroup("animated", [
      { id: "move", cursorId: "maya", run: () => animation as never }
    ]);
    await Promise.resolve();
    expect(coordinator.getActiveActionIds()).toEqual(["move"]);
    let finished = false;
    void done.then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    complete();
    await done;
    expect(finished).toBe(true);
    expect(coordinator.getActiveActionIds()).toEqual([]);
  });

  it("preserves existing GSAP completion callbacks", async () => {
    const coordinator = setup();
    const { animation, complete } = createAnimation();
    const prior = vi.fn();
    animation.eventCallback("onComplete", prior);
    const done = coordinator.runGroup("callbacks", [{ id: "animation", cursorId: "maya", run: () => animation as never }]);
    await Promise.resolve();
    complete();
    await done;
    expect(prior).toHaveBeenCalledOnce();
  });

  it("cancels an individual action and kills its active GSAP animation", async () => {
    const coordinator = setup();
    const { animation } = createAnimation();
    const done = coordinator.runGroup("cancel-one", [{ id: "drag", cursorId: "maya", run: () => animation as never }]);
    await Promise.resolve();
    expect(coordinator.cancelAction("drag")).toBe(true);
    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    expect(animation.kill).toHaveBeenCalledOnce();
    expect(coordinator.cancelAction("drag")).toBe(false);
  });

  it("cancels every active action in a group", async () => {
    const coordinator = setup();
    const first = createAnimation();
    const second = createAnimation();
    const done = coordinator.runGroup("cancel-all", [
      { id: "a", cursorId: "maya", run: () => first.animation as never },
      { id: "b", cursorId: "noah", run: () => second.animation as never }
    ]);
    await Promise.resolve();
    expect(coordinator.cancelGroup("cancel-all")).toBe(true);
    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    expect(first.animation.kill).toHaveBeenCalledOnce();
    expect(second.animation.kill).toHaveBeenCalledOnce();
    expect(coordinator.getActiveGroupIds()).toEqual([]);
  });

  it("propagates asynchronous action failures and cancels sibling actions", async () => {
    const coordinator = setup();
    const animation = createAnimation();
    const done = coordinator.runGroup("failure", [
      { id: "long-running", cursorId: "maya", run: () => animation.animation as never },
      { id: "fails", cursorId: "noah", run: () => Promise.reject(new Error("action failed")) }
    ]);
    await expect(done).rejects.toThrow("action failed");
    expect(animation.animation.kill).toHaveBeenCalledOnce();
  });

  it("validates group ids, action ids, dependencies, cycles, and delays", async () => {
    const coordinator = setup();
    const action = [{ id: "one", cursorId: "maya", run: () => undefined }];
    await expect(coordinator.runGroup("", action)).rejects.toThrow(/group id is required/);
    await expect(coordinator.runGroup("empty", [])).rejects.toThrow(/at least one action/);
    await expect(coordinator.runGroup("duplicate-actions", [
      action[0], action[0]
    ])).rejects.toThrow(/Duplicate coordinated action/);
    await expect(coordinator.runGroup("missing-dependency", [
      { ...action[0], dependsOn: ["missing"] }
    ])).rejects.toThrow(/Unknown action dependency/);
    await expect(coordinator.runGroup("cycle", [
      { ...action[0], dependsOn: ["two"] },
      { id: "two", cursorId: "noah", dependsOn: ["one"], run: () => undefined }
    ])).rejects.toThrow(/contain a cycle/);
    await expect(coordinator.runGroup("bad-delay", action, { delayBetween: -1 })).rejects.toThrow(RangeError);
  });

  it("rejects duplicate active group ids and cleans up on destroy", async () => {
    const coordinator = setup();
    const animation = createAnimation();
    const done = coordinator.runGroup("same", [{ id: "active", cursorId: "maya", run: () => animation.animation as never }]);
    await Promise.resolve();
    await expect(coordinator.runGroup("same", [{ id: "other", cursorId: "noah", run: () => undefined }])).rejects.toThrow(/already running/);
    coordinator.destroy();
    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    expect(animation.animation.kill).toHaveBeenCalledOnce();
    expect(() => coordinator.getActiveActionIds()).not.toThrow();
    await expect(coordinator.runGroup("after-destroy", [{ id: "x", cursorId: "maya", run: () => undefined }])).rejects.toThrow(/destroyed/);
  });
});
