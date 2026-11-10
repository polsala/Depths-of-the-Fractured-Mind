import type { PresenceDirector } from "../graphics/presence/PresenceDirector";
import { presenceAtlasUrl } from "../assets/presence-sprites";
import type { CharacterId } from "../game/state";
import "./presence.css";

export const presenceLifecycle = { created: 0, disposed: 0, active: 0 };

/** Transparent presentation over either backend; never captures input or owns an action. */
export class PresenceView {
  readonly element = document.createElement("div");
  private readonly hands = document.createElement("div");
  private readonly caption = document.createElement("span");
  private frame = 0;
  private disposed = false;
  private frozenAt: number | null = null;
  private actor: CharacterId | undefined;
  private pose = -1;
  private readonly director: PresenceDirector;
  private readonly reduced: () => boolean;
  private readonly hidden: () => boolean;
  constructor(director: PresenceDirector, reduced: () => boolean,
    hidden: () => boolean, combat = false) {
    this.director = director; this.reduced = reduced; this.hidden = hidden;
    this.element.className = `physical-presence${combat ? " physical-presence--combat" : ""}`;
    this.element.setAttribute("aria-hidden", "true");
    this.hands.className = "presence-hands";
    this.caption.className = "presence-caption";
    this.element.append(this.hands, this.caption);
    presenceLifecycle.created++; presenceLifecycle.active++;
    this.frame = requestAnimationFrame(this.tick);
  }
  freeze(now: number | null): void { this.frozenAt = now; this.draw(now ?? performance.now()); }
  draw(now: number): void {
    if (this.disposed) return;
    const sample = this.director.sample(now, this.reduced(), this.hidden());
    this.element.hidden = !sample.visible;
    if (!sample.person) return;
    if (this.actor !== sample.person.id) {
      this.actor = sample.person.id;
      this.hands.style.backgroundImage = `url("${presenceAtlasUrl(this.actor)}")`;
    }
    if (this.pose !== sample.pose) {
      this.pose = sample.pose;
      this.hands.style.backgroundPosition = `${sample.pose % 4 * 100 / 3}% ${Math.floor(sample.pose / 4) * 100}%`;
    }
    this.hands.style.transform = `translate(${sample.x}px, ${sample.y}px) rotate(${sample.rotation}deg)`;
    this.element.dataset.character = sample.person.id;
    this.element.dataset.action = sample.action;
    this.element.dataset.pose = String(sample.pose);
    this.element.dataset.phase = sample.phase;
    this.element.dataset.reducedMotion = String(this.reduced());
    this.caption.textContent = sample.person.wounded ? `${sample.person.name} · wounded`
      : sample.person.distressed ? `${sample.person.name} · strained` : "";
  }
  private tick = (now: number): void => {
    if (this.disposed) return;
    if (!document.hidden) this.draw(this.frozenAt ?? now);
    this.frame = requestAnimationFrame(this.tick);
  };
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frame); this.element.remove();
    presenceLifecycle.disposed++; presenceLifecycle.active--;
  }
}
