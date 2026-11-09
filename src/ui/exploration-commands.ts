export type ExplorationCommand = "forward" | "backward" | "left" | "right" | "turnLeft" | "turnRight" | "interact" | "talk";

// One queued intent, never a queue of state mutations. Incompatible screens or
// dialogs discard it. A rapid input cannot cause overlapping camera actions.
export class ExplorationCommandQueue {
  private pending: ExplorationCommand | null = null;
  request(command: ExplorationCommand, compatible: boolean, moving: boolean, execute: (command: ExplorationCommand) => void): void {
    if (!compatible) { this.clear(); return; }
    if (moving) { this.pending ??= command; return; }
    execute(command);
  }
  flush(compatible: boolean, moving: boolean, execute: (command: ExplorationCommand) => void): void {
    if (!compatible) { this.clear(); return; }
    if (moving || !this.pending) return;
    const command = this.pending;
    this.pending = null;
    execute(command);
  }
  clear(): void { this.pending = null; }
  get queued(): ExplorationCommand | null { return this.pending; }
}
