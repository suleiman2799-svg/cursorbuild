import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiCursorCoordinationEngine } from "./multi-cursor-coordination-engine.js";

describe("MultiCursorCoordinationEngine", () => {
  let engine: MultiCursorCoordinationEngine;
  afterEach(() => engine?.destroy());

  it("runs independent cursor timelines concurrently", async () => {
    engine = new MultiCursorCoordinationEngine();
    const order: string[] = [];
    const maya = engine.createTimeline("maya", [{ id: "maya-move", run: async () => { await Promise.resolve(); order.push("maya"); } }]);
    const noah = engine.createTimeline("noah", [{ id: "noah-move", run: () => { order.push("noah"); } }]);
    const group = engine.createGroup("parallel", [maya, noah]);
    await group.run();
    expect(order).toHaveLength(2);
    expect(group.status).toBe("completed");
  });

  it("runs actions sequentially within a cursor timeline", async () => {
    engine = new MultiCursorCoordinationEngine();
    const order: string[] = [];
    const track = engine.createTimeline("maya", [
      { id: "move", run: () => { order.push("move"); } },
      { id: "type", run: () => { order.push("type"); } },
      { id: "click", run: () => { order.push("click"); } }
    ]);
    await engine.createGroup("sequence", [track]).run();
    expect(order).toEqual(["move", "type", "click"]);
  });

  it("supports explicit cross-cursor dependencies and shared action groups", async () => {
    engine = new MultiCursorCoordinationEngine();
    const order: string[] = [];
    const maya = engine.createTimeline("maya", [{ id: "prepare", run: () => { order.push("prepare"); } }]);
    const noah = engine.createTimeline("noah", [
      { id: "finish", dependsOn: ["prepare"], run: () => { order.push("finish"); } }
    ]);
    const group = engine.createGroup("shared-scene", [maya, noah]);
    await group.run();
    expect(order).toEqual(["prepare", "finish"]);
  });

  it("supports configurable group, timeline, and action delays", async () => {
    engine = new MultiCursorCoordinationEngine();
    vi.useFakeTimers();
    const run = vi.fn();
    const track = engine.createTimeline("maya", [{ id: "delayed", delay: 25, run }], { delay: 10 });
    const group = engine.createGroup("delays", [track], { delay: 5 });
    const promise = group.run();
    await vi.advanceTimersByTimeAsync(39);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(run).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("cancels one action without cancelling unrelated cursors", async () => {
    engine = new MultiCursorCoordinationEngine();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const slow = engine.createTimeline("maya", [{ id: "slow", run: async ({ signal }) => {
      await Promise.race([blocked, new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))]);
    } }], { mode: "parallel" });
    const fast = engine.createTimeline("noah", [{ id: "fast", run: () => {} }]);
    const group = engine.createGroup("individual-cancel", [slow, fast]);
    const promise = group.run();
    await Promise.resolve();
    group.cancelAction("slow");
    release();
    await promise;
    expect(group.getActionStatus("slow")).toBe("cancelled");
    expect(group.getActionStatus("fast")).toBe("completed");
    expect(group.status).toBe("cancelled");
  });

  it("keeps an in-flight action cancelled when its callback settles after cancellation", async () => {
    engine = new MultiCursorCoordinationEngine();
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    let receivedSignal!: AbortSignal;
    const track = engine.createTimeline("maya", [{
      id: "slow",
      run: async ({ signal }) => {
        receivedSignal = signal;
        markStarted();
        await blocked;
      }
    }], { mode: "parallel" });
    const group = engine.createGroup("late-settlement-cancel", [track]);
    const promise = group.run();
    await started;
    group.cancelAction("slow");
    expect(receivedSignal.aborted).toBe(true);
    release();
    await promise;
    expect(group.getActionStatus("slow")).toBe("cancelled");
    expect(group.status).toBe("cancelled");
  });

  it("cancels the entire group and propagates abort signals", async () => {
    engine = new MultiCursorCoordinationEngine();
    let observed = false;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const track = engine.createTimeline("maya", [{ id: "wait", run: ({ signal }) => {
      markStarted();
      return new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => { observed = true; resolve(); }, { once: true });
      });
    } }]);
    const group = engine.createGroup("cancel-all", [track]);
    const promise = group.run();
    await started;
    group.cancel();
    await promise;
    expect(observed).toBe(true);
    expect(group.status).toBe("cancelled");
  });

  it("rejects invalid definitions, unknown dependencies, duplicates, and cycles", () => {
    engine = new MultiCursorCoordinationEngine();
    expect(() => engine.createTimeline("", [{ id: "a", run: () => {} }])).toThrow(/cursor id/);
    expect(() => engine.createTimeline("maya", [])).toThrow(/at least one action/);
    expect(() => engine.createTimeline("maya", [
      { id: "same", run: () => {} }, { id: "same", run: () => {} }
    ])).toThrow(/Duplicate action id/);
    const first = engine.createTimeline("maya", [{ id: "a", dependsOn: ["missing"], run: () => {} }]);
    expect(() => engine.createGroup("unknown-dependency", [first])).toThrow(/Unknown dependency/);
    const cyclic = engine.createTimeline("maya", [
      { id: "a", dependsOn: ["b"], run: () => {} },
      { id: "b", dependsOn: ["a"], run: () => {} }
    ], { mode: "parallel" });
    expect(() => engine.createGroup("cycle", [cyclic])).toThrow(/Circular/);
  });

  it("propagates action failures and cancels siblings", async () => {
    engine = new MultiCursorCoordinationEngine();
    let markSiblingStarted!: () => void;
    const siblingStarted = new Promise<void>((resolve) => { markSiblingStarted = resolve; });
    const failed = engine.createTimeline("maya", [{ id: "fail", run: async () => {
      await siblingStarted;
      throw new Error("boom");
    } }]);
    let aborted = false;
    const sibling = engine.createTimeline("noah", [{ id: "sibling", run: ({ signal }) => {
      markSiblingStarted();
      return new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => { aborted = true; resolve(); }, { once: true });
      });
    } }]);
    const group = engine.createGroup("failure", [failed, sibling]);
    await expect(group.run()).rejects.toThrow("boom");
    expect(aborted).toBe(true);
    expect(group.status).toBe("failed");
  });

  it("cancels all groups on destroy and rejects new work afterwards", async () => {
    engine = new MultiCursorCoordinationEngine();
    const track = engine.createTimeline("maya", [{ id: "noop", run: () => {} }]);
    const group = engine.createGroup("owned", [track]);
    engine.destroy();
    expect(group.status).toBe("cancelled");
    expect(() => engine.createTimeline("maya", [{ id: "later", run: () => {} }])).toThrow(/destroyed/);
  });
});
