export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  glyph: 'snap' | 'wave' | 'track' | 'flame' | 'iron' | 'td' | 'drive' | 'ten' | 'engine' | 'star';
}

export const BADGES: BadgeDef[] = [
  { id: 'primo-snap', name: 'Primo Snap', desc: 'Prima seduta completata', glyph: 'snap' },
  { id: 'touchdown', name: 'Touchdown', desc: 'Prima settimana con 3 sedute', glyph: 'td' },
  { id: 'wave-rider', name: 'Wave Rider', desc: 'Tutti i 18 step dello squat a onde in una seduta', glyph: 'wave' },
  { id: 'pista-fersina', name: 'Pista Fersina', desc: 'Tutti gli sprint in 4 Day 1 dello stesso mese', glyph: 'track' },
  { id: 'mai-a-freddo', name: 'Mai a freddo', desc: 'Attivazione completa in ogni seduta per 4 settimane di fila', glyph: 'flame' },
  { id: 'iron-thunder', name: 'Iron Thunder', desc: 'Nuovo record personale stimato', glyph: 'iron' },
  { id: 'drive-lungo', name: 'Drive lungo', desc: 'Streak di 4 settimane complete', glyph: 'drive' },
  { id: 'doppia-cifra', name: 'Doppia cifra', desc: '10 sedute completate', glyph: 'ten' },
  { id: 'motore', name: 'Motore diesel', desc: '10 conditioning completi', glyph: 'engine' },
  { id: 'veterano', name: 'Veterano', desc: '50 sedute completate', glyph: 'star' },
];
