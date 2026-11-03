// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CursorManager } from "./cursor-manager.js";
import { CursorRenderer } from "./cursor-renderer.js";

vi.mock("gsap", () => {
  const set = vi.fn((target: Element, vars: Record<string, unknown>) => { Object.assign((target as HTMLElement).style, { transform: `translate(${vars.x ?? 0}px,${vars.y ?? 0}px)` }); });
  const to = vi.fn(() => ({ kill: vi.fn() }));
  const timeline = vi.fn(() => ({ to: vi.fn().mockReturnThis(), eventCallback: vi.fn().mockReturnThis(), kill: vi.fn() }));
  return { gsap: { set, to, timeline, killTweensOf: vi.fn(), registerPlugin: vi.fn() } };
});
const renderers: CursorRenderer[] = [];
afterEach(() => { renderers.splice(0).forEach((renderer) => renderer.destroy()); document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("CursorRenderer", () => {
  it("renders independently named and colored cursors into a pointer-transparent overlay", () => {
    const manager = new CursorManager(); const host = document.createElement("section"); document.body.append(host);
    manager.add({ id: "a", name: "Ari", color: "#ff4d8d" }); manager.add({ id: "b", name: "Mika", color: "#35c9a5" });
    renderers.push(new CursorRenderer(manager, host));
    const overlay = host.querySelector(".cursorbuild-overlay")!;
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect((overlay as HTMLElement).style.pointerEvents).toBe("none");
    expect(host.querySelectorAll(".cursorbuild-cursor")).toHaveLength(2);
    expect(host.textContent).toContain("Ari"); expect(host.textContent).toContain("Mika");
    expect((host.querySelector('[data-cursor-id="a"]') as HTMLElement).style.getPropertyValue("--cursorbuild-color")).toBe("#ff4d8d");
  });
  it("supports movement and click API and removes nodes when identities are removed", () => {
    const manager = new CursorManager(); const host = document.createElement("div"); document.body.append(host);
    manager.add({ id: "a", name: "Ari", color: "#fff" }); const renderer = new CursorRenderer(manager, host); renderers.push(renderer);
    renderer.moveTo("a", { x: 120, y: 80 }); expect(renderer.getPosition("a")).toEqual({ x: 120, y: 80 });
    renderer.click("a"); manager.remove("a"); expect(host.querySelectorAll(".cursorbuild-cursor")).toHaveLength(0);
    expect(renderer.getPosition("a")).toBeUndefined();
  });
  it("rejects unknown cursors and invalid coordinates", () => {
    const manager = new CursorManager(); const host = document.createElement("div"); document.body.append(host);
    const renderer = new CursorRenderer(manager, host); renderers.push(renderer);
    expect(() => renderer.moveTo("missing", { x: 1, y: 2 })).toThrow();
    manager.add({ id: "a", name: "A", color: "#fff" });
    expect(() => renderer.moveTo("a", { x: Number.NaN, y: 2 })).toThrow(TypeError);
  });

  it("exposes natural movement while preserving the existing direct movement API", () => {
    const manager = new CursorManager(); const host = document.createElement("div"); document.body.append(host);
    manager.add({ id: "a", name: "Ari", color: "#fff" });
    const renderer = new CursorRenderer(manager, host); renderers.push(renderer);
    const timeline = renderer.moveNaturally("a", { x: 140, y: 90 }, { duration: 1.1, ease: "power2.inOut" });
    expect(timeline).toBeDefined();
    expect(renderer.getPosition("a")).toEqual({ x: 24, y: 28 });
    renderer.moveTo("a", { x: 50, y: 60 }, 0);
    expect(renderer.getPosition("a")).toEqual({ x: 50, y: 60 });
  });
\n  it("restores container positioning and removes overlay on destroy", () => {
    const manager = new CursorManager(); const host = document.createElement("div"); document.body.append(host);
    const renderer = new CursorRenderer(manager, host); renderers.push(renderer);
    expect(host.style.position).toBe("relative"); renderer.destroy();
    expect(host.querySelector(".cursorbuild-overlay")).toBeNull(); expect(host.style.position).toBe("");
  });
});
describe("CursorRenderer responsive behaviour", () => {
  it("limits visible cursor nodes on mobile and restores them on desktop resize", () => {
    const manager = new CursorManager(); const host = document.createElement("div"); document.body.append(host);
    for (let index = 0; index < 4; index++) manager.add({ id: String(index), name: "Designer " + index, color: "#abc" });
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const renderer = new CursorRenderer(manager, host); renderers.push(renderer);
    const nodes = Array.from(host.querySelectorAll<HTMLElement>(".cursorbuild-cursor"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(2);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    window.dispatchEvent(new Event("resize"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(4);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });
});
