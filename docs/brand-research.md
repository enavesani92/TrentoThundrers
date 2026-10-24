# Fase 0 — Ricerca brand Thunders Trento

_Data: 24/10/2026_

## Esito in breve

| Attività | Stato |
|---|---|
| Visita `trentothunders.it` | ❌ Non raggiungibile da questo ambiente: DNS non risolto e proxy in uscita con risposta 403 |
| Instagram / Facebook | ❌ Non raggiungibili (stessa policy di rete; servono comunque login) |
| Download `logobianco.png` e `logogiallo.jpg` | ❌ Sostituiti con **placeholder** dallo stesso nome in `public/brand/` |
| Script di estrazione palette | ✅ `scripts/extract-palette.mjs` (k-means sui pixel, scarta quelli trasparenti), testato sui placeholder |
| Palette reale estratta | ⏳ **Da fare** quando ci saranno i file originali |

> **Cosa ti chiedo:** sostituisci i due file in `public/brand/` con gli originali (stessi nomi). Se hai 2–3 foto delle maglie home/away, mettile in `docs/brand-ref/`. Poi lancia:
>
> ```bash
> npm i -D sharp   # già nelle devDependencies dopo lo scaffold della Fase 2
> node scripts/extract-palette.mjs public/brand/logogiallo.jpg public/brand/logobianco.png docs/brand-ref/*.jpg --k=6
> ```
>
> Oppure ricaricali e lo faccio io: aggiorno i token in `src/styles/tokens.css` e questa pagina.

## Cosa sappiamo da fonti pubbliche (ricerca web)

- Unica squadra di football americano della Provincia Autonoma di Trento. Colori **gialloblù**.
- Campo di casa: **via Fersina, Trento**. Da qui il nome del badge "Pista Fersina".
- 2024: titolo North Conference vinto 29–7 contro i Castelfranco Cavaliers. Finale del Nine Bowl XXIV a Ravenna (stadio Bruno Benelli, 5 luglio 2024) contro gli Elephants Catania.
- La sigla "IFL2" non compare nelle fonti trovate (citano CIF9 / Nine Football League). Il brief la cita: la uso solo se serve nei testi e solo nella forma che mi indichi tu.

Fonti: [il Dolomiti, finale 2024](https://www.ildolomiti.it/sport/2024/i-trento-thunders-volano-in-finale-adesso-li-attende-catania-in-palio-il-super-bowl-della-nine-football-league-ciaghi-la-promozione-ce-il-nodo-strutture) · [FIDAF, programma Nine Bowl XXIV](https://italianbowl.fidaf.org/wp-content/uploads/2024/07/Nine-Bowl-XXIV.pdf) · [l'Adige](https://www.ladige.it/sport/trento-thunders-pronti-per-i-playoff-i187v934)

## Palette di lavoro (provvisoria)

In attesa dell'estrazione uso i colori di partenza del brief. Sono tutti token CSS, quindi sostituirli cambia l'intera app.

| Token | Hex | Uso |
|---|---|---|
| `--thunder-yellow` | `#FFC20E` | accento, CTA, fulmini |
| `--thunder-navy` | `#0B1F3F` | sfondo principale |
| `--thunder-blue` | `#1D4E9E` | superfici secondarie |
| `--thunder-white` | `#F5F7FA` | testo |
| `--thunder-steel` | `#8A94A6` | testo secondario, bordi |
| `--success` | `#3DDC84` | serie completata |
| `--danger` | `#FF5A5F` | errori, avvisi |

Verifica di contrasto WCAG, calcolata sui valori provvisori:

- giallo su navy 10.1:1 ✅
- bianco su navy 15.3:1 ✅
- steel su navy 5.4:1 ✅ AA per il testo normale
- bianco su blue 7.4:1 ✅
- **steel su blue 2.6:1 ❌**: sulle card blu il testo secondario userà il bianco al 75% di opacità, non lo steel
- navy su success 9.2:1 ✅ e navy su danger 5.4:1 ✅ (testo scuro sui badge colorati)

Da verificare di nuovo con gli hex reali.

## Regole d'uso del logo

- Uso solo i file originali, senza ridisegnarli, ricolorarli o deformarli. Va bene il ridimensionamento proporzionale.
- `logobianco.png` va su sfondi scuri (splash, header). `logogiallo.jpg` va come og:image e su superfici chiare.
- Tutta la grafica di gioco (avatar, icone, badge, fulmini decorativi) è originale. I fulmini decorativi saranno disegnati in modo diverso dal simbolo del logo, per non confondersi con il marchio.
- Il logo non va mai dentro i badge o sull'avatar, perché sono elementi di gioco.

## Direzione visiva

- Dark di default: stadio di notte, gradiente radiale caldo in alto (riflettori), linee delle yard come texture sottile.
- Tipografia: **Barlow Condensed** (600/700/800) per titoli, numeri, carichi e timer; **Inter** per il testo. I font sono serviti in locale con `@fontsource`, così funzionano offline in palestra.
- Numeri dei carichi a 72–96 px, timer fino a 160 px. Tap target minimi di 56 px, CTA principali a 64 px.
