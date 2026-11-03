# Architecture

CursorBuild is an npm-workspaces monorepo with a framework-independent runtime core.

- **@cursorbuild/core** owns configuration, engine lifecycle, cursor identity state, DOM cursor rendering, GSAP timelines, ScrollTrigger resources, and explicit action sequencing.
- **@cursorbuild/react** exposes an optional provider and hooks. The core itself does not import React.
- **apps/demo** is a Vite playground that exercises the public engine API.
- **docs** contains architecture and roadmap notes.

## Cursor rendering boundary

Cursor identities are registered with CursorManager. CursorRenderer subscribes to that registry and owns a non-interactive DOM overlay mounted inside a caller-supplied HTMLElement. The overlay establishes a container-relative coordinate space; moveTo(x, y) values are CSS pixels from its top-left corner.

The renderer owns its cursor DOM nodes, GSAP movement tweens, click-pulse timelines, reduced-motion media-query subscription, and resize listener. destroy() removes those resources and restores the container's original inline positioning when the renderer added relative positioning. CursorBuildEngine.mountCursors() tracks renderers so engine.destroy() disposes them too.

Cursor rendering is deliberately separate from identity state: consumers can use CursorManager without a DOM, while browser consumers can mount one or more renderers. The overlay and all descendants use pointer-events: none. Cursor clicks are visual feedback only and never dispatch synthetic clicks to page elements.

## Responsive and motion behaviour

Default visible cursor limits are 8 on desktop, 3 on tablet (up to 900px), and 2 on mobile (up to 600px). These limits can be overridden per renderer. The renderer follows prefers-reduced-motion when enabled: movement becomes immediate and click pulses are suppressed.

## Natural cursor movement

NaturalCursorMovementEngine is owned by CursorRenderer and exposed through `renderer.naturalMovement`, with convenience methods `moveNaturally()`, `moveSequence()`, and `stopNaturalMovement()`. It builds deterministic cubic Bezier arcs from the current container-relative position to each destination and animates a progress value with GSAP. Per-cursor timelines are isolated, allowing several cursors to move concurrently. Duration, GSAP easing, curvature, and inter-step pauses can be configured globally or per step.

The renderer remains responsible for writing positions to its cursor nodes. Starting a natural route cancels that cursor's existing direct movement tween; calling the legacy `moveTo()` cancels its natural route. Removing a cursor or destroying the renderer kills its natural timeline. If reduced motion becomes active during a route, the renderer completes the route immediately at its final destination. Coordinates are kept in the same container-relative CSS-pixel space used by the existing renderer, preserving its responsive visibility and layout behaviour.

## Extension approach

Keep DOM measurement and rendering at adapter boundaries, avoid global mutable state, and add deterministic tests for non-visual and DOM lifecycle logic. Presence transport, real collaboration networking, drag/drop, resizing, text insertion, and construction-scene authoring are future modules, not part of the current renderer.
