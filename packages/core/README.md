# @cursorbuild/core

Framework-independent TypeScript engine for animated website-construction scenes.

## Install

```bash
npm install @cursorbuild/core
```

## Quick start

Import the core engine and its cursor stylesheet:

```ts
import { CursorBuildEngine } from "@cursorbuild/core";
import "@cursorbuild/core/cursor-renderer.css";

const engine = new CursorBuildEngine();
engine.cursors.add({
  id: "designer",
  name: "Designer",
  color: "#8b5cf6"
});

const canvas = document.querySelector<HTMLElement>("#canvas")!;
const renderer = engine.mountCursors(canvas);

renderer.moveNaturally("designer", { x: 240, y: 140 }, {
  duration: 1,
  ease: "power3.inOut"
});

// Dispose engine-owned renderers, timelines, scenes, and effects.
engine.destroy();
```

## Included systems

- Multiple named cursors, natural movement, and visual click feedback.
- Visual drag/drop, text insertion, and eight-handle element resizing.
- Independent cinematic text/image/mask reveals, section entrances, parallax, and staggered timelines.
- Scroll-driven construction scenes with progress, pause/resume, reverse playback, and cleanup.
- Multi-cursor action coordination with dependencies, cancellation, and abort signals.
- Optional selection/highlight overlays, guides, measurements, grids, blueprint snapshots, trails, and progress effects.
- Responsive cursor limits, coarse-pointer support, reduced-motion handling, and adaptive visual-effect profiles.

The simulations are visual. They do not dispatch synthetic pointer, keyboard, input, or native drag/drop events, and visual guides do not mutate application layout or state.

## Documentation

See the [CursorBuild repository README](https://github.com/suleiman2799-svg/cursorbuild#readme), [architecture notes](https://github.com/suleiman2799-svg/cursorbuild/blob/main/docs/architecture.md), and [development roadmap](https://github.com/suleiman2799-svg/cursorbuild/blob/main/docs/roadmap.md).

## License

MIT.
