# Sondre & Johanne — bryllupssider

Passordbeskytta bryllupsside og bryllupsplanleggar på `abstinensa.no/sondreogjohanne/`.

## Passord

- Hovudsida: `bryllup`
- Planleggaren: `iloveyou`

(Endre ved å søkje/erstatte i `index.html` og `planlegger/index.html` — leit etter `correct:`.)

## Datalagring

Data lagrast i nettlesaren sin `localStorage`. Konsekvensar:

- **Per nettlesar:** Sondre på sin PC og Johanne på hennar har *kvar sin* data. Sida synkroniserer ikkje mellom einingar.
- **Tapsrisiko:** Om nettlesardata vert rydda (cache-clear, ny nettlesar, nytt utstyr), forsvinn alt.
- **Eksport/import:** Du kan bruke DevTools → Application → Local Storage til å sjå, kopiere eller sikkerhetskopiere data.

Viss du seinare vil ha delt data mellom Sondre og Johanne (og gjester i gåvelista), kan du byte til Firebase Firestore. Det krev ~5 min oppsett og endring av `store.js`.

## Feilsøking

**Sida er tom etter passord:** Sjekk DevTools → Console for JavaScript-feil.

**Data forsvann:** Sjekk at du er i same nettlesar og ikkje i inkognito-modus. localStorage er bunden til nettlesar + domene.

## Utvide

Legge til ein ny planleggar-modul: lag `planlegger/js/<namn>.js` med `export function init(panelEl)`, legg til ein fane-knapp i `planlegger/index.html`, og register modulen i `planlegger/js/main.js`.
