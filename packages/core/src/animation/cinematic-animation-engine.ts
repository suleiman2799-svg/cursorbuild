import { gsap } from "gsap";

export type CinematicTarget = string | Element | readonly Element[];
export type RevealDirection = "left" | "right" | "top" | "bottom";

export interface CinematicAnimationOptions {
  duration?: number;
  ease?: string;
  delay?: number;
  stagger?: number;
}

export interface CinematicAnimationEngineOptions {
  respectReducedMotion?: boolean;
  defaults?: CinematicAnimationOptions;
}

export interface CinematicRevealOptions extends CinematicAnimationOptions {
  direction?: RevealDirection;
}

export interface CinematicEntranceOptions extends CinematicAnimationOptions {
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
}

export interface CinematicParallaxOptions extends CinematicAnimationOptions {
  distance?: number;
  axis?: "x" | "y";
}

export interface CinematicTransitionOptions extends CinematicAnimationOptions {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

export interface CinematicStaggerOptions extends CinematicAnimationOptions {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

/**
 * Framework-independent, DOM-targeted animation primitives.
 *
 * Returned GSAP timelines can be paused, reversed, seeked, or composed by the
 * caller. This engine is independent from CursorRenderer and can be used alone.
 */
export class CinematicAnimationEngine {
  private readonly active = new Map<gsap.core.Timeline, { targets: Element[]; finalVars: gsap.TweenVars }>();
  private readonly defaults: Required<CinematicAnimationOptions>;
  private readonly respectReducedMotion: boolean;
  private readonly mediaQuery?: MediaQueryList;
  private destroyed = false;

  constructor(options: CinematicAnimationEngineOptions = {}) {
    this.respectReducedMotion = options.respectReducedMotion ?? true;
    this.defaults = {
      duration: options.defaults?.duration ?? 0.8,
      ease: options.defaults?.ease ?? "power3.out",
      delay: options.defaults?.delay ?? 0,
      stagger: options.defaults?.stagger ?? 0
    };
    this.validateTiming(this.defaults);
    this.mediaQuery = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : undefined;
    this.mediaQuery?.addEventListener?.("change", this.handleMotionChange);
  }

  /** Reveal text by animating a directional CSS clip-path mask. */
  revealText(target: CinematicTarget, options: CinematicRevealOptions = {}): gsap.core.Timeline | undefined {
    const direction = options.direction ?? "left";
    return this.transition(target, {
      from: { clipPath: this.hiddenClip(direction), opacity: 0 },
      to: { clipPath: "inset(0 0 0 0)", opacity: 1 },
      ...options
    });
  }

  /** Reveal an image with a directional clip and a subtle scale settle. */
  revealImage(target: CinematicTarget, options: CinematicRevealOptions = {}): gsap.core.Timeline | undefined {
    const direction = options.direction ?? "left";
    return this.transition(target, {
      from: { clipPath: this.hiddenClip(direction), scale: 1.08, opacity: 0, transformOrigin: "center center" },
      to: { clipPath: "inset(0 0 0 0)", scale: 1, opacity: 1 },
      ...options
    });
  }

  /** Reveal any element through a configurable directional clip-path mask. */
  revealMask(target: CinematicTarget, options: CinematicRevealOptions = {}): gsap.core.Timeline | undefined {
    const direction = options.direction ?? "left";
    return this.transition(target, {
      from: { clipPath: this.hiddenClip(direction) },
      to: { clipPath: "inset(0 0 0 0)" },
      ...options
    });
  }

  /** Bring a section or element into view using configurable entrance values. */
  enterSection(target: CinematicTarget, options: CinematicEntranceOptions = {}): gsap.core.Timeline | undefined {
    return this.transition(target, {
      ...options,
      from: { y: 36, opacity: 0, ...(options.from ?? {}) },
      to: { y: 0, opacity: 1, ...(options.to ?? {}) }
    });
  }

  /** Animate a target along one axis to create a parallax-style offset. */
  parallax(target: CinematicTarget, options: CinematicParallaxOptions = {}): gsap.core.Timeline | undefined {
    const axis = options.axis ?? "y";
    const distance = options.distance ?? 48;
    if (!Number.isFinite(distance)) throw new RangeError("Parallax distance must be finite.");
    return this.transition(target, {
      from: {},
      to: { [axis]: -distance },
      ...options
    });
  }

  /** Animate arbitrary GSAP properties between caller-defined states. */
  transition(target: CinematicTarget, options: CinematicTransitionOptions): gsap.core.Timeline | undefined {
    this.assertActive();
    const targets = this.resolveTargets(target);
    if (!options || !options.from || !options.to || typeof options.from !== "object" || typeof options.to !== "object") {
      throw new TypeError("A transition requires from and to animation values.");
    }
    const timing = this.resolveTiming(options);
    return this.animate(targets, options.from, options.to, timing);
  }

  /** Assemble elements from a configurable starting state into their final layout. */
  assemble(target: CinematicTarget, options: CinematicEntranceOptions = {}): gsap.core.Timeline | undefined {
    return this.transition(target, {
      ...options,
      from: { opacity: 0, y: 24, scale: 0.94, ...(options.from ?? {}) },
      to: { opacity: 1, y: 0, scale: 1, ...(options.to ?? {}) }
    });
  }

  /** Reveal a collection with one configurable staggered timeline. */
  stagger(target: CinematicTarget, options: CinematicStaggerOptions): gsap.core.Timeline | undefined {
    return this.transition(target, options);
  }

  /** Create a caller-authored timeline that is tracked for engine cleanup. */
  createTimeline(options: gsap.TimelineVars = {}): gsap.core.Timeline {
    this.assertActive();
    const timeline = gsap.timeline(options);
    this.track(timeline, [], {});
    return timeline;
  }

  /** Kill and unregister one timeline. */
  kill(timeline: gsap.core.Timeline): void {
    if (!this.active.has(timeline)) return;
    timeline.kill();
    this.active.delete(timeline);
  }

  /** Kill every timeline owned by this engine. */
  killAll(): void {
    this.active.forEach((_record, timeline) => timeline.kill());
    this.active.clear();
  }

  /** Remove the media-query listener and release all timelines. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.mediaQuery?.removeEventListener?.("change", this.handleMotionChange);
    this.killAll();
  }

  private animate(
    targets: Element[],
    from: gsap.TweenVars,
    to: gsap.TweenVars,
    timing: Required<CinematicAnimationOptions>
  ): gsap.core.Timeline | undefined {
    if (this.isReducedMotion()) {
      gsap.set(targets, to);
      return undefined;
    }
    const timeline = gsap.timeline();
    this.track(timeline, targets, to);
    timeline.fromTo(targets, from, {
      ...to,
      duration: timing.duration,
      ease: timing.ease,
      delay: timing.delay,
      stagger: timing.stagger,
      immediateRender: false
    });
    return timeline;
  }

  private track(timeline: gsap.core.Timeline, targets: Element[], finalVars: gsap.TweenVars): void {
    this.active.set(timeline, { targets, finalVars });
    const cleanup = () => { this.active.delete(timeline); };
    timeline.eventCallback("onComplete", cleanup);
    timeline.eventCallback("onReverseComplete", cleanup);
    // GSAP invokes onInterrupt when callers kill or otherwise interrupt a
    // timeline. Unregister it so reduced-motion changes cannot finish stale work.
    timeline.eventCallback("onInterrupt", cleanup);
  }

  private resolveTargets(target: CinematicTarget): Element[] {
    if (typeof target === "string") {
      if (typeof document === "undefined") throw new Error("Selector targets require a browser document.");
      let matches: NodeListOf<Element>;
      try {
        matches = document.querySelectorAll(target);
      } catch {
        throw new TypeError("Cinematic target must be a valid CSS selector.");
      }
      if (matches.length === 0) throw new Error("Cinematic selector did not match any elements: " + target);
      return Array.from(matches);
    }
    const targets = Array.isArray(target) ? [...target] : [target as Element];
    if (targets.length === 0 || targets.some((item) => !item || typeof item !== "object" || !("nodeType" in item) || item.nodeType !== 1)) {
      throw new TypeError("Cinematic targets must be an Element or a non-empty array of Elements.");
    }
    return targets;
  }

  private resolveTiming(options: CinematicAnimationOptions): Required<CinematicAnimationOptions> {
    const timing = {
      duration: options.duration ?? this.defaults.duration,
      ease: options.ease ?? this.defaults.ease,
      delay: options.delay ?? this.defaults.delay,
      stagger: options.stagger ?? this.defaults.stagger
    };
    this.validateTiming(timing);
    return timing;
  }

  private validateTiming(timing: Required<CinematicAnimationOptions>): void {
    for (const key of ["duration", "delay", "stagger"] as const) {
      if (!Number.isFinite(timing[key]) || timing[key] < 0) {
        throw new RangeError(key + " must be finite and non-negative.");
      }
    }
    if (!timing.ease.trim()) throw new TypeError("ease must be a non-empty string.");
  }

  private hiddenClip(direction: RevealDirection): string {
    switch (direction) {
      case "right": return "inset(0 0 0 100%)";
      case "top": return "inset(100% 0 0 0)";
      case "bottom": return "inset(0 0 100% 0)";
      default: return "inset(0 100% 0 0)";
    }
  }

  private isReducedMotion(): boolean {
    return this.respectReducedMotion && !!this.mediaQuery?.matches;
  }

  private handleMotionChange = (event: MediaQueryListEvent): void => {
    if (!this.respectReducedMotion || !event.matches) return;
    this.active.forEach((record, timeline) => {
      if (record.targets.length) gsap.set(record.targets, record.finalVars);
      timeline.kill();
    });
    this.active.clear();
  };

  private assertActive(): void {
    if (this.destroyed) throw new Error("CinematicAnimationEngine has been destroyed.");
  }
}
