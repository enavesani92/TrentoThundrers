# Fase 1 — Piano THUNDERS TRAINING

> Stato: **approvato e implementato** (fasi 2–6). Risposte al §8: 1 ok, 2 ok, 3 recupero minimo, 4 fulmine originale, 5 lun/mer/ven modificabili.

## 1. Struttura del repo

```
TrentoThundrers/
├─ docs/                    BRIEF.md · brand-research.md · PLAN.md
├─ public/
│  ├─ brand/                logobianco.png · logogiallo.jpg (originali, non modificati)
│  └─ icons/                icone PWA (generate da un'icona originale, NON dal logo*)
├─ scripts/                 extract-palette.mjs
└─ src/
   ├─ main.tsx · App.tsx    router (react-router, hash routing per la PWA offline)
   ├─ styles/               tokens.css (CSS variables) · globals.css
   ├─ data/
   │  ├─ program.ts         la scheda: Day → Block → Exercise (dati puri, tipizzati)
   │  ├─ activation.ts      libreria attivazione (upper / busto / lower)
   │  ├─ levels.ts · badges.ts · cosmetics.ts
   ├─ domain/               logica pura, senza React: è qui che vanno i test Vitest
   │  ├─ loads.ts           %×1RM, arrotondamento, dischi per lato, Epley
   │  ├─ session.ts         espande un Day nella sequenza di "step" del player
   │  ├─ activation.ts      sceglie le 2 coppie del giorno
   │  ├─ xp.ts · levels.ts · streak.ts · drive.ts · badges.ts · stats.ts
   │  └─ progress.ts        1RM stimati, PR, proposte di aggiornamento 1RM
   ├─ db/                   Dexie: schema, migrazioni, export/import JSON
   ├─ store/                Zustand: profile, activeSession, settings
   ├─ features/
   │  ├─ splash/ onboarding/ home/ preview/ player/ interval/
   │  ├─ summary/ player-card/ history/ settings/ week/
   ├─ avatar/               Three.js procedurale: build/ (casco, corpo...), anim/, Avatar.tsx
   ├─ ui/                   Button, BigNumber, Timer ring, YardField, RadarChart (SVG), Sheet...
   └─ lib/                  haptics, audio (WebAudio beep, nessun file), wakeLock, time
```

\* Per l'icona dell'app installata serve un'immagine quadrata. Due opzioni: (a) un fulmine originale "TT" su navy, che è la scelta di default; (b) il logo originale centrato su sfondo navy, senza modificarlo, solo se mi confermi che va bene (§8).

## 2. Modello dati

### Programma (statico, `src/data/program.ts`)

```ts
type LiftKey = 'deadlift' | 'bench' | 'squat' | 'pullup' | 'trapbar' | 'military';
type BlockKind = 'activation' | 'plyo' | 'strength' | 'hypertrophy' | 'conditioning';

interface Range { min: number; max: number }          // es. reps 2–3, recupero 180–240 s

type Prescription =
  | { kind: 'straight'; sets: number; reps: Range; intensity?: Intensity }
  | { kind: 'wave'; sets: number; steps: { reps: number; pct: number }[] } // squat 3@85 → 2@90 → 1@95
  | { kind: 'distance'; sets: number; meters: Range }                       // sprint
  | { kind: 'interval'; on: number; off: number; rounds: number; machines: Machine[] };

interface Intensity { pct: number; of: LiftKey }      // trap-bar jump: { pct: 40, of: 'trapbar' }

interface Exercise {
  id: string; name: string; prescription: Prescription;
  rest?: Range;                 // secondi
  pairing?: { with: string; mode: 'in-rest' | 'superset' };
  // in-rest  = lanci con palla medica nelle 4 pause tra i 5 sprint
  // superset = lat machine ↔ single-leg squat: A1, B1, recupero, A2, B2, ...
  unilateral?: boolean; notes?: string;
}
interface Block { kind: BlockKind; title: string; optional?: boolean; exercises: Exercise[] }
interface Day { id: 1 | 2 | 3; title: string; activationFocus: ('upper'|'trunk'|'lower')[]; blocks: Block[] }
```

### Dati utente (Dexie / IndexedDB)

| Tabella | Contenuto |
|---|---|
| `profile` (1 riga) | nome, numero (1–99), ruolo, 1RM per lift `{ value, source: 'tested'\|'epley', date }`, peso corporeo (serve per le trazioni) |
| `settings` | arrotondamento (1,25 / 2,5 / 5), peso del bilanciere, dischi disponibili, suoni, vibrazione, motion |
| `sessions` | dayId, inizio/fine, attivazione scelta, `sets[]` (prescritto vs effettivo: kg, rip, RPE, completato), conditioning sì/no |
| `oneRmHistory` | storico 1RM (inseriti a mano o accettati da una proposta) |
| `game` | XP, livello, statistiche, badge `{ id, date }`, cosmetici sbloccati ed equipaggiati, streak, timeout usati per mese |
| `activeSession` | snapshot della seduta in corso: se il telefono si blocca o l'app viene chiusa, si riprende da lì |

Export/import: un JSON versionato `{ schema: 1, exportedAt, profile, settings, sessions, oneRmHistory, game }`, con validazione all'import e conferma prima di sovrascrivere.

## 3. Regole di calcolo (Fase 2, coperte da test)

- **Carico** = `arrotonda(pct × 1RM, passo)`. L'arrotondamento è al passo più vicino, mai sopra il 1RM.
- **Squat a onde**: ogni serie = 3 step, cioè 85% → 90% → 95% dello stesso 1RM (il "+5%" del brief è inteso in punti percentuali). Test dedicato con 1RM = 140 kg, arrotondamento 2,5 → 120 / 125 / 132,5 kg.
- **Dischi per lato**: algoritmo greedy sui dischi disponibili (25, 20, 15, 10, 5, 2,5, 1,25). Se il carico non è componibile, lo segnala.
- **Epley**: `1RM = peso × (1 + rip/30)`, valido da 2 a 10 rip. Il risultato è marcato come "stima" in tutta l'app.
- **Trazioni**: il 1RM si inserisce come peso totale (corpo + zavorra). Carico da usare = `pct × totale − peso corporeo`. Se è positivo diventa zavorra; se è negativo diventa "assistita: −X kg" (elastico o macchina).
- **Esercizi senza %** (ipertrofia, plyo): il campo carico propone l'ultimo carico usato in quell'esercizio.
- **Proposta di nuovo 1RM**: quando una serie registrata dà un Epley più alto del 1RM corrente (RPE ≥ 8 oppure ≤ 5 rip), compare una card "Aggiorna 1RM?" nel riepilogo. Mai automatico.

## 4. Flussi principali

1. **Prima apertura**: Splash → Onboarding (profilo → 1RM con "Non lo so → stima" → nota sulla supervisione dello staff, con checkbox obbligatoria) → Home.
2. **Allenamento**: Home "Inizia Day X" → Anteprima (blocchi, carichi del giorno, attivazione proposta e modificabile, "Mi sento freddo") → Player → (Interval timer se scelto il conditioning) → Riepilogo → Home.
3. **Player come sequenza di step**: `session.ts` trasforma il Day in una lista piatta di step (`set`, `rest`, `wave-step`, `paired-in-rest`, `interval`). Il player è una macchina a stati semplice su questa lista. Questo rende testabili gli accoppiamenti:
   - Sprint: `sprint 1 → recupero 3' con card "Lanci palla medica 4 × 4 (serie 1/4)" → sprint 2 → …`. Dopo l'ultimo sprint non c'è nessun lancio.
   - Superset: `lat 1 → SL squat 1 → recupero → lat 2 → …`.
4. **Recupero**: parte da solo al check della serie. Il default è il valore minimo dell'intervallo, con +15 s, −15 s e "Salta". A fine recupero: vibrazione, beep e schermo acceso (Wake Lock).

## 5. Wireframe testuali

**Home**
```
┌───────────────────────────────┐
│ [logo]          Lv 4 STARTER  │
│                               │
│        ( avatar 3D #23 )      │  ← trascinabile per ruotare
│      ▓▓▓▓▓▓▓░░░ 1.240/1.800 XP │
│                               │
│ DRIVE  |0 ─ ─ 🏈─ ─ ─ ─ 100|  │  ← campo da yard, 2/3 sedute
│ 🔥 Streak 5 settimane  ⏸ 1    │
│                               │
│ ┌───────────────────────────┐ │
│ │   INIZIA  DAY 3   ⚡       │ │  ← CTA 64 px
│ └───────────────────────────┘ │
│ Ultima: Day 2 · mer 22/10      │
├───────────────────────────────┤
│ 🏠  📅  🧍 Scheda  📈  ⚙       │
└───────────────────────────────┘
```

**Player** (la schermata principale)
```
┌───────────────────────────────┐
│ FORZA · 2/4         ✕  ⏸      │
│ SQUAT — onda                  │
│ Serie 3 di 6   ●●◐○○○         │
│ Step  ① 85% ─ ② 90% ─ ③ 95%   │
│                               │
│          125 kg               │  ← 96 px
│          2 RIP                │
│   per lato: 20·20·10·2,5      │
│                               │
│ [ −2,5 ]  kg / rip  [ +2,5 ]  │
│ RPE  6 7 8 9 10               │
│ ┌───────────────────────────┐ │
│ │      ✓  STEP FATTO        │ │  ← 64 px, verde
│ └───────────────────────────┘ │
│  mini avatar ↘ (saltello)     │
└───────────────────────────────┘
```
Durante il recupero lo schermo diventa un anello di countdown grande, con "Prossimo: Squat serie 4 · 120 kg × 3" ed eventualmente la card dell'esercizio accoppiato.

**Interval timer 20/20 × 12**: tutto lo schermo pieno di colore. ON = giallo con testo navy ("SPINGI"), OFF = navy con testo bianco ("RECUPERA"). Numero da 160 px, round 7/12, beep negli ultimi 3 s di ogni fase. Il colore non è l'unico segnale: cambiano anche la parola e il suono.

**Anteprima seduta**: lista dei blocchi a fisarmonica con il carico calcolato per ogni esercizio, la card "Attivazione: Lower (90/90 + pigeon) · Upper (cobra + thread)" con "Cambia", il toggle "Mi sento freddo (+1 serie)" e il toggle "Conditioning".

**Riepilogo**: XP guadagnati (con il conteggio animato), il campo del drive che avanza (TOUCHDOWN se è la terza seduta), i nuovi badge, le proposte di 1RM, l'avatar che esulta.

**Scheda giocatore**: avatar grande, radar a 5 assi (POT, FOR, MAS, RES, MOB), griglia dei cosmetici (bloccati o sbloccati), badge.

**Storico**: lista delle sedute; grafico SVG dei 1RM stimati nel tempo (un lift alla volta, selezionabile); PR in evidenza; volume settimanale.

**Settimana**: 7 giorni con i 3 slot (default lun/mer/ven) e un avviso se due sedute sono a meno di 48 h.

**Impostazioni**: 1RM, peso corporeo, arrotondamento, bilanciere e dischi, suoni e vibrazione, riduzione delle animazioni, export/import, reset.

## 6. Gamification: numeri iniziali (da tarare)

- **XP**: serie completata +10, step dell'onda +5, attivazione +30, seduta completa +100, conditioning +40. I carichi oltre la prescrizione non danno bonus. I recuperi saltati non tolgono XP ma il riepilogo li evidenzia.
- **Livelli** (XP cumulativi): Rookie 0 · Practice Squad 500 · Special Teams 1.500 · Starter 3.500 · Captain 7.000 · All-Pro 12.000 · Thunder Legend 20.000. Con circa 3 sedute a settimana da circa 350 XP, si arriva a Legend in circa 5 mesi.
- **Statistiche**: ogni serie aggiunge punti alla statistica del suo blocco. Il radar mostra le ultime 8 settimane normalizzate, così riflette la costanza recente e non solo l'accumulo.
- **Drive**: ogni seduta della settimana (lun–dom) = +33 yard; la terza = TOUCHDOWN.
- **Streak**: si conta in settimane con 3 sedute. Un timeout al mese congela la settimana, si attiva a mano e c'è un avviso la domenica se la settimana è incompleta.
- **Sblocchi**: livello e badge sbloccano i cosmetici (strisce sul casco, visiera, guanti, scarpini, fascia, aura di fulmini, maglia away).

## 7. Avatar: approccio tecnico

- Costruito con primitive di Three.js (Box, Capsule, Sphere, Cylinder a pochi segmenti) + `flatShading`, circa 2–3k triangoli. Il casco è una sfera tagliata con la griglia fatta di cilindri sottili.
- Il numero di maglia è una `CanvasTexture` generata al volo con Barlow Condensed (nessun asset esterno).
- Gerarchia di gruppi (bacino → busto → testa e braccia) animata in modo procedurale con `useFrame`: respiro, saltello, esultanza, flessione, fulmini con linee emissive e bloom leggero.
- `frameloop="demand"` quando è fermo; `prefers-reduced-motion` mostra una posa statica.
- Il modulo 3D viene caricato in modo lazy, così il player si apre subito anche su telefoni lenti.

## 8. Domande aperte (rispondi prima che io parta)

1. **Squat a onde, recupero tra gli step**: tra 85% → 90% → 95% dentro la stessa serie propongo 60–90 s, giusto il tempo di cambiare i dischi; tra una serie e l'altra 3–4'. Va bene?
2. **Trazioni**: 1RM come peso totale (corpo + zavorra), come proposto al §3?
3. **Recupero di default**: il minimo dell'intervallo (es. 3' su 3–4'), oppure il valore medio?
4. **Icona PWA**: fulmine originale (default) o logo originale su sfondo navy?
5. **Giorni della settimana di default**: lun / mer / ven?
6. **Logo**: puoi caricare i file originali? Il sito non è raggiungibile da questo ambiente.

## 9. Fasi successive (come da brief)

| Fase | Consegna |
|---|---|
| 2 | Scaffold di Vite, Tailwind e PWA, token, `program.ts`, `domain/loads` e `session` + test |
| 3 | Onboarding, anteprima, player, timer di recupero, interval timer, riepilogo base. Prima funzionante, poi bello |
| 4 | Avatar 3D |
| 5 | XP, livelli, drive, streak, badge, cosmetici, scheda giocatore, storico |
| 6 | Rifinitura visiva, PWA offline, accessibilità (AA, reduced-motion), Lighthouse |

A fine di ogni fase: commit, riepilogo e istruzioni per provarla.
