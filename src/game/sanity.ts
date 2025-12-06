import { CharacterState, MoralFlags, PartyState } from "./state";

export function adjustSanity(
  character: CharacterState,
  delta: number
): CharacterState {
  const nextSanity = Math.min(
    character.stats.maxSanity,
    Math.max(0, character.stats.sanity + delta)
  );

  return {
    ...character,
    stats: {
      ...character.stats,
      sanity: nextSanity,
    },
  };
}

export function adjustPartySanity(
  party: PartyState,
  delta: number
): PartyState {
  return {
    ...party,
    members: party.members.map((member) =>
      member.alive ? adjustSanity(member, delta) : member
    ),
  };
}

export function adjustMoralFlags(
  flags: MoralFlags,
  changes: Partial<MoralFlags>
): MoralFlags {
  return {
    mercy: flags.mercy + (changes.mercy ?? 0),
    cruelty: flags.cruelty + (changes.cruelty ?? 0),
    truth: flags.truth + (changes.truth ?? 0),
    denial: flags.denial + (changes.denial ?? 0),
  };
}

export function getSanityStage(
  character: CharacterState
): "high" | "mid" | "low" {
  const ratio =
    character.stats.maxSanity === 0
      ? 0
      : character.stats.sanity / character.stats.maxSanity;

  if (ratio >= 0.66) {
    return "high";
  }
  if (ratio >= 0.33) {
    return "mid";
  }
  return "low";
}
