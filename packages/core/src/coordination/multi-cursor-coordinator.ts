import type { gsap } from "gsap";

export type CoordinationMode = "parallel" | "sequence";

export interface CoordinatedActionContext {
  groupId: string;
  actionId: string;
  cursorId: string;
  signal: AbortSignal;
}

export type CoordinatedActionResult = void | Promise<void> | gsap.core.Animation;

export interface CoordinatedAction {
  id: string;
  cursorId: string;
  dependsOn?: readonly string[];
  /** Invoke existing cursor, cinematic, or application actions and return a GSAP animation to await when applicable. */
  run(context: CoordinatedActionContext): CoordinatedActionResult;
}

export interface CoordinationOptions {
  mode?: CoordinationMode;
  /** Delay in seconds between action start times. */
  delayBetween?: number;
}

interface ActiveAction {
  groupId: string;
  controller: AbortController;
}

type AnimationCallback = (this: gsap.core.Animation, ...args: unknown[]) => void;

/**
 * Coordinates independent collaborator actions without owning cursor rendering.
 * Actions can call CursorRenderer APIs and return their GSAP timelines for synchronization.
 */
export class MultiCursorCoordinator {
  private readonly groups = new Map<string, AbortController>();
  private readonly activeActions = new Map<string, ActiveAction>();
  private destroyed = false;

  async runGroup(
    groupId: string,
    actions: readonly CoordinatedAction[],
    options: CoordinationOptions = {}
  ): Promise<void> {
    this.assertActive();
    if (!groupId.trim()) throw new Error("A coordination group id is required.");
    if (this.groups.has(groupId)) throw new Error("Coordination group is already running: " + groupId);
    if (!Array.isArray(actions) || actions.length === 0) throw new TypeError("A coordination group requires at least one action.");
    const mode = options.mode ?? "parallel";
    if (mode !== "parallel" && mode !== "sequence") throw new TypeError("Coordination mode must be parallel or sequence.");
    const delayBetween = options.delayBetween ?? 0;
    if (!Number.isFinite(delayBetween) || delayBetween < 0) throw new RangeError("delayBetween must be finite and non-negative.");

    const actionIds = new Set<string>();
    for (const action of actions) {
      if (!action || !action.id?.trim()) throw new Error("Every coordinated action needs an id.");
      if (!action.cursorId?.trim()) throw new Error("Every coordinated action needs a cursor id.");
      if (actionIds.has(action.id)) throw new Error("Duplicate coordinated action id: " + action.id);
      if (this.activeActions.has(action.id)) throw new Error("Coordinated action is already active: " + action.id);
      if (typeof action.run !== "function") throw new TypeError("Coordinated action " + action.id + " requires a run callback.");
      actionIds.add(action.id);
    }

    const ordered = this.sortActions(actions);
    const groupController = new AbortController();
    this.groups.set(groupId, groupController);
    const tasks = new Map<string, Promise<void>>();
    let startGate: Promise<void> = Promise.resolve();
    let previous: Promise<void> | undefined;

    for (const action of ordered) {
      const dependencies = (action.dependsOn ?? []).map((id) => tasks.get(id)!);
      if (mode === "sequence" && previous) dependencies.push(previous);
      const task = Promise.all([...dependencies, startGate]).then(() =>
        this.runAction(groupId, action, groupController.signal)
      );
      tasks.set(action.id, task);
      if (mode === "sequence") previous = task;
      if (delayBetween > 0) {
        const gate = startGate;
        startGate = gate.then(() => this.wait(delayBetween, groupController.signal));
      }
    }

    try {
      await Promise.all(tasks.values());
    } catch (error) {
      this.cancelGroup(groupId);
      throw error;
    } finally {
      this.groups.delete(groupId);
    }
  }

  /** Cancel one active action by its globally unique action id. */
  cancelAction(actionId: string): boolean {
    const active = this.activeActions.get(actionId);
    if (!active) return false;
    active.controller.abort();
    return true;
  }

  /** Cancel every active or scheduled action in a group. */
  cancelGroup(groupId: string): boolean {
    const controller = this.groups.get(groupId);
    if (!controller) return false;
    controller.abort();
    for (const [actionId, active] of this.activeActions) {
      if (active.groupId === groupId) this.cancelAction(actionId);
    }
    return true;
  }

  getActiveActionIds(): string[] {
    return [...this.activeActions.keys()];
  }

  getActiveGroupIds(): string[] {
    return [...this.groups.keys()];
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    [...this.groups.keys()].forEach((id) => this.cancelGroup(id));
    [...this.activeActions.keys()].forEach((id) => this.cancelAction(id));
  }

  private async runAction(groupId: string, action: CoordinatedAction, groupSignal: AbortSignal): Promise<void> {
    if (groupSignal.aborted) throw this.abortError();
    const controller = new AbortController();
    const abortFromGroup = () => controller.abort();
    groupSignal.addEventListener("abort", abortFromGroup, { once: true });
    const record: ActiveAction = { groupId, controller };
    this.activeActions.set(action.id, record);
    try {
      const result = action.run({
        groupId,
        actionId: action.id,
        cursorId: action.cursorId,
        signal: controller.signal
      });
      if (this.isAnimation(result)) {
        await this.waitForAnimation(result, controller.signal);
      } else if (result && typeof (result as Promise<void>).then === "function") {
        await this.waitForPromise(result as Promise<void>, controller.signal);
      }
      if (controller.signal.aborted) throw this.abortError();
    } finally {
      groupSignal.removeEventListener("abort", abortFromGroup);
      this.activeActions.delete(action.id);
    }
  }

  private waitForAnimation(animation: gsap.core.Animation, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      animation.kill();
      return Promise.reject(this.abortError());
    }
    if (animation.progress() >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let settled = false;
      const previousComplete = animation.eventCallback("onComplete") as AnimationCallback | null;
      const previousInterrupt = animation.eventCallback("onInterrupt") as AnimationCallback | null;
      const cleanup = () => {
        signal.removeEventListener("abort", onAbort);
        animation.eventCallback("onComplete", previousComplete);
        animation.eventCallback("onInterrupt", previousInterrupt);
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const onAbort = () => finish(() => {
        animation.kill();
        reject(this.abortError());
      });
      animation.eventCallback("onComplete", function (this: gsap.core.Animation, ...args: unknown[]) {
        previousComplete?.apply(this, args);
        finish(resolve);
      });
      animation.eventCallback("onInterrupt", function (this: gsap.core.Animation, ...args: unknown[]) {
        previousInterrupt?.apply(this, args);
        finish(() => reject(new Error("Coordinated GSAP animation was interrupted.")));
      });
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
  }

  private waitForPromise(promise: Promise<void>, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(this.abortError());
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(this.abortError());
      };
      const cleanup = () => signal.removeEventListener("abort", onAbort);
      signal.addEventListener("abort", onAbort, { once: true });
      promise.then(
        () => { cleanup(); resolve(); },
        (error: unknown) => { cleanup(); reject(error); }
      );
    });
  }

  private wait(seconds: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(this.abortError());
    if (seconds === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, seconds * 1000);
      const onAbort = () => {
        clearTimeout(timer);
        cleanup();
        reject(this.abortError());
      };
      const cleanup = () => signal.removeEventListener("abort", onAbort);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  private sortActions(actions: readonly CoordinatedAction[]): CoordinatedAction[] {
    const byId = new Map(actions.map((action) => [action.id, action]));
    const state = new Map<string, 0 | 1 | 2>();
    const ordered: CoordinatedAction[] = [];
    const visit = (action: CoordinatedAction) => {
      const current = state.get(action.id) ?? 0;
      if (current === 1) throw new Error("Coordination dependencies contain a cycle at action: " + action.id);
      if (current === 2) return;
      state.set(action.id, 1);
      for (const dependency of action.dependsOn ?? []) {
        const required = byId.get(dependency);
        if (!required) throw new Error("Unknown action dependency: " + dependency);
        visit(required);
      }
      state.set(action.id, 2);
      ordered.push(action);
    };
    actions.forEach(visit);
    return ordered;
  }

  private isAnimation(result: CoordinatedActionResult): result is gsap.core.Animation {
    return !!result && typeof result === "object"
      && typeof (result as gsap.core.Animation).eventCallback === "function"
      && typeof (result as gsap.core.Animation).progress === "function"
      && typeof (result as gsap.core.Animation).kill === "function";
  }

  private abortError(): Error {
    const error = new Error("Coordinated action was cancelled.");
    error.name = "AbortError";
    return error;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error("MultiCursorCoordinator has been destroyed.");
  }
}
