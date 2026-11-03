# CursorBuild

**CursorBuild** is an open-source, modular foundation for scroll-driven, multi-cursor website construction animations. It aims to make interfaces feel as though they are being collaboratively assembled in real time.

> **Status: foundation release (v0.1.0).** This repository establishes architecture and working primitives. It does not yet implement the full cinematic cursor, drag/drop, resizing, or text-insertion experience.

## Project goals

The long-term library will support independent cursor identities, realistic movement and clicks, simulated drag-and-drop, element manipulation, animated text insertion, coordinated construction sequences, scroll orchestration, responsive behaviour, and reusable components.

## Technology stack

- **TypeScript** — typed, framework-agnostic core
- **GSAP + ScrollTrigger** — animation timelines and scroll orchestration
- **React** — optional provider and hooks integration
- **Vite** — local development and demonstration app
- **Vitest** — unit testing
- **npm workspaces** — monorepo package management

## Repository structure

~~~text
apps/demo/                 Vite demonstration application
packages/core/             Framework-agnostic engine
  src/animation/           GSAP timeline lifecycle
  src/cursor/              Cursor identity registry
  src/scroll/               ScrollTrigger lifecycle
  src/sequence/             Sequential action runner
packages/react/            React provider and hooks
docs/                      Architecture and roadmap
~~~

## Getting started

Requires Node.js 20 or newer and npm.

~~~bash
npm install
npm run dev
~~~

Open the local URL printed by Vite (normally http://localhost:5173).

## Development commands

~~~bash
npm run build       # Build all workspace packages and the demo
npm test            # Run unit tests
npm run test:watch  # Run tests in watch mode
npm run typecheck   # Type-check core, React integration, and demo
~~~

## Using the core

~~~ts
import { CursorBuildEngine } from "@cursorbuild/core";
const engine = new CursorBuildEngine({ debug: true });
engine.cursors.add({ id: "designer-1", name: "Alex", color: "#9d8cff" });
engine.destroy();
~~~

For local development, install dependencies from the repository root. Published package distribution and CDN/UMD builds are future release tasks.

## Development roadmap

1. **Foundation:** engine lifecycle, configuration, cursor registry, GSAP/ScrollTrigger managers, action sequencing, React integration, demo, and tests.
2. **Interaction primitives:** cursor rendering, natural pointer movement, click feedback, drag/drop, resize, positioning, and text insertion.
3. **Orchestration:** declarative timelines, multi-cursor coordination, responsive scenes, and reduced-motion behaviour.
4. **Reusable effects:** composable construction components and polished examples.
5. **Production readiness:** browser integration tests, accessibility/performance validation, API documentation, and release automation.

See docs/architecture.md and docs/roadmap.md for details.

## Contributing

Issues and pull requests are welcome. Keep modules focused, preserve framework independence in the core, and add tests for new behaviour.

## License

MIT — see LICENSE.
