import { AnimationManager } from "./animation/animation-manager.js";
import { CinematicAnimationEngine } from "./animation/cinematic-animation-engine.js";
import { resolveConfig } from "./config.js";
import { CursorManager } from "./cursor/cursor-manager.js";
import { CursorRenderer } from "./cursor/cursor-renderer.js";
import { MultiCursorCoordinationEngine } from "./coordination/multi-cursor-coordination-engine.js";
import { MultiCursorCoordinator } from "./coordination/multi-cursor-coordinator.js";
import { VisualEffectsManager } from "./visual-effects/visual-effects-manager.js";
import type { CursorRendererOptions } from "./cursor/cursor-renderer.js";
import type { VisualEffectsOptions } from "./visual-effects/visual-effects-manager.js";
import { ScrollConstructionEngine } from "./scroll/scroll-construction-engine.js";
import { ScrollManager } from "./scroll/scroll-manager.js";
import type { CursorBuildConfig } from "./types.js";

export class CursorBuildEngine {
  readonly config: CursorBuildConfig;
  readonly cursors = new CursorManager();
  readonly animations = new AnimationManager();
  readonly cinematic: CinematicAnimationEngine;
  readonly scroll = new ScrollManager();
  readonly coordination = new MultiCursorCoordinationEngine();
  /** Compatibility coordinator for the original action-array API. */
  readonly coordinator = new MultiCursorCoordinator();
  readonly construction = new ScrollConstructionEngine();
  private readonly cursorRenderers = new Set<CursorRenderer>();
  private readonly visualEffects = new Set<VisualEffectsManager>();
  private destroyed = false;

  constructor(config: Partial<CursorBuildConfig> = {}) {
    this.config = resolveConfig(config);
    this.cinematic = new CinematicAnimationEngine({ respectReducedMotion: this.config.respectReducedMotion });
  }

  /** Attach a visual cursor layer. Coordinates are container-relative CSS pixels. */
  mountCursors(container: HTMLElement, options: CursorRendererOptions = {}): CursorRenderer {
    if (this.destroyed) throw new Error("CursorBuildEngine has been destroyed.");
    const renderer = new CursorRenderer(this.cursors, container, { ...options, respectReducedMotion: options.respectReducedMotion ?? this.config.respectReducedMotion });
    this.cursorRenderers.add(renderer);
    return renderer;
  }

  /** Mount optional design effects independently of cursor rendering. */
  mountVisualEffects(container: HTMLElement, options: VisualEffectsOptions = {}): VisualEffectsManager {
    if (this.destroyed) throw new Error("CursorBuildEngine has been destroyed.");
    const effects = new VisualEffectsManager(container, options);
    this.visualEffects.add(effects);
    return effects;
  }

  /** Dispose all renderers, visual effects, and animation resources owned by this engine. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // Abort orchestrated work before disposing the timelines and DOM resources
    // that coordinated callbacks may still be using.
    this.coordination.destroy();
    this.coordinator.destroy();
    this.construction.destroy();
    this.scroll.killAll();
    this.cinematic.destroy();
    this.animations.killAll();
    this.cursorRenderers.forEach((renderer) => renderer.destroy());
    this.cursorRenderers.clear();
    this.visualEffects.forEach((effects) => effects.destroy());
    this.visualEffects.clear();
  }
}
