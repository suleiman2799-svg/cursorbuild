import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { CursorBuildEngine } from "@cursorbuild/core";
import type { CursorBuildConfig, CursorIdentity } from "@cursorbuild/core";
const EngineContext = createContext<CursorBuildEngine | null>(null);
export interface CursorBuildProviderProps { children: React.ReactNode; config?: Partial<CursorBuildConfig>; }
export function CursorBuildProvider({ children, config }: CursorBuildProviderProps) { const engine = useMemo(() => new CursorBuildEngine(config), [config]); useEffect(() => () => engine.destroy(), [engine]); return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>; }
export function useCursorBuild(): CursorBuildEngine { const engine = useContext(EngineContext); if (!engine) throw new Error("useCursorBuild must be used inside CursorBuildProvider."); return engine; }
export function useCursors(): readonly CursorIdentity[] { const { cursors } = useCursorBuild(); return useSyncExternalStore((notify) => cursors.subscribe(notify), () => cursors.getSnapshot(), () => []); }