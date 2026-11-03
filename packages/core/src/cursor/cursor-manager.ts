import type { CursorIdentity, Unsubscribe } from "../types.js";
/** Identity registry only; rendering and pointer tracking belong to adapters. */
export class CursorManager {
 private readonly cursors = new Map<string, CursorIdentity>(); private readonly listeners = new Set<() => void>();
 getAll(): CursorIdentity[] { return [...this.cursors.values()]; }
 get(id: string): CursorIdentity | undefined { return this.cursors.get(id); }
 add(identity: CursorIdentity): void { if (!identity.id.trim()) throw new Error("A cursor id is required."); if (this.cursors.has(identity.id)) throw new Error("Cursor already exists: " + identity.id); this.cursors.set(identity.id, { ...identity }); this.notify(); }
 update(id: string, patch: Partial<Omit<CursorIdentity, "id">>): void { const current = this.cursors.get(id); if (!current) throw new Error("Unknown cursor: " + id); this.cursors.set(id, { ...current, ...patch, id }); this.notify(); }
 remove(id: string): boolean { const removed = this.cursors.delete(id); if (removed) this.notify(); return removed; }
 subscribe(listener: () => void): Unsubscribe { this.listeners.add(listener); return () => this.listeners.delete(listener); }
 private notify(): void { this.listeners.forEach((listener) => listener()); }
}