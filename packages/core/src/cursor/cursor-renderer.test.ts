// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CursorManager } from "./cursor-manager.js";
import { CursorRenderer } from "./cursor-renderer.js";

const gsapState = vi.hoisted(() => ({ timelines: [] as Array<{ to: ReturnType<typeof vi.fn>; fromTo: ReturnType<typeof vi.fn>; eventCallback: ReturnType<typeof vi.fn>; kill: ReturnType<typeof vi.fn> }> }));
vi.mock("gsap", () => {
  const set = vi.fn();
  const to = vi.fn(() => ({ kill: vi.fn() }));
  const timeline = vi.fn(() => {
    const item = { to: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis(), eventCallback: vi.fn().mockReturnThis(), kill: vi.fn() };
    gsapState.timelines.push(item); return item;
  });
  return { gsap: { set, to, timeline, killTweensOf: vi.fn(), registerPlugin: vi.fn() } };
});
const renderers: CursorRenderer[] = [];
afterEach(() => { renderers.splice(0).forEach((renderer) => renderer.destroy()); document.body.innerHTML = ""; gsapState.timelines.length = 0; vi.clearAllMocks(); });

function setup(ids = ["a", "b"], options = {}) {
  const manager = new CursorManager(); const host = document.createElement("div"); document.body.append(host);
  ids.forEach((id) => manager.add({ id, name: id.toUpperCase(), color: "#a78bfa" }));
  const renderer = new CursorRenderer(manager, host, options); renderers.push(renderer);
  return { manager, host, renderer };
}

describe("CursorRenderer", () => {
  it("renders independently named and colored cursors into a pointer-transparent overlay", () => {
    const { host } = setup();
    const overlay = host.querySelector(".cursorbuild-overlay")!;
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect((overlay as HTMLElement).style.pointerEvents).toBe("none");
    expect(host.querySelectorAll(".cursorbuild-cursor")).toHaveLength(2);
    expect((host.querySelector('[data-cursor-id="a"]') as HTMLElement).style.pointerEvents).toBe("none");
  });
  it("preserves direct and natural movement APIs", () => {
    const { renderer } = setup(["a"]);
    renderer.moveTo("a", { x: 120, y: 80 });
    expect(renderer.getPosition("a")).toEqual({ x: 120, y: 80 });
    expect(renderer.moveNaturally("a", { x: 140, y: 90 }, { duration: 1.1 })).toBeDefined();
    renderer.moveSequence("a", [{ to: { x: 160, y: 100 } }]);
    renderer.stopNaturalMovement("a");
  });
  it("plays default press-and-ripple feedback through the backward-compatible click call", () => {
    const { host, renderer } = setup(["a"]);
    renderer.click("a");
    expect(gsapState.timelines).toHaveLength(1);
    expect(gsapState.timelines[0].to).toHaveBeenCalledTimes(2);
    expect(gsapState.timelines[0].fromTo).toHaveBeenCalledTimes(1);
    expect(host.querySelector(".cursorbuild-cursor__button")).not.toBeNull();
    expect((host.querySelector(".cursorbuild-cursor") as HTMLElement).style.display).not.toBe("none");
  });
  it("accepts renderer-level and per-click custom configuration", () => {
    const { renderer } = setup(["a"], { clickFeedback: { duration: 0.8, rippleSize: 3, intensity: 0.4, style: "ripple" } });
    renderer.click("a");
    expect(gsapState.timelines[0].to).not.toHaveBeenCalled();
    expect(gsapState.timelines[0].fromTo.mock.calls[0][2].scale).toBe(3);
    expect(gsapState.timelines[0].fromTo.mock.calls[0][1].opacity).toBe(0.4);
    renderer.click("a", { style: "press", duration: 0.2 });
    expect(gsapState.timelines).toHaveLength(2);
    expect(gsapState.timelines[1].to).toHaveBeenCalledTimes(2);
    expect(gsapState.timelines[1].fromTo).not.toHaveBeenCalled();
  });
  it("animates simultaneous cursor clicks on independent timelines", () => {
    const { renderer } = setup(["a", "b"]);
    renderer.click("a"); renderer.click("b");
    expect(gsapState.timelines).toHaveLength(2);
    expect(gsapState.timelines[0].kill).not.toHaveBeenCalled();
    expect(gsapState.timelines[1].kill).not.toHaveBeenCalled();
  });
  it("replaces only the same cursor's active click timeline", () => {
    const { renderer } = setup(["a", "b"]);
    renderer.click("a"); renderer.click("b"); renderer.click("a");
    expect(gsapState.timelines[0].kill).toHaveBeenCalledOnce();
    expect(gsapState.timelines[1].kill).not.toHaveBeenCalled();
  });
  it("suppresses click animation when reduced motion is active", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    const { renderer } = setup(["a"]);
    renderer.click("a");
    expect(gsapState.timelines).toHaveLength(0);
    window.matchMedia = original;
  });
  it("kills click timelines and removes cursor DOM when an identity is removed", () => {
    const { manager, host, renderer } = setup(["a"]);
    renderer.click("a");
    const timeline = gsapState.timelines[0];
    manager.remove("a");
    expect(timeline.kill).toHaveBeenCalledOnce();
    expect(host.querySelector(".cursorbuild-cursor")).toBeNull();
  });
  it("kills all click timelines and removes overlay when renderer is destroyed", () => {
    const { host, renderer } = setup(["a", "b"]);
    renderer.click("a"); renderer.click("b");
    const timelines = [...gsapState.timelines];
    renderer.destroy();
    timelines.forEach((timeline) => expect(timeline.kill).toHaveBeenCalledOnce());
    expect(host.querySelector(".cursorbuild-overlay")).toBeNull();
  });
  it("validates click configuration", () => {
    expect(() => setup(["a"], { clickFeedback: { intensity: 2 } })).toThrow(RangeError);
    const { renderer } = setup(["a"]);
    expect(() => renderer.click("a", { rippleSize: 0 })).toThrow(RangeError);
  });
});
describe("CursorRenderer responsive behaviour", () => {
  it("limits visible cursor nodes on mobile and restores them on desktop resize", () => {
    const { manager, host, renderer } = setup([]);
    for (let index = 0; index < 4; index++) manager.add({ id: String(index), name: "Designer " + index, color: "#abc" });
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    const nodes = Array.from(host.querySelectorAll<HTMLElement>(".cursorbuild-cursor"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(2);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    window.dispatchEvent(new Event("resize"));
    expect(nodes.filter((node) => node.style.display === "flex")).toHaveLength(4);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    renderer.destroy();
  });
});

describe("CursorRenderer drag simulation", () => {
  function addCard(host: HTMLElement, id = "card") {
    const card = document.createElement("article");
    card.id = id;
    card.style.transform = "rotate(3deg)";
    card.style.translate = "12px 4px";
    host.append(card);
    return card;
  }
  it("approaches and starts a selector-based drag with an independent timeline", () => {
    const { host, renderer } = setup(["a"]);
    addCard(host);
    const timeline = renderer.drag("a", { target: "#card", to: { x: 420, y: 260 }, duration: 1.2 });
    expect(timeline).toBeDefined();
    expect(renderer.isDragging("a")).toBe(true);
    expect(gsapState.timelines).toHaveLength(1);
    expect(gsapState.timelines[0].to).toHaveBeenCalledTimes(2);
  });
  it("accepts an HTMLElement target and preserves its original transform", () => {
    const { host, renderer } = setup(["a"]);
    const card = addCard(host);
    renderer.drag("a", { target: card, to: { x: 100, y: 80 } });
    expect(card.style.transform).toBe("rotate(3deg)");
    expect(renderer.isDragging("a")).toBe(true);
  });
  it("prevents a second cursor from acquiring an already locked element", () => {
    const { host, renderer } = setup(["a", "b"]);
    addCard(host);
    renderer.drag("a", { target: "#card", to: { x: 100, y: 100 } });
    expect(() => renderer.drag("b", { target: "#card", to: { x: 200, y: 100 } })).toThrow(/already being dragged/);
    expect(renderer.isDragging("a")).toBe(true);
    expect(renderer.isDragging("b")).toBe(false);
  });
  it("allows different cursors to drag different elements concurrently", () => {
    const { host, renderer } = setup(["a", "b"]);
    addCard(host, "one"); addCard(host, "two");
    renderer.drag("a", { target: "#one", to: { x: 100, y: 100 } });
    renderer.drag("b", { target: "#two", to: { x: 200, y: 100 } });
    expect(renderer.isDragging("a")).toBe(true);
    expect(renderer.isDragging("b")).toBe(true);
    expect(gsapState.timelines).toHaveLength(2);
  });
  it("cancels a drag and restores the target's original inline translate", () => {
    const { host, renderer } = setup(["a"]);
    const card = addCard(host);
    renderer.drag("a", { target: card, to: { x: 100, y: 100 } });
    renderer.stopDrag("a");
    expect(renderer.isDragging("a")).toBe(false);
    expect(card.style.translate).toBe("12px 4px");
    expect(card.style.transform).toBe("rotate(3deg)");
    expect(card.hasAttribute("data-cursorbuild-dragging")).toBe(false);
  });
  it("releases locks when a target is removed", () => {
    const { host, renderer } = setup(["a", "b"]);
    const card = addCard(host);
    renderer.drag("a", { target: card, to: { x: 100, y: 100 } });
    card.remove();
    expect(renderer.isDragging("a")).toBe(false);
    expect(() => renderer.drag("b", { target: card, to: { x: 100, y: 100 } })).toThrow(/contained/);
  });
  it("cancels an active drag when its cursor is removed", () => {
    const { manager, host, renderer } = setup(["a"]);
    const card = addCard(host);
    renderer.drag("a", { target: card, to: { x: 100, y: 100 } });
    manager.remove("a");
    expect(renderer.isDragging("a")).toBe(false);
    expect(card.style.translate).toBe("12px 4px");
  });
  it("cancels all active drags and restores styles on renderer destruction", () => {
    const { host, renderer } = setup(["a", "b"]);
    const one = addCard(host, "one"), two = addCard(host, "two");
    renderer.drag("a", { target: one, to: { x: 100, y: 100 } });
    renderer.drag("b", { target: two, to: { x: 200, y: 100 } });
    renderer.destroy();
    expect(one.style.translate).toBe("12px 4px");
    expect(two.style.translate).toBe("12px 4px");
  });
  it("snaps to the destination without an animation when reduced motion is active", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    const { host, renderer } = setup(["a"]);
    const card = addCard(host);
    expect(renderer.drag("a", { target: card, to: { x: 100, y: 80 } })).toBeUndefined();
    expect(renderer.isDragging("a")).toBe(false);
    expect(gsapState.timelines).toHaveLength(0);
    window.matchMedia = original;
  });
  it("validates drag coordinates, options, selectors, and unknown cursors", () => {
    const { host, renderer } = setup(["a"]);
    addCard(host);
    expect(() => renderer.drag("missing", { target: "#card", to: { x: 1, y: 2 } })).toThrow(/Unknown rendered cursor/);
    expect(() => renderer.drag("a", { target: "#card", to: { x: Number.NaN, y: 2 } })).toThrow(TypeError);
    expect(() => renderer.drag("a", { target: "#card", to: { x: 1, y: 2 }, curvature: 2 })).toThrow(RangeError);
    expect(() => renderer.drag("a", { target: "[", to: { x: 1, y: 2 } })).toThrow(/valid CSS selector/);
    expect(() => renderer.drag("a", { target: document.createElement("div"), to: { x: 1, y: 2 } })).toThrow(/contained/);
  });
});
