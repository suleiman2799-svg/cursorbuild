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
- [ ] Element resizing and positioning (implementation is under review in PR #6)
- [x] Animated text insertion simulation with caret feedback and target locking

## Orchestration
- [ ] Declarative timelines and reusable scroll scenes
- [ ] Multi-cursor coordination and conflict rules
- [ ] Responsive scene composition and reduced-motion strategy

## Ecosystem
- [ ] Reusable construction-effect components
- [ ] API reference and integration examples
- [ ] Accessibility and performance benchmarks
- [ ] Release automation

## Cinematic animation engine — implemented in PR #7
- [x] Directional text, image, and clip-mask reveals
- [x] Configurable section entrance and element assembly animations
- [x] Axis-based parallax tweens and arbitrary smooth transitions
- [x] Staggered multi-element timelines
- [x] Configurable duration, easing, delay, and stagger
- [x] Reversible GSAP timelines and explicit lifecycle cleanup
- [x] Reduced-motion immediate completion and active-animation settlement
- [x] Standalone framework-independent API and engine-owned instance
- [x] Responsive demo showcase

## Remaining milestones
- [ ] Scroll-driven construction scenes
- [ ] Multi-cursor coordination
- [ ] Advanced configurable visual effects
- [ ] Responsive/performance profiling and browser-level validation
- [ ] Reusable presets, complete developer docs, playground, and integration examples
- [ ] Release readiness (no package publication without explicit approval)