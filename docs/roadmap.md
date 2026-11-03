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
- [x] Multi-cursor coordination and dependency/cancellation rules (PR #9)
- [ ] Responsive scene composition and reduced-motion strategy

## Ecosystem
- [ ] Reusable construction-effect components
- [ ] API reference and integration examples
- [ ] Accessibility and performance benchmarks
- [ ] Release automation

## Multi-cursor coordination engine — implemented in PR #9
- [x] Parallel and sequential collaborator action groups
- [x] Explicit dependency graph with cycle and missing-dependency validation
- [x] Cursor-scoped action contexts and AbortSignal propagation
- [x] Await returned GSAP animations and Promises
- [x] Per-action, per-group, and engine-level cancellation
- [x] Configurable action start staggering
- [x] Failure propagation and sibling cancellation
- [x] Responsive demo using coordinated simultaneous drags