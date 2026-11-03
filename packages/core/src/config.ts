import type { CursorBuildConfig } from "./types.js";
export const defaultConfig: Readonly<CursorBuildConfig> = Object.freeze({ respectReducedMotion: true, defaultDuration: 0.6, debug: false });
export function resolveConfig(overrides: Partial<CursorBuildConfig> = {}): CursorBuildConfig {
 const config = { ...defaultConfig, ...overrides };
 if (!Number.isFinite(config.defaultDuration) || config.defaultDuration < 0) throw new RangeError("defaultDuration must be finite and non-negative.");
 return config;
}