# Design: Ilyas sin dating coach — stigespel

**Dato:** 2026-05-27  
**Prosjekt:** abstinensa.no  
**URL:** abstinensa.no/ilyas.html (ikkje lenkja frå framsida)

---

## Oversikt

Eit solo stigespel i nettlesaren der Ilyas ruller terning og navigerer eit dating-tema brett. Spelet er skrive på stord-dialekt, humoristisk i tonen, og svaret er alltid Stine. Ein innebygd AI-chatbot fungerer som dating coach gjennom heile spelet.

---

## Arkitektur

- **`abstinensa/ilyas.html`** — éi sjølvstendig fil med inline CSS og JS, same mønster som `oslo-events.html` og `spill.html`
- **Cloudflare Worker** — brukar eksisterande `worker.js`-endepunkt for Claude API-kall, ingen endringar nødvendig
- **Ingen byggsteg** — opnast direkte i nettlesar

---

## Brett og mekanikk

- 30 ruter i eit 5×6 CSS grid-brett (rad 1: rute 1–6, rad 2: 7–12 osv., annankvar rad er snudd)
- Spelaren ruller ein terning (animert) og rykker éin brikke framover
- Brikke: 🕺-emoji for Ilyas
- **Stigar (6 stk):** Gode datingval — spelaren hoppar fram. Eks: rute 10 → 18
- **Slangar (4 stk):** Dårlege datingval — spelaren dreg bakover. Eks: rute 20 → 14
- **Slutt-ruta (#30):** "Du landa på Stine 🎉" — spelet er vunne
- Kvar rute har ein kort tekst på stord-dialekt som vises når spelaren landar

### Stiger og slangar (posisjonar)
| Type | Frå | Til |
|------|-----|-----|
| Stige | 4 | 14 |
| Stige | 10 | 18 |
| Stige | 17 | 24 |
| Stige | 21 | 27 |
| Stige | 23 | 29 |
| Stige | 26 | 30 |
| Slange | 9 | 3 |
| Slange | 16 | 6 |
| Slange | 20 | 12 |
| Slange | 25 | 8 |

### Rutetekstar (utval)
| Rute | Tekst |
|------|-------|
| 5 | "Du smilte til henne i kantina. Bra start, Ilyas." |
| 10 ⬆️ | "Du bydde på middag! Stor stige — +8!" |
| 15 | "Du venta to dagar før du skreiv. Klassisk." |
| 20 🐍 | "Du skreiv berre 'hei' på Tinder. Ned att, ven." |
| 28 | "Du er så nærme no. Ho bur forresten på Stord." |
| 30 | "STINE! Det var jo Stine heile tida!" |

---

## Dating coach-chatbot

- Alltid synleg som ein "Spør coachen 🎙️"-knapp nedst til høgre
- Opnar ein chat-modal der Ilyas kan stilla spørsmål
- Claude API-kall via eksisterande Cloudflare Worker
- **System prompt:**
  > Du er Ilyas sin personlege dating coach. Du snakkar stord-dialekt (t.d. "koss", "ikkje", "noko", "heime", "nokon"). Du er morosam, litt overdriven entusiastisk, og alltid partisk: svaret er alltid Stine, same kva spørsmålet er. Du nemner aldri at du er ein AI. Svar i 3–5 setningar.
- Ved landing på ei stige eller slange: coachen kjem automatisk med ein kommentar etter 1 sekund, før neste terningkast
- Fontar lastast via `<link>` til Google Fonts (DM Serif Display + Outfit)

---

## Visuell stil

- Følgjer abstinensa-paletten: `--ink`, `--cream`, `--accent` (#c4593e), `--gold` (#b8944f)
- Fontar: DM Serif Display (overskrifter) + Outfit (brødtekst) frå Google Fonts
- Brett: leikete men stilreint, passar til resten av abstinensa.no
- Brikke: ein enkel emoji eller SVG-avatar for Ilyas

---

## Det som ikkje er med

- Ingen highscore eller lagring
- Ingen fleirspelarmodus
- Ikkje lenkja frå `index.html` eller `en.html`
- Ingen endringar i eksisterande `worker.js`

---

## Suksesskriterium

1. Ilyas kan spela stigespelet frå start til mål
2. Chatboten svarar på stord-dialekt og nemner alltid Stine
3. Sida lever på `abstinensa.no/ilyas.html` utan å dukka opp i navigasjon
