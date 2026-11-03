import type { ActionStep } from "../types.js";
/** Runs caller-provided actions in order; it does not fabricate browser interactions. */
export class ActionSequence {
 constructor(private readonly steps: readonly ActionStep[]) { const ids = new Set<string>(); for (const step of steps) { if (!step.id.trim()) throw new Error("Every action step needs an id."); if (ids.has(step.id)) throw new Error("Duplicate action step id: " + step.id); ids.add(step.id); } }
 async run(signal?: AbortSignal): Promise<void> { const controller = new AbortController(); const abort = () => controller.abort(); signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) controller.abort(); try { for (const step of this.steps) { if (controller.signal.aborted) throw new DOMException("Sequence aborted.", "AbortError"); await step.run({ signal: controller.signal }); } } finally { signal?.removeEventListener("abort", abort); } }
}