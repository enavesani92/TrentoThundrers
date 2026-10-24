// Suoni (WebAudio, nessun file) e vibrazione. Le preferenze arrivano dalle impostazioni.

let soundOn = true;
let vibrationOn = true;
let ctx: AudioContext | null = null;

export function configureFeedback(opts: { sound: boolean; vibration: boolean }) {
  soundOn = opts.sound;
  vibrationOn = opts.vibration;
}

/** Va chiamata dentro un gesto dell'utente (iOS sblocca l'audio solo così). */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx?.state === 'suspended') void ctx.resume();
}

export function beep(freq = 880, ms = 140, volume = 0.25) {
  if (!soundOn || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

export function vibrate(pattern: number | number[]) {
  if (vibrationOn && 'vibrate' in navigator) navigator.vibrate(pattern);
}

export const cue = {
  tap: () => vibrate(15),
  setDone: () => {
    vibrate(30);
    beep(660, 80, 0.15);
  },
  countdown: () => beep(880, 110),
  go: () => {
    vibrate([120, 60, 120]);
    beep(1320, 320, 0.3);
  },
  rest: () => {
    vibrate(200);
    beep(440, 260, 0.25);
  },
  restOver: () => {
    vibrate([250, 100, 250, 100, 400]);
    beep(1046, 180);
    setTimeout(() => beep(1318, 300), 200);
  },
};
