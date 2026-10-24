// Sblocchi solo estetici per l'avatar.
export interface CosmeticDef {
  id: string;
  name: string;
  unlock: { level: number } | { badge: string };
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'stripes', name: 'Striscia sul casco', unlock: { level: 1 } },
  { id: 'gloves', name: 'Guanti gialli', unlock: { level: 2 } },
  { id: 'visor', name: 'Visiera', unlock: { level: 3 } },
  { id: 'cleats', name: 'Scarpini gialli', unlock: { badge: 'wave-rider' } },
  { id: 'away', name: 'Maglia away', unlock: { badge: 'touchdown' } },
  { id: 'armband', name: 'Fascia sul braccio', unlock: { level: 4 } },
  { id: 'aura', name: 'Aura di fulmini', unlock: { level: 5 } },
];
