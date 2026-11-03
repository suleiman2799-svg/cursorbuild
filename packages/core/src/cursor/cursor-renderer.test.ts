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

describe("CursorRenderer text insertion simulation", () => {
  function addInput(host: HTMLElement, id = "typing-input") {
    const input = document.createElement("input"); input.id = id; input.value = "Existing"; host.append(input); return input;
  }
  function typingTween() {
    const timeline = gsapState.timelines[0];
    return { timeline, vars: timeline.to.mock.calls[1][1] as { onStart?: () => void; onUpdate?: () => void; duration: number } };
  }
  function advanceTyping(value: number) {
    const timeline = gsapState.timelines[0];
    (timeline.to.mock.calls[1][0] as { value: number }).value = value;
    (timeline.to.mock.calls[1][1] as { onUpdate?: () => void }).onUpdate?.();
  }
  it("types progressively into an input and removes the caret on completion", () => {
    const { host, renderer } = setup(["a"]);
    const input = addInput(host);
    renderer.typeText("a", { target: "#typing-input", text: "CursorBuild", duration: 2, initialDelay: 0.2 });
    expect(renderer.isTyping("a")).toBe(true);
    expect(input.value).toBe("");
    const { timeline, vars } = typingTween();
    vars.onStart?.();
    expect(input.matches(":focus")).toBe(true);
    expect(host.querySelectorAll(".cursorbuild-typing-caret")).toHaveLength(1);
    advanceTyping(0.5);
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value.length).toBeLessThan("CursorBuild".length);
    const complete = timeline.eventCallback.mock.calls.find((call: unknown[]) => call[0] === "onComplete")?.[1] as (() => void) | undefined;
    complete?.();
    expect(input.value).toBe("CursorBuild");
    expect(renderer.isTyping("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-typing-caret")).toBeNull();
  });
  it("supports textarea targets and append mode", () => {
    const { host, renderer } = setup(["a"]);
    const textarea = document.createElement("textarea"); textarea.value = "Hello"; host.append(textarea);
    renderer.typeText("a", { target: textarea, text: " world", mode: "append", duration: 1 });
    advanceTyping(1);
    expect(textarea.value).toBe("Hello world");
  });
  it("supports contenteditable targets and preserves original nodes on cancellation", () => {
    const { host, renderer } = setup(["a"]);
    const editable = document.createElement("div"); editable.setAttribute("contenteditable", "true");
    const original = document.createElement("strong"); original.textContent = "Old"; editable.append(original); host.append(editable);
    renderer.typeText("a", { target: editable, text: "New", mode: "replace" });
    expect(editable.textContent).toBe("");
    advanceTyping(1);
    expect(editable.textContent).toBe("New");
    renderer.stopTextInsertion("a");
    expect(editable.textContent).toBe("Old");
    expect(editable.firstChild).toBe(original);
  });
  it("appends progressively to contenteditable without removing existing markup", () => {
    const { host, renderer } = setup(["a"]);
    const editable = document.createElement("div"); editable.setAttribute("contenteditable", "true");
    const original = document.createElement("em"); original.textContent = "Keep"; editable.append(original); host.append(editable);
    renderer.typeText("a", { target: editable, text: " it", mode: "append" });
    advanceTyping(1);
    expect(editable.textContent).toBe("Keep it");
    expect(editable.firstChild).toBe(original);
  });
  it("uses characterIntervalMs to determine the typing tween duration", () => {
    const { host, renderer } = setup(["a"]);
    const input = addInput(host);
    renderer.typeText("a", { target: input, text: "12345", duration: 10, characterIntervalMs: 80, initialDelay: 0.25 });
    const { vars } = typingTween();
    expect(vars.duration).toBeCloseTo(0.65);
  });
  it("cancels typing, restores original input value, and removes caret and timeline", () => {
    const { host, renderer } = setup(["a"]);
    const input = addInput(host);
    renderer.typeText("a", { target: input, text: "Replacement" });
    const timeline = gsapState.timelines[0];
    advanceTyping(0.4);
    renderer.stopTextInsertion("a");
    expect(input.value).toBe("Existing");
    expect(renderer.isTyping("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-typing-caret")).toBeNull();
    expect(timeline.kill).toHaveBeenCalled();
  });
  it("allows independent cursors to type into separate targets simultaneously", () => {
    const { host, renderer } = setup(["a", "b"]);
    const one = addInput(host, "one"), two = addInput(host, "two");
    renderer.typeText("a", { target: one, text: "First" });
    renderer.typeText("b", { target: two, text: "Second" });
    expect(renderer.isTyping("a")).toBe(true);
    expect(renderer.isTyping("b")).toBe(true);
    expect(gsapState.timelines).toHaveLength(2);
  });
  it("prevents another cursor from typing into a locked target", () => {
    const { host, renderer } = setup(["a", "b"]);
    const input = addInput(host);
    renderer.typeText("a", { target: input, text: "One" });
    expect(() => renderer.typeText("b", { target: input, text: "Two" })).toThrow(/already being typed/);
  });
  it("cancels when the target is removed", () => {
    const { host, renderer } = setup(["a"]);
    const input = addInput(host);
    renderer.typeText("a", { target: input, text: "Text" });
    input.remove();
    expect(renderer.isTyping("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-typing-caret")).toBeNull();
    expect(input.value).toBe("Existing");
  });
  it("cancels and restores the target when its cursor is removed", () => {
    const { manager, host, renderer } = setup(["a"]);
    const input = addInput(host);
    renderer.typeText("a", { target: input, text: "Text" });
    manager.remove("a");
    expect(input.value).toBe("Existing");
    expect(renderer.isTyping("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-typing-caret")).toBeNull();
  });
  it("cancels all typing and removes caret elements on renderer destruction", () => {
    const { host, renderer } = setup(["a", "b"]);
    const one = addInput(host, "one"), two = addInput(host, "two");
    renderer.typeText("a", { target: one, text: "One" });
    renderer.typeText("b", { target: two, text: "Two" });
    renderer.destroy();
    expect(one.value).toBe("Existing");
    expect(two.value).toBe("Existing");
    expect(host.querySelector(".cursorbuild-typing-caret")).toBeNull();
  });
  it("completes immediately when reduced motion is enabled", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    const { host, renderer } = setup(["a"]);
    const input = addInput(host);
    expect(renderer.typeText("a", { target: input, text: "Instant" })).toBeUndefined();
    expect(input.value).toBe("Instant");
    expect(renderer.isTyping("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-typing-caret")).toBeNull();
    window.matchMedia = original;
  });
  it("rejects unsupported targets, invalid selectors, and invalid timing options", () => {
    const { host, renderer } = setup(["a"]);
    const div = document.createElement("div"); host.append(div);
    expect(() => renderer.typeText("a", { target: div, text: "No" })).toThrow(/input, textarea/);
    expect(() => renderer.typeText("a", { target: "#missing", text: "No" })).toThrow(/did not match/);
    expect(() => renderer.typeText("a", { target: "[", text: "No" })).toThrow(/valid CSS selector/);
    expect(() => renderer.typeText("a", { target: div, text: "No", duration: -1 })).toThrow(RangeError);
    expect(() => renderer.typeText("a", { target: div, text: "No", characterIntervalMs: -1 })).toThrow(RangeError);
    expect(() => renderer.typeText("a", { target: div, text: "No", mode: "other" as "replace" })).toThrow(/mode/);
  });
  it("prevents dragging an element while text insertion owns it", () => {
    const { host, renderer } = setup(["a", "b"]);
    const input = addInput(host);
    renderer.typeText("a", { target: input, text: "Text" });
    expect(() => renderer.drag("b", { target: input, to: { x: 10, y: 10 } })).toThrow(/text insertion/);
  });
});


describe("CursorRenderer element resizing simulation", () => {
  function addResizeTarget(host: HTMLElement, id = "resize-target") {
    const target = document.createElement("article");
    target.id = id;
    target.style.width = "100px";
    target.style.height = "80px";
    target.style.transform = "rotate(4deg)";
    host.append(target);
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 10, y: 20, left: 10, top: 20, right: 110, bottom: 100,
      width: 100, height: 80, toJSON: () => ({})
    } as DOMRect);
    return target;
  }

  it("resolves CSS selectors and renders a selection frame with eight handles", () => {
    const { host, renderer } = setup(["a"]);
    addResizeTarget(host);
    renderer.resize("a", { target: "#resize-target", to: { width: 200, height: 140 } });
    expect(renderer.isResizing("a")).toBe(true);
    expect(host.querySelectorAll(".cursorbuild-resize-handle")).toHaveLength(8);
    expect(host.querySelector(".cursorbuild-resize-frame")).not.toBeNull();
  });

  it("accepts a direct HTMLElement target", () => {
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    renderer.resize("a", { target, to: { width: 220, height: 150 } });
    expect(renderer.isResizing("a")).toBe(true);
  });

  it("supports all eight configured resize handles", () => {
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    const handles = ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"] as const;
    handles.forEach((handle) => {
      renderer.resize("a", { target, to: { width: 180, height: 120 }, handle });
      expect(host.querySelector('[data-handle="' + handle + '"]')).not.toBeNull();
      renderer.stopResize("a");
    });
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
  });

  it("animates width and height progressively without overwriting transforms", () => {
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    renderer.resize("a", { target, to: { width: 200, height: 160 } });
    const tween = gsapState.timelines[0].to.mock.calls[1];
    tween[0].value = 0.5;
    tween[1].onUpdate();
    expect(target.style.width).toBe("150px");
    expect(target.style.height).toBe("120px");
    expect(target.style.transform).toBe("rotate(4deg)");
  });

  it("retains final dimensions after the timeline completes", () => {
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    renderer.resize("a", { target, to: { width: 240, height: 170 } });
    const complete = gsapState.timelines[0].eventCallback.mock.calls.find((call: unknown[]) => call[0] === "onComplete")?.[1] as (() => void) | undefined;
    complete?.();
    expect(target.style.width).toBe("240px");
    expect(target.style.height).toBe("170px");
    expect(renderer.isResizing("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
  });

  it("cancels and restores exact original inline dimensions, translate, and temporary handles", () => {
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    target.style.translate = "12px 4px";
    renderer.resize("a", { target, to: { width: 240, height: 170 }, handle: "top-left" });
    renderer.stopResize("a");
    expect(target.style.width).toBe("100px");
    expect(target.style.height).toBe("80px");
    expect(target.style.translate).toBe("12px 4px");
    expect(target.style.transform).toBe("rotate(4deg)");
    expect(renderer.isResizing("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
    expect(gsapState.timelines[0].kill).toHaveBeenCalled();
  });

  it("keeps the opposite edge or corner anchored for every resize handle", () => {
    const cases = [
      ["top-left", -20, -10],
      ["top", 0, -10],
      ["top-right", 0, -10],
      ["right", 0, 0],
      ["bottom-right", 0, 0],
      ["bottom", 0, 0],
      ["bottom-left", -20, 0],
      ["left", -20, 0]
    ] as const;
    cases.forEach(([handle, expectedX, expectedY]) => {
      const { host, renderer } = setup(["a"]);
      const target = addResizeTarget(host);
      target.style.translate = "12px 4px";
      renderer.resize("a", { target, to: { width: 140, height: 100 }, handle });
      const resizeTween = gsapState.timelines[gsapState.timelines.length - 1].to.mock.calls[1];
      resizeTween[0].value = 0.5;
      resizeTween[1].onUpdate();
      const dx = expectedX === 0 ? 0 : expectedX;
      const dy = expectedY === 0 ? 0 : expectedY;
      expect(target.style.translate).toBe(`calc(12px + ${dx}px) calc(4px + ${dy}px)`);
      expect(target.style.transform).toBe("rotate(4deg)");
      renderer.stopResize("a");
      expect(target.style.translate).toBe("12px 4px");
      expect(target.style.width).toBe("100px");
      expect(target.style.height).toBe("80px");
    });
  });

  it("rejects invalid dimensions, selectors, durations, and curvature", () => {
    const { host, renderer } = setup(["a"]);
    addResizeTarget(host);
    expect(() => renderer.resize("a", { target: "#resize-target", to: { width: 0, height: 100 } })).toThrow(RangeError);
    expect(() => renderer.resize("a", { target: "#resize-target", to: { width: 100, height: -1 } })).toThrow(RangeError);
    expect(() => renderer.resize("a", { target: "#missing", to: { width: 100, height: 100 } })).toThrow(/did not match/);
    expect(() => renderer.resize("a", { target: "[", to: { width: 100, height: 100 } })).toThrow(/valid CSS selector/);
    expect(() => renderer.resize("a", { target: "#resize-target", to: { width: 100, height: 100 }, duration: -1 })).toThrow(RangeError);
    expect(() => renderer.resize("a", { target: "#resize-target", to: { width: 100, height: 100 }, curvature: 2 })).toThrow(RangeError);
  });

  it("locks a target against another cursor but allows concurrent resizes on separate targets", () => {
    const { host, renderer } = setup(["a", "b"]);
    const one = addResizeTarget(host, "one"), two = addResizeTarget(host, "two");
    renderer.resize("a", { target: one, to: { width: 180, height: 120 } });
    expect(() => renderer.resize("b", { target: one, to: { width: 190, height: 130 } })).toThrow(/already being resized/);
    renderer.resize("b", { target: two, to: { width: 190, height: 130 } });
    expect(renderer.isResizing("a")).toBe(true);
    expect(renderer.isResizing("b")).toBe(true);
  });

  it("cancels and restores dimensions when the target is removed", () => {
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    renderer.resize("a", { target, to: { width: 200, height: 150 } });
    target.remove();
    expect(renderer.isResizing("a")).toBe(false);
    expect(target.style.width).toBe("100px");
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
  });

  it("cancels and restores dimensions when the owning cursor is removed", () => {
    const { manager, host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    renderer.resize("a", { target, to: { width: 200, height: 150 } });
    manager.remove("a");
    expect(target.style.width).toBe("100px");
    expect(renderer.isResizing("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
  });

  it("cancels all active resizes and removes frames when the renderer is destroyed", () => {
    const { host, renderer } = setup(["a", "b"]);
    const one = addResizeTarget(host, "one"), two = addResizeTarget(host, "two");
    renderer.resize("a", { target: one, to: { width: 200, height: 150 } });
    renderer.resize("b", { target: two, to: { width: 220, height: 160 } });
    renderer.destroy();
    expect(one.style.width).toBe("100px");
    expect(two.style.width).toBe("100px");
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
    expect(gsapState.timelines[0].kill).toHaveBeenCalled();
    expect(gsapState.timelines[1].kill).toHaveBeenCalled();
  });

  it("applies final dimensions immediately when reduced motion is active", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    const { host, renderer } = setup(["a"]);
    const target = addResizeTarget(host);
    expect(renderer.resize("a", { target, to: { width: 210, height: 155 } })).toBeUndefined();
    expect(target.style.width).toBe("210px");
    expect(target.style.height).toBe("155px");
    expect(renderer.isResizing("a")).toBe(false);
    expect(host.querySelector(".cursorbuild-resize-frame")).toBeNull();
    window.matchMedia = original;
  });
});
