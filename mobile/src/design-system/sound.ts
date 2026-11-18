import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  success: require('../../assets/sounds/success.wav'),
  miss: require('../../assets/sounds/miss.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const VOLUME: Record<SoundName, number> = { tap: 0.35, pop: 0.5, success: 0.7, miss: 0.5 };
const players = new Map<SoundName, AudioPlayer>();
let modeSet = false;

function playerFor(name: SoundName): AudioPlayer {
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(SOURCES[name]);
    p.volume = VOLUME[name];
    players.set(name, p);
  }
  return p;
}

/**
 * Plays a short effect. Mixes with the player's own music and respects silent mode.
 * Sound is optional reinforcement: any failure is swallowed so it can never break a tap.
 */
export function playSound(name: SoundName): void {
  try {
    if (!modeSet) {
      modeSet = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }
    const p = playerFor(name);
    p.seekTo(0).catch(() => undefined);
    p.play();
  } catch {
    // Ignore: audio unavailable.
  }
}

/** Creates the players up front so the first effect plays without a load delay. */
export function preloadSounds(): void {
  try {
    (Object.keys(SOURCES) as SoundName[]).forEach(playerFor);
  } catch {
    // Ignore: audio unavailable.
  }
}
