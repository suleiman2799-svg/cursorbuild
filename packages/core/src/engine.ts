import { AnimationManager } from "./animation/animation-manager.js";
import { CinematicAnimationEngine } from "./animation/cinematic-animation-engine.js";
import { resolveConfig } from "./config.js";
import { CursorManager } from "./cursor/cursor-manager.js";
import { CursorRenderer } from "./cursor/cursor-renderer.js";
import type { CursorRendererOptions } from "./cursor/cursor-renderer.js";
import { ScrollManager } from "./scroll/scroll-manager.js";
import type { CursorBuildConfig } from "./types.js";
export class CursorBuildEngine {
 readonly config: CursorBuildConfig;
 readonly cursors = new CursorManager();
 readonly animations = new AnimationManager();
 readonly cinematic: CinematicAnimationEngine;
 readonly scroll = new ScrollManager();
 private readonly cursorRenderers = new Set<CursorRenderer>();
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
 /** Dispose all renderers and GSAP resources owned by this engine. */
 destroy(): void {
  if (this.destroyed) return;
  this.destroyed = true;
  this.cursorRenderers.forEach((renderer) => renderer.destroy());
  this.cursorRenderers.clear();
  this.animations.killAll();
  this.cinematic.destroy();
  this.scroll.killAll();
 }
}