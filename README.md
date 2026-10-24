# Thunders Training

Web app mobile-first (PWA installabile, funziona offline) per il programma di forza e potenza degli atleti dei **Thunders Trento**.

- Scheda su 3 giorni con carichi calcolati dalle % di 1RM (arrotondamento 1,25 / 2,5 / 5 kg, dischi per lato).
- Workout player con timer di recupero automatico, accoppiamenti (sprint ↔ lanci con palla medica; lat machine ↔ single-leg squat), squat a onde 85 → 90 → 95%, RPE.
- Interval timer 20″/20″ × 12 per il conditioning.
- Avatar 3D low-poly procedurale (Three.js), XP, livelli da Rookie a Thunder Legend, drive settimanale, streak con timeout, badge e sblocchi estetici.
- Storico, record personali, grafico del 1RM stimato, export/import JSON. Nessun backend: i dati restano sul telefono.

> I carichi sono calcolati sui 1RM inseriti dall'atleta. La scheda va seguita sotto la supervisione dello staff tecnico.

## Avvio in locale

Serve Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173 (apri da telefono con l'IP del PC: npm run dev -- --host)
npm test           # test della logica (Vitest)
npm run typecheck
npm run build      # build di produzione in dist/ con service worker
npm run preview    # serve la build: è qui che la PWA funziona offline
```

Per installarla su un telefono serve HTTPS (ad esempio su Netlify, Vercel o GitHub Pages: la build usa percorsi relativi e routing con hash, quindi funziona anche in una sottocartella).

## Brand

- `public/brand/logobianco.png` e `public/brand/logogiallo.jpg` sono **placeholder**: vanno sostituiti con i file originali, con gli stessi nomi. Il logo si usa solo nella forma originale.
- I colori sono token CSS in `src/styles/tokens.css` (sia in hex sia come canali RGB per Tailwind). Per estrarre la palette dai loghi originali: `npm run palette -- public/brand/logogiallo.jpg public/brand/logobianco.png --k=6`, poi aggiorna i token. Dettagli in `docs/brand-research.md`.
- Le icone PWA (`public/icons/`) sono originali e si rigenerano con `node scripts/make-icons.mjs`.

## Struttura

```
src/
  data/       la scheda (program.ts), libreria attivazione, livelli, badge, cosmetici
  domain/     logica pura e testata: carichi, sequenza della seduta, interval, XP, streak, badge, PR
  db/         IndexedDB (Dexie) e backup JSON
  store/      seduta in corso (Zustand, salvata a ogni passo), letture reattive, stato di gioco derivato
  avatar/     avatar 3D procedurale e pose animate
  features/   una cartella per schermata
  ui/         componenti condivisi
```

Il player non conosce la scheda: `domain/session.ts` trasforma un Day in una lista di step (serie, recuperi, step dell'onda, intervalli), e il player la percorre. Lo stato di gioco (XP, livello, badge, streak) non è salvato ma ricalcolato dallo storico delle sedute, quindi non può andare fuori sincrono.

Piano e decisioni: `docs/PLAN.md`.
