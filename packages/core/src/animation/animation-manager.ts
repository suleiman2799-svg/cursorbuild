import { gsap } from "gsap";
export class AnimationManager {
 private readonly timelines = new Map<string, gsap.core.Timeline>();
 createTimeline(id: string, options: gsap.TimelineVars = {}): gsap.core.Timeline { if (!id.trim()) throw new Error("A timeline id is required."); if (this.timelines.has(id)) throw new Error("Timeline already exists: " + id); const timeline = gsap.timeline(options); this.timelines.set(id, timeline); return timeline; }
 getTimeline(id: string): gsap.core.Timeline | undefined { return this.timelines.get(id); }
 kill(id: string): void { this.timelines.get(id)?.kill(); this.timelines.delete(id); }
 killAll(): void { this.timelines.forEach((timeline) => timeline.kill()); this.timelines.clear(); }
}