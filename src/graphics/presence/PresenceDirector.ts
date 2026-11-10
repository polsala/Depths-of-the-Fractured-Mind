import type { CharacterId, CharacterState, GameState } from "../../game/state";
import { COMBAT_CONTACT_MS, COMBAT_PRESENTATION_MS, COMBAT_RECOVERY_MS } from "../combat-presentation";

export type PresenceAction = "idle" | "walk" | "turn" | "interact" | "inspect" | "use" | "attack" | "cast" | "brace" | "hurt" | "tension";
export interface PresencePerson {
  readonly id: CharacterId;
  readonly name: string;
  readonly alive: boolean;
  readonly wounded: boolean;
  readonly distressed: boolean;
}
export interface PresenceFrame {
  readonly person: PresencePerson | null;
  readonly action: PresenceAction;
  readonly pose: number;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly visible: boolean;
  readonly phase: "rest" | "anticipation" | "contact" | "recovery";
  readonly elapsedMs: number;
}
const PERSON_LANGUAGE: Record<CharacterId, { breath: number; reach: number; turn: number }> = {
  elias: { breath: 0.6, reach: 1, turn: 0.7 },
  miriam: { breath: 0.35, reach: 0.75, turn: 0.4 },
  subject13: { breath: 0.8, reach: 0.65, turn: 0.85 },
  anya: { breath: 0.45, reach: 0.85, turn: 0.5 },
};
export const PRESENCE_ACTION_MS: Record<PresenceAction, number> = {
  idle: 0, walk: 280, turn: 220, interact: COMBAT_PRESENTATION_MS, inspect: 800, use: COMBAT_PRESENTATION_MS,
  attack: COMBAT_PRESENTATION_MS, cast: COMBAT_PRESENTATION_MS, brace: COMBAT_PRESENTATION_MS, hurt: COMBAT_PRESENTATION_MS, tension: 0,
};
const POSE: Record<PresenceAction, number> = {
  idle: 0, walk: 0, turn: 0, interact: 1, inspect: 2, use: 2,
  attack: 3, cast: 4, brace: 5, hurt: 6, tension: 7,
};
export function presentPerson(member: CharacterState): PresencePerson {
  return Object.freeze({ id: member.id, name: member.name, alive: member.alive && member.stats.hp > 0,
    wounded: member.stats.hp < member.stats.maxHp * 0.3,
    distressed: member.stats.sanity < member.stats.maxSanity * 0.3 });
}

/** Session-only acting timeline. Owns copied scalars, never game objects, RNG or callbacks. */
export class PresenceDirector {
  private people: readonly PresencePerson[] = [];
  private preferred: CharacterId = "elias";
  private context: GameState["mode"] = "title";
  private cue: { action: PresenceAction; person: PresencePerson; at: number; direction: number } | null = null;
  private combatActor: CharacterId | undefined;

  sync(state: GameState, combatActor?: CharacterId): void {
    if (state.mode !== this.context) this.cue = null;
    this.context = state.mode;
    this.people = Object.freeze(state.party.members.map(presentPerson));
    if (this.cue) {
      const current = this.people.find((person) => person.id === this.cue!.person.id && person.alive);
      this.cue = current ? { ...this.cue, person: current } : null;
    }
    this.combatActor = combatActor;
    if (!this.people.some((person) => person.id === this.preferred && person.alive)) {
      this.preferred = this.people.find((person) => person.alive)?.id ?? "elias";
    }
  }
  select(id: CharacterId): void {
    if (!this.people.some((person) => person.id === id && person.alive)) return;
    this.preferred = id; this.cue = null;
  }
  get selected(): CharacterId { return this.preferred; }
  get person(): PresencePerson | null {
    return this.people.find((person) => person.id === (this.context === "combat" ? this.combatActor : this.preferred) && person.alive)
      ?? this.people.find((person) => person.id === this.preferred && person.alive) ?? null;
  }
  play(action: PresenceAction, at: number, actor?: CharacterId, direction = 1): void {
    const person = actor ? this.people.find((entry) => entry.id === actor) : this.person;
    if (!person?.alive || !Number.isFinite(at) || !["exploration", "combat"].includes(this.context)) return;
    this.cue = { action, person, at, direction: direction < 0 ? -1 : 1 };
  }
  cancel(): void { this.cue = null; }

  sample(now: number, reducedMotion: boolean, hidden = false): PresenceFrame {
    const cue = this.cue;
    const elapsedMs = cue ? Math.max(0, now - cue.at) : 0;
    const active = !!cue && now >= cue.at && elapsedMs < PRESENCE_ACTION_MS[cue.action];
    const person = active ? cue.person : this.person;
    const visible = !hidden && !!person?.alive && (this.context === "exploration" || this.context === "combat");
    const rest: PresenceAction = person?.wounded ? "hurt" : person?.distressed ? "tension" : this.context === "combat" ? "brace" : "idle";
    const action = active ? cue.action : rest;
    const duration = PRESENCE_ACTION_MS[action];
    const t = active && duration ? elapsedMs / duration : 0;
    const phase = !active ? "rest" : t < COMBAT_CONTACT_MS / COMBAT_PRESENTATION_MS ? "anticipation"
      : t < COMBAT_RECOVERY_MS / COMBAT_PRESENTATION_MS ? "contact" : "recovery";
    let pose = POSE[action];
    if (!reducedMotion && active && ["attack", "cast", "interact", "use"].includes(action)) {
      pose = phase === "anticipation" ? 5 : phase === "recovery" ? POSE[rest] : POSE[action];
    }
    const language = PERSON_LANGUAGE[person?.id ?? "elias"];
    // Motion affects only the hands. The optical horizon and grid camera stay fixed.
    const envelope = active ? Math.sin(t * Math.PI) : 0;
    const breath = reducedMotion ? 0 : Math.sin(now / 1500) * language.breath;
    const x = reducedMotion ? 0 : action === "turn" ? envelope * cue!.direction * language.turn * 2 : 0;
    const y = reducedMotion ? 0 : breath + (action === "walk" ? envelope * 2 : active ? -envelope * language.reach * 3 : 0);
    const rotation = reducedMotion ? 0 : action === "turn" ? envelope * cue!.direction * language.turn * 0.4 : 0;
    return Object.freeze({ person, action, pose, x, y, rotation, visible, phase, elapsedMs: active ? elapsedMs : 0 });
  }
}
