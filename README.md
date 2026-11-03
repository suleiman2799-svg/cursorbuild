# CursorBuild

**CursorBuild** is an open-source, modular foundation for scroll-driven, multi-cursor website construction animations.

> **Status: early development (v0.3.0).** The foundation, multiple-cursor rendering, natural movement, configurable visual click feedback, and drag/drop simulation are implemented. Text insertion simulation is now implemented; element resizing and full cinematic construction sequences remain planned.

## Technology stack
- **TypeScript** — framework-agnostic core
- **GSAP + ScrollTrigger** — animation timelines and scroll orchestration
- **React** — optional provider and hooks
- **Vite** — demo application
- **Vitest** — unit tests
- **npm workspaces** — monorepo management

## Repository structure
~~~text
apps/demo/                 Vite demonstration application
packages/core/             Framework-agnostic engine
  src/animation/            GSAP timeline manager
  src/cursor/               Cursor registry, renderer, and tests
  src/scroll/               ScrollTrigger manager
  src/sequence/             Action sequencing
packages/react/             React provider and hooks
docs/                       Architecture and roadmap
~~~

## Multiple cursor rendering

The core can render collaborator cursors without React. Import the stylesheet, register identities, and mount a renderer on the element that defines the coordinate space:

~~~ts
import { CursorBuildEngine } from "@cursorbuild/core";
import "@cursorbuild/core/cursor-renderer.css";

const engine = new CursorBuildEngine();
engine.cursors.add({ id: "designer", name: "Maya · Design", color: "#a78bfa" });
const renderer = engine.mountCursors(document.querySelector<HTMLElement>("#canvas")!);
renderer.moveTo("designer", { x: 180, y: 120 });
renderer.click("designer"); // visual feedback only; never dispatches a DOM click
// engine.destroy() disposes renderers and GSAP resources.
~~~

Coordinates are CSS pixels relative to the mounted container. The overlay and cursor elements use pointer-events: none and never capture input. Visible cursor count is capped by viewport width (desktop 8, tablet 3, mobile 2 by default).

## Natural cursor movement

The renderer exposes natural movement without changing the existing `moveTo()` API. Each cursor gets its own GSAP timeline.

~~~ts
renderer.moveNaturally("designer", { x: 420, y: 180 }, {
  duration: 1.1, ease: "power3.inOut", curvature: 0.2
});
renderer.moveSequence("designer", [
  { to: { x: 180, y: 120 }, duration: 0.8 },
  { to: { x: 360, y: 240 }, pauseAfter: 0.35 },
  { to: { x: 520, y: 100 } }
], { pauseBetween: [0.15, 0.45] });
renderer.stopNaturalMovement("designer");
~~~

Curvature ranges from 0 (straight) to 1 (strong arc). Pauses accept seconds or a [minimum, maximum] range. Coordinates remain container-relative CSS pixels.

## Configurable click feedback

`click()` remains backward compatible: `renderer.click("designer")` plays the default press-and-release plus ripple animation. Configure renderer-wide defaults or override them for an individual click:

~~~ts
const renderer = engine.mountCursors(canvas, {
  clickFeedback: {
    duration: 0.36,       // total animation time, seconds
    rippleSize: 2.2,      // final scale multiplier
    intensity: 0.75,      // ripple opacity, 0–1
    style: "ripple-press" // "ripple" | "press" | "ripple-press"
  }
});

renderer.click("designer");
renderer.click("designer", { style: "ripple", rippleSize: 2.8 });
renderer.click("designer-2", { style: "press", duration: 0.24 });
~~~

Defaults are 0.32 seconds, ripple scale 2.15, intensity 0.72, and combined press/ripple style. A press compresses and releases the SVG pointer; a ripple animates the existing halo node, so no temporary DOM elements are created. Each cursor owns an independent click timeline. A new click replaces only that same cursor's active click animation. Click feedback is visual only and never triggers page interaction.

When `prefers-reduced-motion: reduce` is active and `respectReducedMotion` is enabled (the default), click animations are suppressed and movement snaps to its destination. Set `respectReducedMotion: false` only when your application has an explicit alternative accessibility strategy.

## Getting started

Requires Node.js 20+ and npm.

~~~bash
npm install
npm run dev
~~~

## Continuous integration

GitHub Actions runs unit tests, TypeScript checks, and the production build on pushes to development branches and pull requests targeting main.

## Development commands
~~~bash
npm run build
npm test
npm run test:watch
npm run typecheck
~~~

## Roadmap
1. **Foundation:** engine lifecycle, configuration, cursor registry, GSAP/ScrollTrigger managers, action sequencing, React integration, demo, and tests.
2. **Cursor rendering and motion (current):** multiple DOM cursors, direct and curved movement, configurable easing/duration, click press/ripple feedback, responsive visibility, and reduced-motion support.
3. **Interaction primitives:** drag/drop, resizing, positioning, and animated text insertion.
4. **Orchestration:** declarative timelines, multi-cursor coordination, responsive scenes, and reduced-motion behaviour.
5. **Production readiness:** browser integration tests, accessibility/performance validation, API documentation, and release automation.

See docs/architecture.md and docs/roadmap.md for implementation boundaries and future work.

## Contributing

Issues and pull requests are welcome. Keep the core framework-independent and add tests for new behaviour.

## License

MIT — see LICENSE.

## Drag-and-drop simulation

`drag()` makes a cursor approach an element, visually grab it, and animate it to a new container-relative position. Targets can be CSS selectors or `HTMLElement` references contained by the mounted container:

~~~ts
renderer.drag("designer", {
  target: "#design-card",
  to: { x: 420, y: 260 },
  duration: 1.2,
  curvature: 0.18,
  grabScale: 0.82
});

renderer.isDragging("designer"); // true while the operation is active
renderer.stopDrag("designer");   // cancel and restore the original inline translate
~~~

`duration` defaults to 1.2 seconds; `curvature` defaults to 0.16 (0–1), and `grabScale` defaults to 0.82 (greater than 0 and at most 1). The destination is the element's top-left position relative to the mounted container's content origin. The renderer animates the CSS individual `translate` property, preserving the element's existing `transform`; successful drops retain the new position. Cancellation restores the original inline `translate` value.

Different cursors can drag different elements concurrently. An element is locked to one cursor until release or cancellation. Removed targets, cursor removal, and renderer destruction cancel the operation and release its lock. Reduced-motion mode skips the animation and places the element at its destination immediately. Dragging is a visual simulation only: CursorBuild does not dispatch browser mouse or pointer events, and it does not make arbitrary elements natively draggable.
## Text insertion simulation

The typeText() API moves a cursor naturally to a supported text target, focuses it with visual press feedback, then reveals text progressively beside a blinking caret:

~~~ts
renderer.typeText("designer", {
  target: "#hero-heading", // CSS selector or HTMLElement
  text: "Welcome to CursorBuild",
  duration: 2.5,            // typing phase, seconds
  initialDelay: 0.2,        // pause before the first character
  mode: "replace"           // "replace" | "append"
});

renderer.isTyping("designer");          // true while active
renderer.stopTextInsertion("designer"); // cancel and restore original content
~~~

Use characterIntervalMs instead of duration to specify a per-character interval in milliseconds. Duration defaults to 1.8 seconds, initialDelay to 0.12 seconds, and mode to replace. Targets must be contained by the mounted container and must be a text-like input (text, search, email, URL, telephone, or password), textarea, or [contenteditable="true"] element. Contenteditable insertion is plain text; replace mode temporarily detaches existing child nodes and restores them if cancelled.

Typing is a visual DOM simulation. CursorBuild focuses the target and updates its value/text progressively, but does not dispatch keyboard, beforeinput, or input events. **Controlled React/Vue/etc. inputs may not synchronize their framework state** with these programmatic value changes; use an application callback/state update or an uncontrolled input for framework-managed forms. Cancellation restores the original value/content and removes the temporary caret. Removed targets, cursor removal, renderer destruction, and reduced-motion preferences are handled automatically. The caret and cursor use the existing overlay; no new dependency is required.

## Scroll-driven construction scenes

Use the engine's construction API to bind an independent GSAP timeline to a page section. The core remains framework-independent, and scenes can be used without mounting cursor overlays:

~~~ts
const engine = new CursorBuildEngine();

const heroScene = engine.construction.createScene(
  "hero",
  {
    trigger: "#hero",
    start: "top 80%",
    end: "bottom 20%",
    reverse: true,
    onProgress: (progress) => console.log("Hero construction:", progress)
  },
  (timeline) => {
    timeline.from("#hero h1", { y: 36, opacity: 0, duration: 0.7 });
    timeline.from("#hero p", { y: 20, opacity: 0, duration: 0.45 }, "<0.15");
    timeline.from("#hero img", { scale: 0.92, opacity: 0, duration: 0.8 }, 0);
  }
);

// Scene controls:
heroScene.pause();
heroScene.resume();
heroScene.refresh();
heroScene.destroy();

// Or let engine.destroy() clean up every scene.
~~~

Each scene has its own ScrollTrigger and paused GSAP timeline. Scroll progress seeks the timeline from 0 to 1; reverse: false keeps progress from decreasing when the visitor scrolls backwards. Reduced-motion preference completes the scene immediately by default; set respectReducedMotion: false only when your application provides an appropriate alternative. Use GSAP timeline positions to compose sequential and simultaneous work. start and end accept ScrollTrigger expressions, and onProgress receives normalized progress. Call engine.construction.refresh() after application layout changes that affect trigger measurements. Destroy individual scenes with destroyScene(id) or dispose all scenes through engine.destroy().
