# Development roadmap

## Foundation — complete
- [x] TypeScript core package and public exports
- [x] Configuration defaults and validation
- [x] Cursor identity registry with subscriptions
- [x] GSAP timeline and ScrollTrigger resource managers
- [x] Explicit sequential action runner
- [x] React provider and hooks
- [x] Vite demo and Vitest baseline

## Cursor rendering — current
- [x] Multiple DOM cursor rendering with individual names and colors
- [x] Programmatic independent movement using GSAP
- [x] Natural curved cursor paths, easing, configurable durations, and optional pauses
- [x] Configurable click press/release and ripple feedback
- [x] Pointer-transparent overlay and lifecycle cleanup
- [x] Responsive visibility caps and reduced-motion support
- [x] Demo with three animated identities and add/remove controls
- [ ] Browser-level visual regression and performance profiling

## Interaction primitives
- [x] Configurable drag/drop simulation with per-cursor timelines and element locking
- [ ] Element resizing and positioning
- [x] Animated text insertion simulation with caret feedback and target locking

## Orchestration
- [ ] Declarative timelines and reusable scroll scenes
- [x] Multi-cursor coordination engine: independent cursor timelines, parallel/sequential groups, cross-cursor dependencies, delays, cancellation, and lifecycle cleanup (Step 8 PR)
- [ ] Responsive scene composition and reduced-motion strategy

## Ecosystem
- [ ] Reusable construction-effect components
- [ ] API reference and integration examples
- [ ] Accessibility and performance benchmarks
- [ ] Release automation


## Step 9 — Advanced visual effects
- [x] Optional selection boxes and element highlighting
- [x] Alignment guides and snap-guide indicators
- [x] Measurement indicators and grid overlays
- [x] Blueprint snapshots and cursor trails
- [x] Construction progress and completion feedback
- [x] Pointer-transparent overlay and engine lifecycle cleanup
- [x] Automated tests and API documentation

## Remaining milestones
- [ ] Step 10 — Responsive and performance optimisation
- [ ] Step 11 — Reusable component and preset library
- [ ] Step 12 — Complete documentation and developer experience
- [ ] Step 13 — Demo website and playground
- [ ] Step 14 — Examples and integration
- [ ] Step 15 — Package and release readiness
