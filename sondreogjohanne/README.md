# Sondre & Johanne — bryllupssider

Passordbeskytta bryllupsside og bryllupsplanleggar på `abstinensa.no/sondreogjohanne/`.

## Passord

- Hovudsida: `bryllup`
- Planleggaren: `iloveyou`

Innhaldet på begge sider er kryptert (AES-GCM, nøkkel utleda av passordet via
PBKDF2) — passordet finst ikkje i klartekst nokon stad i koden, og "Vis
kjeldekode" viser berre kryptert tekst. Sjå `crypto-lock.js` for korleis
opplåsinga fungerer.

**For å endre passord eller innhald:**

1. Endre HTML-innhaldet du vil ha (t.d. seksjonane i hovudsida, eller
   fane-panela i planleggaren).
2. Lagre det nye innhaldet i ei fil, t.d. `/tmp/innhald.html`.
3. Krypter det på nytt:
   ```bash
   node tools/encrypt.mjs <nytt-passord> /tmp/innhald.html
   ```
4. Lim inn JSON-resultatet (`salt`, `iv`, `ciphertext`) som verdien for
   `payload` i `<script type="module">`-blokka i `index.html`, eller i
   `planlegger/js/main.js` for planleggaren.

(Den gamle løysinga — eit klartekst-passord sjekka i JS, med innhaldet
allereie liggande usynt i sida — er fjerna. Den ga ingen reell beskyttelse:
kven som helst kunne lese både passord og innhald via "Vis kjeldekode",
heilt utan å måtte gjette passordet.)

## Datalagring

Data lagrast i nettlesaren sin `localStorage`. Konsekvensar:

- **Per nettlesar:** Sondre på sin PC og Johanne på hennar har *kvar sin* data. Sida synkroniserer ikkje mellom einingar.
- **Tapsrisiko:** Om nettlesardata vert rydda (cache-clear, ny nettlesar, nytt utstyr), forsvinn alt.
- **Eksport/import:** Du kan bruke DevTools → Application → Local Storage til å sjå, kopiere eller sikkerhetskopiere data.

Viss du seinare vil ha delt data mellom Sondre og Johanne (og gjester i
gåvelista), kan du byte til Firebase Firestore i staden for `store.js`.
**⚠️ Viktig:** ikkje bruk opne Firestore-reglar (`allow read, write: if
true`) slik ein tidlegare plan for dette prosjektet foreslo — sjå
`docs/superpowers/plans/2026-04-19-sondreogjohanne-bryllupssider-plan.md`.
Med opne reglar kan kven som helst som finn Firebase-konfigurasjonen (som
uansett må liggje offentleg i frontend-koden) lese og skrive *all* data
direkte via Firebase sitt SDK — namn, telefon, e-post, allergiar, budsjett
— heilt utanom sidepassordet. Bruk i staden ekte Firestore-reglar (t.d.
autentisering via Firebase Auth + `request.auth != null`, eller minimum
eit hemmeleg dokument-basert "passord" sjekka i reglane) før du legg inn
ekte gjestedata i ei delt sky-database.

## Feilsøking

**Sida er tom etter passord:** Sjekk DevTools → Console for JavaScript-feil.

**Data forsvann:** Sjekk at du er i same nettlesar og ikkje i inkognito-modus. localStorage er bunden til nettlesar + domene.

## Utvide

Legge til ein ny planleggar-modul: lag `planlegger/js/<namn>.js` med `export function init(panelEl)`, legg til ein fane-knapp i `planlegger/index.html`, og register modulen i `planlegger/js/main.js`.
