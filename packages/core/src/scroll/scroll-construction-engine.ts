import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScrollTrigger as ScrollTriggerInstance } from "gsap/ScrollTrigger";

export type ScrollConstructionTarget = string | Element | readonly Element[];
export type ScrollTriggerTarget = string | Element;

export interface ScrollConstructionStep {
  id: string;
  target: ScrollConstructionTarget;
  /** Optional starting properties. Omit to animate from the current rendered state. */
  from?: gsap.TweenVars;
  to: gsap.TweenVars;
  duration?: number;
  /** GSAP timeline position. Reuse a position such as "<" to run steps together. */
  position?: string | number;
}

export interface ScrollConstructionSceneOptions {
  trigger: ScrollTriggerTarget;
  steps: readonly ScrollConstructionStep[];
  start?: string | number;
  end?: string | number;
  /** true/number ties progress to scroll; false uses toggle actions. */
  scrub?: boolean | number;
  /** When scrub is false, play in reverse when the trigger is entered backwards. */
  reverseOnScrollUp?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ScrollConstructionScene {
  readonly id: string;
  readonly timeline: gsap.core.Timeline;
  readonly trigger?: ScrollTriggerInstance;
  pause(): void;
  resume(): void;
  progress(): number;
  kill(): void;
}

interface SceneRecord {
  timeline: gsap.core.Timeline;
  trigger?: ScrollTriggerInstance;
  scrub: boolean | number;
  settled: boolean;
  handle?: ScrollConstructionScene;
}

let pluginRegistered = false;

/**
 * Builds configurable GSAP timelines controlled by page scroll position.
 * Scene timelines are independent; no cursor renderer or React dependency is required.
 */
export class ScrollConstructionEngine {
  private readonly scenes = new Map<string, SceneRecord>();
  private readonly mediaQuery?: MediaQueryList;
  private destroyed = false;

  constructor(private readonly respectReducedMotion = true) {
    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }
    this.mediaQuery = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : undefined;
    this.mediaQuery?.addEventListener?.("change", this.handleMotionChange);
  }

  /** Create one independently controlled construction scene. */
  createScene(id: string, options: ScrollConstructionSceneOptions): ScrollConstructionScene {
    this.assertActive();
    if (!id.trim()) throw new Error("A construction scene id is required.");
    if (this.scenes.has(id)) throw new Error("Construction scene already exists: " + id);
    if (!options || !Array.isArray(options.steps) || options.steps.length === 0) {
      throw new TypeError("A construction scene requires at least one step.");
    }
    const trigger = this.resolveTrigger(options.trigger);
    const scrub = options.scrub ?? true;
    if (typeof scrub === "number" && (!Number.isFinite(scrub) || scrub < 0)) {
      throw new RangeError("Scene scrub must be true, false, or a finite non-negative number.");
    }
    if (options.start !== undefined && typeof options.start !== "string" && !Number.isFinite(options.start)) {
      throw new TypeError("Scene start must be a string or finite number.");
    }
    if (options.end !== undefined && typeof options.end !== "string" && !Number.isFinite(options.end)) {
      throw new TypeError("Scene end must be a string or finite number.");
    }

    const stepIds = new Set<string>();
    const resolvedSteps = options.steps.map((step) => {
      if (!step || !step.id?.trim()) throw new Error("Every construction step needs an id.");
      if (stepIds.has(step.id)) throw new Error("Duplicate construction step id: " + step.id);
      stepIds.add(step.id);
      if (!step.to || typeof step.to !== "object") throw new TypeError("Construction step " + step.id + " requires a to state.");
      const duration = step.duration ?? 0.6;
      if (!Number.isFinite(duration) || duration < 0) throw new RangeError("Step duration must be finite and non-negative.");
      return { step, targets: this.resolveTargets(step.target), duration };
    });

    const timeline = gsap.timeline();
    resolvedSteps.forEach(({ step, targets, duration }) => {
      const vars = { ...step.to, duration };
      if (step.from) {
        if (step.position === undefined) timeline.fromTo(targets, step.from, vars);
        else timeline.fromTo(targets, step.from, vars, step.position);
      } else if (step.position === undefined) {
        timeline.to(targets, vars);
      } else {
        timeline.to(targets, vars, step.position);
      }
    });

    const record = {
      timeline,
      scrub,
      settled: false
    };
    const handle: ScrollConstructionScene = {
      id,
      timeline,
      get trigger() { return record.trigger; },
      pause: () => this.pauseScene(id),
      resume: () => this.resumeScene(id),
      progress: () => timeline.progress(),
      kill: () => this.killScene(id)
    };
    record.handle = handle;
    this.scenes.set(id, record);

    if (this.isReducedMotion()) {
      timeline.progress(1).pause();
      record.settled = true;
      options.onProgress?.(1);
      return handle;
    }

    record.trigger = ScrollTrigger.create({
      trigger,
      animation: timeline,
      start: options.start ?? "top 80%",
      end: options.end ?? "bottom 20%",
      scrub,
      ...(scrub === false
        ? { toggleActions: options.reverseOnScrollUp === false ? "play none none none" : "play reverse play reverse" }
        : {}),
      onUpdate: (self: ScrollTriggerInstance) => options.onProgress?.(self.progress)
    });
    return handle;
  }

  getScene(id: string): ScrollConstructionScene | undefined {
    return this.scenes.get(id)?.handle;
  }

  pauseScene(id: string): void {
    const record = this.scenes.get(id);
    if (!record || record.settled) return;
    if (record.scrub !== false) record.trigger?.disable();
    record.timeline.pause();
  }

  resumeScene(id: string): void {
    const record = this.scenes.get(id);
    if (!record || record.settled) return;
    record.timeline.resume();
    record.trigger?.enable();
  }

  killScene(id: string): void {
    const record = this.scenes.get(id);
    if (!record) return;
    record.trigger?.kill();
    record.timeline.kill();
    this.scenes.delete(id);
  }

  killAll(): void {
    [...this.scenes.keys()].forEach((id) => this.killScene(id));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.mediaQuery?.removeEventListener?.("change", this.handleMotionChange);
    this.killAll();
  }

  private resolveTrigger(target: ScrollTriggerTarget): Element {
    if (typeof target !== "string") {
      if (!target || typeof target !== "object" || !("nodeType" in target) || target.nodeType !== 1) {
        throw new TypeError("Scene trigger must be an Element or CSS selector.");
      }
      return target;
    }
    if (typeof document === "undefined") throw new Error("Selector triggers require a browser document.");
    let element: Element | null;
    try {
      element = document.querySelector(target);
    } catch {
      throw new TypeError("Construction scene trigger must be a valid CSS selector.");
    }
    if (!element) throw new Error("Construction scene trigger did not match: " + target);
    return element;
  }

  private resolveTargets(target: ScrollConstructionTarget): Element[] {
    if (typeof target === "string") {
      if (typeof document === "undefined") throw new Error("Selector targets require a browser document.");
      let matches: NodeListOf<Element>;
      try {
        matches = document.querySelectorAll(target);
      } catch {
        throw new TypeError("Construction step target must be a valid CSS selector.");
      }
      if (matches.length === 0) throw new Error("Construction step selector did not match: " + target);
      return Array.from(matches);
    }
    const targets = Array.isArray(target) ? [...target] : [target as Element];
    if (targets.length === 0 || targets.some((item) => !item || typeof item !== "object" || !("nodeType" in item) || item.nodeType !== 1)) {
      throw new TypeError("Construction step targets must be an Element or a non-empty array of Elements.");
    }
    return targets;
  }

  private isReducedMotion(): boolean {
    return this.respectReducedMotion && !!this.mediaQuery?.matches;
  }

  private handleMotionChange = (event: MediaQueryListEvent): void => {
    if (!this.respectReducedMotion || !event.matches) return;
    this.scenes.forEach((record) => {
      if (record.settled) return;
      record.timeline.progress(1).pause();
      record.trigger?.kill();
      record.trigger = undefined;
      record.settled = true;
    });
  };

  private assertActive(): void {
    if (this.destroyed) throw new Error("ScrollConstructionEngine has been destroyed.");
  }
}
