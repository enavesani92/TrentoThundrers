import { create } from 'zustand';

// Eventi che fanno reagire l'avatar (saltello a fine serie, esultanza, flessione, fulmini).
export type AvatarAction = 'idle' | 'hop' | 'cheer' | 'flex' | 'thunder';

interface FxState {
  action: AvatarAction;
  nonce: number;
  play: (a: AvatarAction) => void;
}

export const useAvatarFx = create<FxState>((set) => ({
  action: 'idle',
  nonce: 0,
  play: (action) => set((s) => ({ action, nonce: s.nonce + 1 })),
}));
