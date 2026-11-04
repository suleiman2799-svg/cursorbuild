# Development roadmap

This roadmap distinguishes implemented library capabilities from future product and release work. "Implemented" means the corresponding code and automated tests exist in the repository; it does not imply that the npm packages have been published.

## Foundation and core runtime — implemented
- [x] TypeScript core package and public exports
- [x] Configuration defaults and validation
- [x] Cursor identity registry with subscriptions
- [x] GSAP timeline and ScrollTrigger resource managers
- [x] Explicit sequential action runner
- [x] Optional React provider and hooks
- [x] Vite demonstration application and Vitest baseline

## Cursor rendering and motion — implemented
- [x] Multiple DOM cursor rendering with independent names and colours
- [x] Programmatic movement and natural curved paths
- [x] Movement sequences, easing, configurable durations, and pauses
- [x] Configurable click press/release and ripple feedback
- [x] Pointer-transparent overlay and lifecycle cleanup
- [x] Responsive cursor visibility caps and reduced-motion support

## Interaction simulations — implemented
- [x] Drag/drop simulation with per-cursor timelines and target locking
- [x] Progressive text insertion with caret feedback and target locking
- [x] Eight-handle element resizing
- [x] Opposite-edge/corner anchor preservation throughout resizing
- [x] Transform-aware resize compensation and exact inline-style restoration on cancellation
- [x] Target/cursor removal and renderer-destruction cleanup

## Step 6 — Cinematic animation engine — implemented
- [x] Directional text, image, and mask reveals
- [x] Section entrance animations
- [x] Configurable parallax offsets
- [x] Arbitrary transitions and element assembly
- [x] Staggered multi-target timelines
- [x] Reversible caller-controlled GSAP timelines
- [x] Reduced-motion completion and timeline cleanup

## Step 7 — Scroll-driven construction — implemented
- [x] Independent scroll-driven construction scenes
- [x] Configurable ScrollTrigger start/end positions
- [x] Normalized progress tracking and callbacks
- [x] Pause and resume at the current trigger position
- [x] Optional reverse playback
- [x] Multiple scenes with individual and engine-wide destruction
- [x] Reduced-motion completion and listener cleanup

## Step 8 — Multi-cursor coordination — implemented
- [x] Independent cursor timelines
- [x] Sequential and parallel action execution
- [x] Shared action groups and cross-cursor dependencies
- [x] Group, timeline, and action delays
- [x] Individual cancellation and explicit group cancellation
- [x] Abort signals, action/group state transitions, and lifecycle cleanup
- [x] Compatibility action-array coordinator with isolated individual cancellation

## Step 9 — Advanced visual effects — implemented
- [x] Optional selection boxes and element highlighting
- [x] Alignment guides and snap-guide indicators
- [x] Measurement indicators and grid overlays
- [x] Blueprint snapshots and cursor trails
- [x] Construction progress and completion feedback
- [x] Pointer-transparent overlay and engine lifecycle cleanup

## Step 10 — Responsive and performance optimisation — planned
- [ ] Validate desktop, tablet, mobile, and touch-device behaviour across the combined feature set
- [ ] Add explicit touch/coarse-pointer visibility and effect policies
- [ ] Profile animation/layout work and reduce avoidable layout reads/writes
- [ ] Review listener, observer, ScrollTrigger, and timeline lifecycles under repeated mount/destroy
- [ ] Add viewport/orientation regression tests and performance-oriented tests
- [ ] Publish manual device-testing guidance

## Later milestones — planned
- [ ] Step 11 — Reusable construction components and configurable presets
- [ ] Step 12 — Complete API reference, troubleshooting, and developer experience
- [ ] Step 13 — Expanded demo website and interactive playground
- [ ] Step 14 — Standalone vanilla TypeScript and React integration examples
- [ ] Step 15 — Package and release readiness audit

## Release constraint

No npm package has been published. Package publication and public release remain gated on explicit approval after the release-readiness milestone.
