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


## Element resizing simulation

CursorRenderer.resize(id, options) is implemented in the renderer alongside drag and text insertion. It resolves a selector only inside the mounted container or accepts a contained HTMLElement, validates positive finite dimensions, and computes CSS width/height values that correspond to the requested rendered box size (including the target's box-sizing, padding, and borders).

A per-cursor GSAP timeline first moves the cursor along a cubic Bezier approach path to the selected handle, then interpolates width and height while keeping the cursor attached to that handle. Edge handles modify only their corresponding axis (top/bottom: height; left/right: width); corner handles modify both dimensions. A temporary selection frame and eight handle nodes are rendered in the existing pointer-transparent overlay. The target itself is not assigned transforms, positioning, outline, or box-shadow styles; existing transforms and positioning therefore remain unchanged. The frame is removed on release or cancellation.

The renderer maintains a target lock and one active resize per cursor. Different cursors may resize different targets simultaneously. Resize conflicts with drag and text insertion on the same target; starting another movement/interaction on that cursor cancels its current resize. stopResize() restores the exact original inline width and height, while successful completion retains the requested dimensions. Target removal, cursor removal, renderer destruction, and reduced-motion changes release resources and locks. Reduced motion completes the dimensions immediately. No synthetic mouse or pointer events are emitted.

Handle anchoring is calculated from the element's untransformed CSS border-box dimensions. Top and left handles apply the inverse size delta through the CSS individual translate property, preserving the opposite edge/corner while leaving the transform property unchanged. Existing translate components are composed with the temporary offset; cancellation restores the exact original inline translate, width, and height. The simulation does not provide snapping, min/max constraints, aspect-ratio locking, responsive breakpoint rules, or editor-specific layout semantics. Dimensions are CSS pixels; normal browser layout and CSS constraints may affect the final measured box.
