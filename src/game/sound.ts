// Game rules emit cues; the browser audio implementation lives in the UI.
let soundSink: (cue: string) => void = () => {};

export function setSoundSink(sink: (cue: string) => void): void {
  soundSink = sink;
}

export function emitSound(cue: string): void {
  soundSink(cue);
}
