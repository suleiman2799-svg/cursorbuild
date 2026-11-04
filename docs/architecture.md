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

Default visible cursor limits are 8 on desktop, 3 on tablet (up to 900px), and 2 on mobile (up to 600px). These limits can be overridden per renderer. A separate `touchMaxVisible` cap (default 2) applies when a coarse pointer or touch input is detected. The renderer recalculates visibility on window resize, orientation changes, visual viewport resize, and pointer-media-query changes. All listeners and media-query subscriptions are removed on destroy. The renderer follows prefers-reduced-motion when enabled: movement becomes immediate and click feedback is suppressed. Resize/orientation/visual-viewport and coarse-pointer updates are coalesced into one requestAnimationFrame visibility pass, and a pending frame is cancelled on destroy.

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

## Drag-and-drop simulation

Drag simulation is owned by CursorRenderer and uses the existing GSAP dependency. `drag(id, { target, to, duration, curvature, grabScale })` resolves a CSS selector within the mounted container or accepts a contained HTMLElement. The cursor first follows a cubic Bezier approach path to the target's center, compresses its SVG pointer and marks the target with a temporary visual grab attribute, then follows a second Bezier path while the target moves to the requested top-left coordinate.

The element is moved with the CSS individual `translate` property. Its `transform` property is not overwritten; the computed starting translate is composed with the drag offset, while the original inline translate is saved for cancellation. Successful release retains the destination. `stopDrag(id)` cancels and restores the original inline translate.

Each cursor owns one drag timeline, and a renderer-level element lock prevents two cursors from acquiring the same target. Separate cursors may drag separate elements concurrently. Drag start cancels that cursor's in-flight direct/natural movement and click feedback to avoid competing transforms. Removed targets are detected by a container MutationObserver and checked during progress; cursor removal and renderer destruction also cancel and restore active drags. The observer is disconnected on destroy.

Coordinates are CSS pixels relative to the mounted container's content origin, accounting for its border and scroll offset. With reduced motion enabled, a drag completes immediately at its destination. The simulation never dispatches synthetic mouse, pointer, or drag events and does not emulate native browser drag-and-drop data transfer.
## Text insertion simulation

CursorRenderer.typeText(id, options) composes the natural movement engine, existing visual click feedback, a per-cursor GSAP timeline, and a transient caret in the renderer overlay. The cursor follows a cubic Bezier approach to the target center; the target receives programmatic focus and the existing press animation; then a progress tween reveals Unicode code points at a configurable total duration or characterIntervalMs interval. The caret position is estimated from a temporary offscreen text span for inputs/textareas and a collapsed Range for contenteditable, with safe geometry fallbacks.

Supported targets are text-like input types (text, search, email, url, tel, password), textarea, and an element whose own contenteditable attribute is true. Selectors resolve only inside the mounted container. Contenteditable insertion is plain text: append preserves existing nodes; replace temporarily moves original child nodes into a DocumentFragment so cancellation can restore the original nodes without cloning them.

A renderer-level target lock prevents simultaneous cursors from typing into the same element, and a cursor can own only one text insertion at a time. Text insertion cancels that cursor's prior drag/movement and visual click timeline; starting a drag or a new movement also cancels typing. stopTextInsertion() restores the original value or child nodes, kills the typing/focus timelines, releases the target lock, and removes the caret. Target removal is observed; cursor removal and renderer destruction perform the same cleanup. If reduced motion becomes active, the current insertion is completed immediately and its caret is removed.

No synthetic keyboard, beforeinput, or input events are dispatched. Calling focus() can produce normal browser focus behaviour, but value changes are programmatic. Framework-controlled inputs (for example, React controlled inputs) may not update their component state; applications must update their own state separately or use uncontrolled elements. The simulation does not emulate physical keystrokes, IME composition, selection editing, or rich-text formatting.


## Multi-cursor coordination

`MultiCursorCoordinationEngine` is a framework-independent orchestration layer exposed as `engine.coordination`. It owns no DOM nodes, cursor renderer, GSAP timelines, scroll listeners, or framework state. A `CursorActionTimeline` is an immutable ordered or parallel track associated with one cursor ID. A `CoordinatedActionGroup` combines tracks into a dependency graph, allowing different cursors to work simultaneously while preserving each track's independent sequencing.

Sequential tracks add an implicit dependency on the preceding action. Parallel tracks do not add implicit ordering. Explicit `dependsOn` edges can coordinate different cursors; group creation validates missing dependencies, duplicate IDs, self-dependencies, and cycles before any action runs. Group, track, and per-action delays are abort-aware milliseconds. Ready actions are launched concurrently and wait for their dependencies to complete successfully.

Each action receives its group/action/cursor identifiers, an AbortSignal, and an abort-aware wait helper. Individual cancellation aborts only that action; dependent actions are cancelled rather than being allowed to run against incomplete prerequisites. Group cancellation and engine destruction propagate abort signals to active callbacks. A failed action cancels its siblings and rejects the group's run promise. Since JavaScript cannot forcibly stop arbitrary callback code, action implementations must cooperate with the supplied signal and return a promise that settles when their work ends.

The action callback is the integration seam for movement, clicking, dragging, text insertion, resizing, cinematic animations, and scroll-driven scenes. For GSAP-backed operations, return or await the timeline so the dependency graph reflects actual animation completion. Void-returning visual effects can use the context wait helper when subsequent actions need to be delayed. No imports from React, CursorRenderer, CinematicAnimationEngine, or ScrollConstructionEngine are required, so these systems remain independently usable and can evolve on separate feature branches.


## Advanced visual effects

VisualEffectsManager is an optional DOM adapter exposed by engine.mountVisualEffects(container, options). It owns one absolute-positioned overlay with pointer-events disabled and never adds layout-affecting styles to target elements. It is independent of CursorRenderer and can be mounted alone or alongside cursor rendering.

- highlight() and showSelectionBox() create geometry-aligned boxes and return handles with refresh() and destroy().
- showGuides() and showSnapGuide() draw vertical/horizontal alignment indicators and return cleanup callbacks.
- showMeasurement() draws a labelled distance line between container-relative points.
- showGrid() draws an opt-in CSS grid; setBlueprintMode(true) snapshots element bounds into an overlay.
- showCursorTrail() draws a pointer-transparent SVG polyline from supplied points.
- setProgress() and complete() update a visual progress bar.
- clear() removes active effects while preserving the manager; destroy() removes the overlay and restores the container's original inline position.

All effects are opt-in. Target geometry and blueprint bounds are snapshots; call handle.refresh() after layout changes or recreate blueprint mode. Effects are decorative: guide visuals do not implement snapping, selection does not change application state, and no synthetic pointer or keyboard events are emitted. Reduced-motion preference removes the progress-width transition. The `performanceMode` option supports `auto`, `quality`, `balanced`, and `performance`. Auto selects the lighter profile for coarse/touch pointers, narrow viewports, or devices reporting four or fewer CPU cores / 4 GB memory, and re-evaluates it on viewport resize or coarse-pointer media-query changes. The recalculation is coalesced to one animation-frame update; explicitly selected profiles remain fixed. Profiles adjust the default grid spacing, trail point cap, blueprint outline cap, and progress transition. Blueprint snapshots collect geometry before appending the completed outline layer, avoiding interleaved layout reads and DOM writes. `maxTrailPoints` and `maxBlueprintElements` allow explicit per-instance limits; trails are evenly downsampled while preserving endpoints, and blueprint snapshots stop after the configured number of visible element bounds. CursorBuildEngine tracks effect managers and disposes them on destroy().
