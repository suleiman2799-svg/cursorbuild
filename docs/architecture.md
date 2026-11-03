# Architecture

CursorBuild is an npm-workspaces monorepo with a framework-independent runtime core.

- **@cursorbuild/core** owns configuration, engine lifecycle, cursor identity state, DOM cursor rendering, GSAP timelines, ScrollTrigger resources, and explicit action sequencing.
- **@cursorbuild/react** exposes an optional provider and hooks. The core itself does not import React.
- **apps/demo** is a Vite playground that exercises the public engine API.
- **docs** contains architecture and roadmap notes.

## Cursor rendering boundary

Cursor identities are registered with CursorManager. CursorRenderer subscribes to that registry and owns a non-interactive DOM overlay mounted inside a caller-supplied HTMLElement. The overlay establishes a container-relative coordinate space; moveTo(x, y) values are CSS pixels from its top-left corner.

The renderer owns cursor DOM nodes, GSAP movement tweens, per-cursor natural-movement timelines, per-cursor click-feedback timelines, its reduced-motion media-query subscription, and resize listener. destroy() removes those resources and restores the container's original inline positioning when the renderer added relative positioning. CursorBuildEngine.mountCursors() tracks renderers so engine.destroy() disposes them too.

The overlay and all cursor descendants use pointer-events: none. Cursor clicks are visual feedback only and never dispatch synthetic clicks to page elements. The ripple reuses the cursor's existing halo element; no transient DOM nodes are allocated for each click.

## Responsive and motion behaviour

Default visible cursor limits are 8 on desktop, 3 on tablet (up to 900px), and 2 on mobile (up to 600px). These limits can be overridden per renderer. The renderer follows prefers-reduced-motion when enabled: movement becomes immediate and click feedback is suppressed.

## Natural cursor movement

NaturalCursorMovementEngine is owned by CursorRenderer and exposed through renderer.naturalMovement, with convenience methods moveNaturally(), moveSequence(), and stopNaturalMovement(). It builds deterministic cubic Bezier arcs and animates progress with GSAP. Per-cursor timelines are isolated, allowing several cursors to move concurrently. Duration, GSAP easing, curvature, and inter-step pauses can be configured globally or per step.

Starting a natural route cancels that cursor's direct movement tween; calling the legacy moveTo() cancels its natural route. Removing a cursor or destroying the renderer kills its natural timeline.

## Click feedback

CursorRenderer.click(id, options?) preserves the original one-argument API and accepts optional per-click overrides. Renderer-wide defaults are configured through CursorRendererOptions.clickFeedback. The public ClickFeedbackOptions fields are:

- duration: total animation duration in seconds (default 0.32)
- rippleSize: final ripple scale multiplier (default 2.15)
- intensity: starting ripple opacity from 0 to 1 (default 0.72)
- style: ripple, press, or ripple-press (default ripple-press)

The press animation scales the existing SVG pointer down and back to its resting size. The ripple animates the existing halo element's scale and opacity. Both are composed on one GSAP timeline per cursor; separate cursors can animate simultaneously, while repeated clicks on the same cursor replace only that cursor's previous timeline. Completed timelines are removed from the renderer's active map. Removing a cursor, enabling reduced motion, or destroying the renderer kills active timelines and resets visual transforms.

## Extension approach

Keep DOM measurement and rendering at adapter boundaries, avoid global mutable state, and add deterministic tests for non-visual and DOM lifecycle logic. Presence transport, real collaboration networking, drag/drop, resizing, text insertion, and construction-scene authoring are future modules, not part of the current renderer.
