import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScrollTrigger as ScrollTriggerInstance } from "gsap/ScrollTrigger";
let registered = false;
export class ScrollManager {
 private readonly triggers = new Map<string, ScrollTriggerInstance>();
 constructor() { if (!registered) { gsap.registerPlugin(ScrollTrigger); registered = true; } }
 create(id: string, vars: ScrollTrigger.Vars): ScrollTriggerInstance { if (!id.trim()) throw new Error("A scroll trigger id is required."); if (this.triggers.has(id)) throw new Error("Scroll trigger already exists: " + id); const trigger = ScrollTrigger.create(vars); this.triggers.set(id, trigger); return trigger; }
 get(id: string): ScrollTriggerInstance | undefined { return this.triggers.get(id); }
 kill(id: string): void { this.triggers.get(id)?.kill(); this.triggers.delete(id); }
 killAll(): void { this.triggers.forEach((trigger) => trigger.kill()); this.triggers.clear(); }
 refresh(): void { ScrollTrigger.refresh(); }
}