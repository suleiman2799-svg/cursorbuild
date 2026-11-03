import { AnimationManager } from "./animation/animation-manager.js";
import { resolveConfig } from "./config.js";
import { CursorManager } from "./cursor/cursor-manager.js";
import { ScrollManager } from "./scroll/scroll-manager.js";
import type { CursorBuildConfig } from "./types.js";
export class CursorBuildEngine {
 readonly config: CursorBuildConfig; readonly cursors = new CursorManager(); readonly animations = new AnimationManager(); readonly scroll = new ScrollManager();
 constructor(config: Partial<CursorBuildConfig> = {}) { this.config = resolveConfig(config); }
 destroy(): void { this.animations.killAll(); this.scroll.killAll(); }
}