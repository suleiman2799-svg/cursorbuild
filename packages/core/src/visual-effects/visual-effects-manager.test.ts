// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
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
  it("clears effects, restores positioning, and rejects use after destroy", () => {
    setup();
    manager!.highlight("#card"); manager!.setProgress(0.25); manager!.destroy();
    expect(manager!.overlay.isConnected).toBe(false);
    expect(container.style.position).toBe("");
    expect(() => manager!.showGrid()).toThrow(/destroyed/);
  });
});
