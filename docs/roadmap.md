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
- [ ] Element resizing and positioning (implementation in PR #6 under review)
- [x] Animated text insertion simulation with caret feedback and target locking

## Orchestration
- [x] Declarative scroll-driven construction scenes (PR #8)
- [ ] Multi-cursor coordination and conflict rules
- [ ] Responsive scene composition and reduced-motion strategy

## Ecosystem
- [ ] Reusable construction-effect components
- [ ] API reference and integration examples
- [ ] Accessibility and performance benchmarks
- [ ] Release automation

## Cinematic animation engine — implemented in PR #7 (open for review)
- [x] Directional text, image, and mask reveals
- [x] Section entrance, parallax, transitions, assembly, and staggered timelines
- [x] Configurable timing, reverse playback, reduced-motion handling, and cleanup
- [x] Standalone framework-independent API and responsive demo

## Scroll-driven construction engine — implemented in PR #8
- [x] Independent section-based construction scenes
- [x] Configurable ScrollTrigger start/end boundaries and scrub smoothing
- [x] Sequential and overlapping timeline steps
- [x] Scroll progress callbacks and progress inspection
- [x] Pause, resume, reverse-on-scroll-up, and per-scene cancellation
- [x] Multiple independently managed scenes
- [x] Reduced-motion immediate settlement and active-scene cleanup
- [x] Engine lifecycle integration and responsive demo scene

## Remaining milestones
- [ ] Multi-cursor coordination engine
- [ ] Advanced configurable visual effects
- [ ] Responsive/performance profiling and browser-level validation
- [ ] Reusable presets, complete developer docs, playground, and integration examples
- [ ] Release readiness (no package publication without explicit approval)