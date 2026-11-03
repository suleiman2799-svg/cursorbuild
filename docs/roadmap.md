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
- [ ] Element resizing and positioning (implementation under review in PR #6)
- [x] Animated text insertion simulation with caret feedback and target locking

## Orchestration
- [x] Declarative scroll-driven construction scenes (PR #9)
- [x] Multi-cursor coordination and dependency/cancellation rules (PR #9)
- [ ] Responsive scene composition and reduced-motion strategy

## Ecosystem
- [ ] Reusable construction-effect components
- [ ] API reference and integration examples
- [ ] Accessibility and performance benchmarks
- [ ] Release automation

## Cinematic animation engine — implemented in PR #7 (open for review)
- [x] Directional text, image, and mask reveals
- [x] Section entrance, parallax, transitions, assembly, and staggered timelines
- [x] Configurable timing, reversible GSAP timelines, reduced-motion handling, and cleanup
- [x] Standalone framework-independent API and responsive demo

## Scroll-driven construction engine — implemented in PR #9
- [x] Independent section-based construction scenes and GSAP timelines
- [x] Configurable scroll boundaries, sequential/simultaneous actions, and progress tracking
- [x] Pause/resume, reverse-on-scroll-up, multiple scenes, and cleanup
- [x] Reduced-motion completion and responsive demo

## Multi-cursor coordination engine — implemented in PR #10
- [x] Parallel and sequential collaborator action groups
- [x] Explicit dependency graph with cycle and missing-dependency validation
- [x] Cursor-scoped action contexts and AbortSignal propagation
- [x] Await returned GSAP animations and Promises
- [x] Per-action, per-group, and engine-level cancellation
- [x] Configurable action start staggering
- [x] Failure propagation and sibling cancellation
- [x] Responsive demo using coordinated simultaneous drags