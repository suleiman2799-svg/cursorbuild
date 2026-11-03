# CursorBuild

**CursorBuild** is an open-source, modular foundation for scroll-driven, multi-cursor website construction animations.

> **Status: early development (v0.2.0).** The foundation and multiple-cursor rendering/movement primitives are implemented. Drag/drop, resizing, text insertion, and full cinematic construction sequences remain planned.

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
const renderer = engine.mountCursors(document.querySelector("#canvas")!);
renderer.moveTo("designer", { x: 180, y: 120 });
renderer.click("designer"); // visual pulse only; does not dispatch a DOM click
// engine.destroy() disposes renderers and GSAP resources.
~~~

Coordinates are CSS pixels relative to the mounted container. The overlay uses pointer-events: none and never captures input. Visible cursor count is capped by viewport width (desktop 8, tablet 3, mobile 2 by default). Reduced-motion preferences disable movement tweening and click pulses.

## Getting started

Requires Node.js 20+ and npm.

~~~bash
npm install
npm run dev
~~~

## Continuous integration

GitHub Actions runs the unit tests, TypeScript checks, and production build on pushes to development branches and pull requests targeting main.

## Development commands
~~~bash
npm run build
npm test
npm run test:watch
npm run typecheck
~~~

## Roadmap
1. **Foundation:** engine lifecycle, configuration, cursor registry, GSAP/ScrollTrigger managers, action sequencing, React integration, demo, and tests.
2. **Cursor rendering (current):** multiple DOM cursors, identity labels/colors, programmatic movement, click pulse, responsive visibility, and reduced-motion support.
3. **Interaction primitives:** natural movement profiles, richer click feedback, drag/drop, resizing, positioning, and animated text insertion.
4. **Orchestration:** declarative timelines, multi-cursor coordination, responsive scenes, and reduced-motion behaviour.
5. **Production readiness:** browser integration tests, accessibility/performance validation, API documentation, and release automation.

See docs/architecture.md and docs/roadmap.md for implementation boundaries and future work.

## Contributing
Issues and pull requests are welcome. Keep the core framework-independent and add tests for new behaviour.

## License
MIT — see LICENSE.
