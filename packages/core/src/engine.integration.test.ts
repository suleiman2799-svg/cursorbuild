// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CursorBuildEngine } from "./engine.js";
import { CinematicAnimationEngine } from "./animation/cinematic-animation-engine.js";
import { MultiCursorCoordinationEngine } from "./coordination/multi-cursor-coordination-engine.js";
import { MultiCursorCoordinator } from "./coordination/multi-cursor-coordinator.js";
import { ScrollConstructionEngine } from "./scroll/scroll-construction-engine.js";

describe("CursorBuildEngine feature integration", () => {
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
