export interface BossDialogue {
  bossId: string;
  intro: string[];
  victory: string[];
  defeat: string[];
  lowHealth?: string[]; // When boss HP < 30%
}

export const BOSS_DIALOGUES: Record<string, BossDialogue> = {
  threshold_warden: {
    bossId: "threshold_warden",
    intro: [
      "The amalgamated guards loom before you, their voices speaking in unison...",
      '"You should not be here. Turn back."',
      '"Order must be maintained. We are... we were... the guardians."',
      "Their eyes flicker with fragments of memories—of duty, of violence, of regret.",
    ],
    victory: [
      "The Threshold Warden collapses, its fused forms separating into lifeless husks.",
      'A whisper escapes: "Thank... you..."',
      "The way forward is clear, but the weight of what you've done lingers.",
    ],
    defeat: [
      '"Order restored. Intruders eliminated."',
      "The Warden stands over your broken forms, a monument to twisted duty.",
      "Your descent ends here, in the threshold of failure.",
    ],
    lowHealth: [
      '"We... remember... the pain..."',
      '"Why did they make us this?"',
      "The voices crack with anguish, but they fight on—programmed to protect what no longer exists.",
    ],
  },
  
  keeper_of_records: {
    bossId: "keeper_of_records",
    intro: [
      "Papers swirl around a massive figure made of countless documents and recordings.",
      '"I am witness to all that transpired here."',
      '"Every atrocity, every lie, every moment of suffering—I have catalogued it all."',
      "The truth you fled from stands before you, inescapable.",
    ],
    victory: [
      "The Keeper dissolves into a cascade of papers, each one a testimony of guilt.",
      "As the documents settle, you see your own names written among them.",
      "The truth has been confronted, but not forgotten.",
    ],
    defeat: [
      '"The truth cannot be escaped. The records are absolute."',
      "Buried beneath an avalanche of evidence, your journey ends.",
      "The Keeper files your failure among countless others.",
    ],
    lowHealth: [
      '"Even damaged, I remember all."',
      "Files scatter, revealing glimpses of each character's darkest moments.",
      '"Face what you have done!"',
    ],
  },
  
  ward_physician: {
    bossId: "ward_physician",
    intro: [
      "A twisted reflection of Dr. Kessler steps forward, surgical tools gleaming.",
      '"Ah, fascinating specimens. Let me conduct one final experiment."',
      '"Don\'t worry—I\'ve done this procedure countless times before."',
      "Miriam recoils in horror at what she could become—what she already was.",
    ],
    victory: [
      "The Ward Physician crumbles, its form dissolving like a failed experiment.",
      '"The hypothesis... was flawed... after all..."',
      "Miriam stands shaking. Was this her future, or her past made manifest?",
    ],
    defeat: [
      '"Excellent results. The subjects proved... inadequate."',
      "Cold medical efficiency ends your journey.",
      "You become just another case study in the archives.",
    ],
    lowHealth: [
      '"Interesting. The subjects show unexpected resilience."',
      '"But all experiments must reach their conclusion."',
      "The Physician's methods grow more desperate, more cruel.",
    ],
  },
  
  mirror_self: {
    bossId: "mirror_self",
    intro: [
      "The party sees themselves reflected perfectly—all their strengths, all their sins.",
      '"We are what you refuse to acknowledge."',
      '"Every choice, every betrayal, every lie—we are the truth you deny."',
      "Your own reflection raises weapons against you.",
    ],
    victory: [
      "The mirrors shatter, and the reflections fade to nothing.",
      "For a moment, you see yourselves clearly—for better and worse.",
      "The path forward demands acceptance of who you truly are.",
    ],
    defeat: [
      '"You cannot escape yourselves."',
      "Consumed by your own reflections, your journey ends in denial.",
      "The mirrors remain, waiting for the next truth-seekers.",
    ],
    lowHealth: [
      '"Why do you fight yourselves?"',
      "The reflection cracks, revealing glimpses of who you could have been.",
      '"Accept the truth, or be destroyed by it!"',
    ],
  },
  
  the_engine_heart: {
    bossId: "the_engine_heart",
    intro: [
      "The Engine's heart pulses before you, Subject 13's essence intertwined within.",
      "A voice—many voices—echo from within:",
      '"We are everyone who suffered here. We are the guilt made manifest."',
      '"Will you add to our number, or free us from this eternal torment?"',
      "The final choice awaits.",
    ],
    victory: [
      "The Engine's heart slows, then stops. A profound silence fills the chamber.",
      "Subject 13 separates from the Engine, their form barely holding together.",
      '"Thank you... for ending this cycle."',
      "The facility begins to crumble. Your choices will determine what emerges from the ruins.",
    ],
    defeat: [
      "The Engine consumes you, adding your guilt to its endless repository.",
      "Subject 13 watches with hollow eyes as you become part of the machinery.",
      "The cycle continues. The suffering never ends.",
    ],
    lowHealth: [
      '"We feel it... the possibility of freedom..."',
      "Subject 13's voice: 'Don't stop now—we're so close!'",
      "The Engine lashes out in desperation, reality itself fracturing around you.",
    ],
  },
};

export function getBossDialogue(bossId: string): BossDialogue | undefined {
  return BOSS_DIALOGUES[bossId];
}
