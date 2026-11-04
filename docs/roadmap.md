# Development roadmap

This roadmap distinguishes what is present on `main`, what has been implemented on an open feature branch, and what remains future work. An open PR is not considered merged into `main`.

## Foundation and core runtime — implemented on main
- [x] TypeScript core package and public exports
- [x] Configuration defaults and validation
- [x] Cursor identity registry and subscriptions
- [x] GSAP timeline and ScrollTrigger resource managers
- [x] Explicit sequential action runner
- [x] Optional React provider and hooks
- [x] Vite demo and Vitest baseline

## Cursor rendering and interaction — implemented on main
- [x] Multiple DOM cursor rendering and independent movement
- [x] Natural curved paths, easing, durations, and movement sequences
- [x] Configurable click press/release and ripple feedback
- [x] Responsive visibility caps and reduced-motion support
- [x] Drag/drop simulation with per-cursor timelines and target locking
- [x] Animated text insertion with caret feedback and target locking

## Step 6 — Cinematic animation engine
- [x] Implemented on the existing PR #7 feature branch; not yet merged into main

## Step 7 — Scroll-driven construction
- [x] Implemented on the existing PR #9 feature branch; not yet merged into main

## Step 8 — Multi-cursor coordination — implemented on main
- [x] Independent cursor timelines and shared groups
- [x] Sequential/parallel actions and cross-cursor dependencies
- [x] Configurable group, timeline, and action delays
- [x] Individual and group cancellation with abort signals
- [x] Action/group state transitions and lifecycle cleanup

## Step 9 — Advanced visual effects — implemented on main
- [x] Optional selection boxes, highlighting, alignment and snap guides
- [x] Measurement indicators, grid overlays, blueprint snapshots, and cursor trails
- [x] Construction progress/completion feedback
- [x] Pointer-transparent overlay and engine lifecycle cleanup

## Step 5B — Element resizing
- [x] Implemented on the existing PR #6 feature branch; not yet merged into main

## Step 10 — Responsive and performance optimisation — implemented on this branch
- [x] Desktop, tablet, and mobile cursor visibility limits
- [x] Additional coarse-pointer/touch visibility cap
- [x] Visibility updates on window resize, orientation changes, visual viewport resize, and pointer media-query changes
- [x] Adaptive visual-effects profiles: auto, quality, balanced, and performance
- [x] Configurable SVG trail-point and blueprint-element limits
- [x] Reduced-motion and performance-mode transition suppression
- [x] Regression tests for touch visibility, orientation changes, bounded trails, and blueprint limits
- [x] Manual device-testing guidance in README.md
- [ ] Physical-device performance profiling and browser-level visual regression

## Later milestones — planned
- [ ] Step 11 — Reusable construction components and configurable presets
- [ ] Step 12 — Complete API reference, troubleshooting, and developer experience
- [ ] Step 13 — Expanded demo website and interactive playground
- [ ] Step 14 — Standalone vanilla TypeScript and React integration examples
- [ ] Step 15 — Package and release readiness

## Release constraint

No npm package has been published. Package publication and public release remain gated on explicit approval after the release-readiness milestone.
