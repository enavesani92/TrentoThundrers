import type { AvatarAction } from '@/store/fx';

// Pose procedurali: funzioni pure del tempo, così l'animazione è deterministica.

export const DURATION: Record<AvatarAction, number> = { idle: 0, hop: 0.55, cheer: 2.4, flex: 1.8, thunder: 2 };

export interface Pose {
  y: number; // salto
  spin: number; // rotazione sul posto
  armL: number; // rotazione z della spalla (0 = braccio giù)
  armR: number;
  armFwd: number; // braccia in avanti (rotazione x)
  squash: number; // 1 = normale
  breath: number; // scala del busto
  headTilt: number;
  bolts: number; // 0–1 intensità dei fulmini
}

const REST: Pose = { y: 0, spin: 0, armL: 0.18, armR: -0.18, armFwd: 0, squash: 1, breath: 1, headTilt: 0, bolts: 0 };

const ease = (x: number) => 1 - (1 - x) ** 3;
const bell = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));

/** `t` = secondi dall'inizio (idle: tempo assoluto), `p` = avanzamento 0–1 dell'azione. */
export function poseAt(action: AvatarAction, t: number, reduced = false): Pose {
  if (reduced) return REST;
  const idle: Pose = {
    ...REST,
    breath: 1 + Math.sin(t * 2.2) * 0.025,
    armL: 0.18 + Math.sin(t * 2.2) * 0.04,
    armR: -0.18 - Math.sin(t * 2.2) * 0.04,
    headTilt: Math.sin(t * 0.9) * 0.05,
  };
  const d = DURATION[action];
  if (action === 'idle' || t >= d) return idle;
  const p = t / d;

  switch (action) {
    case 'hop': {
      const h = bell(p);
      return { ...idle, y: h * 0.35, squash: p < 0.15 ? 1 - bell(p / 0.15) * 0.12 : 1 + h * 0.06, armL: 0.18 + h * 0.9, armR: -0.18 - h * 0.9 };
    }
    case 'cheer': {
      const up = p < 0.85 ? ease(Math.min(1, p * 5)) : ease((1 - p) / 0.15);
      const jumps = Math.abs(Math.sin(p * Math.PI * 3)) * 0.3 * (p < 0.88 ? 1 : 0);
      return { ...idle, y: jumps, spin: ease(p) * Math.PI * 2, armL: 0.18 + up * 2.6, armR: -0.18 - up * 2.6, headTilt: -0.15 * up };
    }
    case 'flex': {
      const k = Math.min(1, bell(p) / 0.5);
      const pulse = 1 + Math.max(0, Math.sin(p * Math.PI * 6)) * 0.06 * k;
      return { ...idle, armL: 0.18 + k * 1.45, armR: -0.18 - k * 1.45, armFwd: -k * 0.5, breath: pulse, squash: 1 - k * 0.04 };
    }
    case 'thunder': {
      const k = bell(p);
      const flicker = k * (0.6 + 0.4 * Math.abs(Math.sin(t * 40)));
      return { ...idle, y: k * 0.25, armL: 0.18 + k * 2.8, armR: -0.18 - k * 2.8, bolts: flicker, spin: k * 0.4 * Math.sin(t * 6) };
    }
  }
  return idle;
}
