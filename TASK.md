TASK: Step 5B — Element Resizing Simulation

You are a senior TypeScript animation-library engineer working on:

Repository: "suleiman2799-svg/cursorbuild"

CURRENT STATE

The following milestones have been merged into "main":

1. Foundation
2. Multiple Cursor Rendering
3. Natural Cursor Movement
4. Rich Click Feedback
5. Drag-and-Drop Simulation
6. Text Insertion Simulation

Latest merged PR: #5.

OBJECTIVE

Implement a configurable element-resizing simulation in "CursorRenderer".

A collaborator cursor should approach an element, select it, grab a resize handle, and realistically resize it.

BRANCH

Create:

"feature/element-resizing-simulation"

Start from the latest "main".

Do not commit directly to "main".

REQUIRED API

Implement an API similar to:

renderer.resize("designer-1", {
  target: "#design-card",
  to: { width: 480, height: 280 },
  duration: 1.2,
  handle: "bottom-right"
});

renderer.isResizing("designer-1");
renderer.stopResize("designer-1");

Support:

- CSS selector and direct HTMLElement targets.
- Target width and height.
- Configurable duration and curvature.
- Resize handles: "top-left", "top-right", "bottom-left", "bottom-right", "top", "right", "bottom", "left".
- Cancellation.
- Independent cursors resizing different elements.

Adapt the API to existing project conventions where appropriate.

VISUAL BEHAVIOUR

1. Cursor approaches the target naturally.
2. Target displays a selection outline.
3. Eight resize handles become visible.
4. Cursor moves to the configured handle.
5. Handle visually responds to grabbing.
6. Element resizes progressively.
7. Cursor releases the handle.
8. Selection feedback disappears when appropriate.

The animation should look like a real designer working in a visual editor.

TECHNICAL REQUIREMENTS

- Preserve existing movement, click, drag and text insertion APIs.
- Preserve existing CSS transforms and positioning.
- Prevent conflicting operations on the same cursor or target.
- Support simultaneous resizing of different elements.
- Validate targets and dimensions.
- Prevent negative or invalid dimensions.
- Clean up timelines, handles, overlays and observers.
- Handle target removal, cursor removal and renderer destruction.
- Respect "prefers-reduced-motion".
- Ensure cancellation restores original dimensions and styles.
- Do not dispatch synthetic mouse or pointer events.
- Avoid unnecessary dependencies.

Be especially careful not to overwrite existing inline styles or transforms when resizing.

DEMO

Update the existing demo to include a resizable design card.

Include:

- A visible selection outline.
- Eight resize handles.
- A replay resize button.
- At least one cursor performing the resize.

Keep the demo consistent with CursorBuild's existing visual identity.

TESTING

Add tests for:

- CSS selector targets.
- HTMLElement targets.
- All eight resize handles.
- Width and height animation.
- Cancellation and restoration.
- Invalid dimensions.
- Target locking.
- Concurrent resizing.
- Target removal.
- Cursor removal.
- Renderer destruction.
- Reduced-motion behaviour.
- Cleanup of temporary elements and timelines.

DOCUMENTATION

Update:

- README.md
- docs/architecture.md
- docs/roadmap.md

Document the API and its limitations.

VALIDATION

Run:

- "npm test"
- "npm run typecheck"
- "npm run build"

Fix all failures.

PULL REQUEST

Open a PR targeting "main".

Title:

"feat: add cursor element resizing simulation"

Do not merge the PR.

Report:

1. Branch name.
2. PR URL.
3. Commit hash.
4. Files changed.
5. Tests passed.
6. Typecheck and build results.
7. Known limitations.

IMPORTANT:

- Work only on Step 5B.
- Do not implement cinematic animations.
- Do not break existing features from PRs #1–#5.
- Leave the PR open for independent review.
