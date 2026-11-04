# CursorBuild

**CursorBuild** is an open-source, modular TypeScript toolkit for building visual website-construction scenes with multiple collaborator cursors. Its framework-independent core provides cursor rendering and animation, interaction simulations, multi-cursor orchestration, and optional visual-effect overlays.

> **Project status: active development.** The foundation, cursor rendering and motion, drag/drop and text insertion simulations, element resizing, cinematic animation, scroll-driven construction, Step 8 multi-cursor coordination, Step 9 advanced visual effects, and Step 10 responsive/performance improvements are implemented. Reusable presets, expanded examples, physical-device profiling, and release readiness remain future work. The npm packages are workspace packages in this repository; this README does not imply that they have been published to npm.

## Implemented functionality

- **Cursor rendering:** multiple named, coloured DOM cursors with container-relative coordinates, desktop/tablet/mobile visibility limits, an additional coarse-pointer cap, viewport/orientation updates, and reduced-motion support.
- **Movement and click feedback:** direct movement, curved natural paths and sequences, plus configurable press and ripple feedback.
- **Interaction simulations:** visual drag/drop with per-element locking, progressive text insertion into supported inputs, textareas, and contenteditable targets, and animated element resizing with eight handles and fixed opposite anchors.
- **Cinematic animations:** independent text/image/mask reveals, section entrances, parallax, transitions, assembly, staggered sequences, configurable timing, and reduced-motion handling.
- **Scroll-driven construction:** section-based scenes with scroll progress, sequencing, pause/resume, reverse playback, refresh, and scene cleanup.
- **Step 8 — Multi-cursor coordination:** independent cursor timelines, sequential or parallel actions, cross-cursor dependencies, group/timeline/action delays, individual and group cancellation, abort signals, and engine lifecycle cleanup.
- **Step 9 — Advanced visual effects:** optional highlights, selection boxes, alignment and snap guides, measurement lines, grid overlays, blueprint snapshots, SVG cursor trails, and construction progress/completion feedback. Effects support adaptive quality/performance profiles with configurable trail and blueprint limits.
- **Step 10 — Responsive/performance:** desktop, tablet, mobile and coarse-pointer visibility caps; viewport/orientation updates; adaptive visual-effect quality; bounded trail/blueprint workloads; and listener/frame cleanup.
- **Framework integration:** optional React provider and hooks; React is not a dependency of the core runtime.

These features are visual simulations. CursorBuild does not dispatch synthetic mouse, pointer, keyboard, beforeinput, or input events. Dragging does not implement native browser drag-and-drop, guide indicators do not perform snapping, and visual selection does not mutate application state.

## Technology stack

- **TypeScript** — framework-independent core
- **GSAP** — cursor and interaction animation timelines
- **ScrollTrigger** — scroll resource management
- **React** — optional provider and hooks
- **Vite** — demo application
- **Vitest + jsdom** — automated tests
- **npm workspaces** — monorepo management

## Repository structure

~~~text
apps/demo/                 Vite demonstration application
packages/core/             Framework-independent engine and DOM adapters
  src/animation/            GSAP animation manager
  src/coordination/         Multi-cursor coordination engine
  src/cursor/               Cursor registry, renderer, movement and interactions
  src/scroll/               ScrollTrigger manager
  src/sequence/             Sequential action runner
  src/visual-effects/       Optional visual effects manager
packages/react/             Optional React provider and hooks
docs/                       Architecture and development roadmap
.github/workflows/           CI workflow
~~~

## Installation

Requires **Node.js 20 or newer** and npm.

Clone the repository and install its workspace dependencies:

~~~bash
git clone https://github.com/suleiman2799-svg/cursorbuild.git
cd cursorbuild
npm install
~~~

The core and React packages are currently consumed as local npm workspaces. For a working example, start the demo:

~~~bash
npm run dev
~~~

This command builds the core and React workspaces, then starts the Vite demo. The root development server is intended for the repository demo, not a published-package install.

## Core usage

Import the core engine and its cursor stylesheet in a browser application:

~~~ts
import { CursorBuildEngine } from "@cursorbuild/core";
import "@cursorbuild/core/cursor-renderer.css";

const engine = new CursorBuildEngine();

engine.cursors.add({
  id: "designer",
  name: "Maya · Design",
  color: "#a78bfa"
});

const canvas = document.querySelector<HTMLElement>("#canvas")!;
const renderer = engine.mountCursors(canvas);

renderer.moveTo("designer", { x: 180, y: 120 });
renderer.moveNaturally("designer", { x: 420, y: 180 }, {
  duration: 1.1,
  ease: "power3.inOut",
  curvature: 0.2
});

// Dispose engine-owned renderers and resources when the scene is finished.
engine.destroy();
~~~

Coordinates are CSS pixels relative to the mounted container. Cursor overlays are pointer-transparent. The default visible cursor limits are 8 on desktop, 3 at widths up to 900px, and 2 at widths up to 600px. These limits and reduced-motion behaviour can be configured through `mountCursors(container, options)`.

### Movement and click feedback

Each cursor has its own movement and click timelines. Natural movement supports curved paths, configurable duration/easing, and sequences with pauses:

~~~ts
renderer.moveSequence("designer", [
  { to: { x: 180, y: 120 }, duration: 0.8 },
  { to: { x: 360, y: 240 }, pauseAfter: 0.35 },
  { to: { x: 520, y: 100 } }
], { pauseBetween: [0.15, 0.45] });

renderer.click("designer", {
  style: "ripple-press", // "ripple" | "press" | "ripple-press"
  duration: 0.36,
  rippleSize: 2.2,
  intensity: 0.75
});
~~~

The click API remains visual-only. Reduced-motion preferences are respected by default.

### Drag/drop and text insertion

Drag a contained element to a new container-relative top-left position:

~~~ts
renderer.drag("designer", {
  target: "#design-card", // selector or contained HTMLElement
  to: { x: 420, y: 260 },
  duration: 1.2
});

renderer.isDragging("designer");
renderer.stopDrag("designer"); // cancel and restore the original inline translate
~~~

Insert text progressively into a supported target:

~~~ts
renderer.typeText("designer", {
  target: "#hero-heading",
  text: "Welcome to CursorBuild",
  duration: 2.5,
  initialDelay: 0.2,
  mode: "replace" // "replace" | "append"
});

renderer.isTyping("designer");
renderer.stopTextInsertion("designer"); // cancel and restore original content
~~~

Text targets are text-like inputs (text, search, email, URL, telephone, or password), textareas, and elements with `contenteditable="true"`. Use `characterIntervalMs` instead of `duration` to set a per-character interval. Programmatic value changes do not emit input events; controlled framework inputs may therefore need a separate application-state update. Drag and text simulations do not dispatch browser input events.

## Step 8 — Multi-cursor coordination

The coordination engine is available as `engine.coordination`. It is independent of cursor rendering and accepts caller-provided asynchronous actions, so it can orchestrate any compatible animation or application operation.

~~~ts
const coordinator = engine.coordination;

const designer = coordinator.createTimeline("maya", [
  {
    id: "move-to-card",
    run: async ({ signal }) => {
      const animation = renderer.moveNaturally("maya", { x: 280, y: 180 });
      if (animation) await animation;
      if (signal.aborted) return;
    }
  },
  {
    id: "type-heading",
    run: async () => {
      const animation = renderer.typeText("maya", {
        target: "#card-title",
        text: "A shared idea",
        duration: 1.1
      });
      if (animation) await animation;
    }
  }
]); // sequential by default

const reviewer = coordinator.createTimeline("noah", [
  {
    id: "review-card",
    dependsOn: ["type-heading"],
    run: async () => {
      const animation = renderer.drag("noah", {
        target: "#review-card",
        to: { x: 420, y: 180 }
      });
      if (animation) await animation;
    }
  }
], { delay: 180 });

const group = coordinator.createGroup("hero-construction", [designer, reviewer]);
await group.run();

// Cancel one action or the whole group:
group.cancelAction("review-card");
coordinator.cancelGroup("hero-construction");
~~~

Cursor timelines run sequentially by default; pass `{ mode: "parallel" }` to allow independent actions on the same cursor to start together. Different cursor timelines can run concurrently. Explicit `dependsOn` action IDs coordinate work across cursors. Group, timeline, and action delays are measured in milliseconds.

An action receives `groupId`, `actionId`, `cursorId`, an `AbortSignal`, and an abort-aware `wait(milliseconds)` helper. Return or await an animation promise when later actions must wait for it to finish. Cancellation is cooperative: callbacks should observe the signal and settle promptly. A failed action cancels its siblings and causes the group's run promise to reject. Destroying the engine cancels its coordination groups.

## Step 9 — Advanced visual effects

Mount the optional effects layer independently of cursor rendering:

~~~ts
const effects = engine.mountVisualEffects(canvas, { gridSize: 24 });

const selection = effects.showSelectionBox("#hero-card", "Hero card");
const highlight = effects.highlight("#hero-title", {
  color: "#8b5cf6",
  opacity: 0.12
});

const removeGuides = effects.showGuides([
  { axis: "vertical", position: 320, label: "Center" },
  { axis: "horizontal", position: 180 }
]);
const removeSnapGuide = effects.showSnapGuide("vertical", 320, "Snapped");

const grid = effects.showGrid({ size: 24, opacity: 0.2 });
const blueprint = effects.setBlueprintMode(true);
effects.showMeasurement({ x: 20, y: 20 }, { x: 180, y: 100 }, "183px");
effects.showCursorTrail([
  { x: 12, y: 20 },
  { x: 70, y: 42 },
  { x: 140, y: 90 }
]);
effects.setProgress(0.65);
effects.complete();

// Handles and transient-effect callbacks can be cleaned up individually.
selection.destroy();
highlight.destroy();
removeGuides();
removeSnapGuide();
grid.destroy();
blueprint?.destroy();

// clear() removes all effects but leaves this manager reusable.
effects.clear();
effects.destroy();
~~~

Highlights and selection boxes return handles with `refresh()` and `destroy()`. Guides return cleanup callbacks; measurements and cursor trails return their created DOM elements. Grid and blueprint effects return handles. All coordinates use container-relative CSS pixels. Target geometry and blueprint bounds are snapshots: refresh handles or recreate blueprint mode after layout changes. `clear()` removes all active effects, including transient guides, measurements, and trails, while retaining the manager; `destroy()` also removes the overlay and restores the container's original inline positioning when the manager changed it. `engine.destroy()` disposes mounted effect managers automatically.

Effects are decorative and opt-in. They do not implement snapping, change application selection/state, intercept pointer input, or dispatch DOM events. Reduced-motion preference disables the progress-width transition by default.

## Step 10 — Responsive and performance optimisation

Cursor visibility is capped by viewport width and coarse-pointer input. The default limits remain 8 desktop, 3 tablet, and 2 mobile cursors; `touchMaxVisible` defaults to 2 and applies as an additional cap on touch/coarse-pointer devices:

~~~ts
const renderer = engine.mountCursors(canvas, {
  maxVisible: 8,
  tabletMaxVisible: 3,
  mobileMaxVisible: 2,
  touchMaxVisible: 2,
  respectReducedMotion: true
});
~~~

Visibility is recalculated on window resize, orientation changes, visual viewport resize, and coarse-pointer media-query changes. These listeners are removed when the renderer is destroyed.

Visual effects accept a performance profile:

~~~ts
const effects = engine.mountVisualEffects(canvas, {
  performanceMode: "auto", // "auto" | "quality" | "balanced" | "performance"
  maxTrailPoints: 64,
  maxBlueprintElements: 80
});
~~~

In `auto` mode, touch/coarse-pointer devices, small viewports, or devices reporting four or fewer CPU cores / 4 GB memory use the lighter `performance` profile; other devices use `balanced`. The auto profile is re-evaluated on viewport resize and coarse-pointer media-query changes, with recalculation coalesced to one animation-frame update; explicitly selected profiles remain fixed. The performance profile uses a coarser default grid, caps trails at 64 points and blueprint snapshots at 80 elements, and disables the progress-width transition. Balanced defaults are 256 trail points and 250 blueprint elements; quality defaults are 1024 and 1000. Explicit limits override profile defaults. Reduced-motion settings continue to take precedence over decorative transitions.

These are adaptive safeguards, not a substitute for profiling every browser/device combination. See the roadmap for remaining manual device profiling and browser-level visual regression work.

### Manual device verification

Before release, verify the following in real browsers (including at least one physical touch device):

- **Desktop + mouse:** use a wide viewport and confirm the configured desktop cursor cap.
- **Tablet + touch:** use a coarse-pointer device or browser device emulation and confirm `touchMaxVisible` applies independently of viewport width.
- **Phone + orientation:** test a narrow portrait viewport, rotate to landscape, and confirm visibility updates after the orientation change.
- **Viewport changes:** resize the browser and, where available, test the visual viewport while browser chrome or the on-screen keyboard changes the visible area.
- **Reduced motion:** enable the operating-system reduced-motion preference and confirm cursor movement/click effects and progress transitions follow the configured policy.
- **Performance profile:** render long trails and a page with many elements using `performanceMode: "performance"`; confirm the SVG trail and blueprint outline counts remain within configured limits.
- **Lifecycle:** repeatedly mount and destroy renderers/effect managers; confirm overlays disappear and no stale cursor nodes or resize/pointer listeners remain.

Automated tests cover the responsive caps, orientation event, frame coalescing, effect limits, and cleanup hooks. Physical-device profiling and browser-level visual regression have not yet been performed.

## Optional React integration

The React workspace exports `CursorBuildProvider`, `useCursorBuild()`, and `useCursors()`:

~~~tsx
import { CursorBuildProvider, useCursorBuild, useCursors } from "@cursorbuild/react";

function CursorStatus() {
  const engine = useCursorBuild();
  const cursors = useCursors();
  return <p>{cursors.length} collaborators</p>;
}

function App() {
  return (
    <CursorBuildProvider>
      <CursorStatus />
    </CursorBuildProvider>
  );
}
~~~

The provider creates and disposes the engine. The core package itself does not depend on React.

## Development commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Build core and React, then start the Vite demo |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Build core and React, then type-check core, React, and demo |
| `npm run build` | Build all workspaces that define a build script |

GitHub Actions runs tests, type checks, and builds for pushes to development branches and pull requests targeting `main`.

## Current roadmap

| Area | Status |
| --- | --- |
| Foundation, engine lifecycle, configuration, cursor registry, animation/scroll managers, action sequencing, React integration, demo and baseline tests | Complete |
| Cursor rendering, natural movement, click feedback, responsive visibility and reduced-motion handling | Implemented |
| Drag/drop and text insertion simulations | Implemented |
| Step 8 — multi-cursor coordination engine | Implemented |
| Step 6 — cinematic animation engine | Implemented |
| Step 7 — scroll-driven construction engine | Implemented |
| Step 9 — advanced visual effects | Implemented |
| Step 10 — responsive and performance optimisation | Implemented and merged into main |
| Element resizing and positioning (Step 5B) | Implemented and merged into main |

| Step 11 — reusable component and preset library | Planned |
| Step 12 — complete documentation and developer experience | Planned |
| Step 13 — demo website and playground | Planned |
| Step 14 — examples and integration | Planned |
| Step 15 — package and release readiness | Planned |

See [docs/architecture.md](docs/architecture.md) for module boundaries and [docs/roadmap.md](docs/roadmap.md) for the milestone checklist. Items marked planned are not represented as completed functionality.

## Contributing

Issues and pull requests are welcome. Keep the core framework-independent, preserve the visual-simulation boundaries, and add tests for new behaviour.

## License

MIT — see [LICENSE](LICENSE).
