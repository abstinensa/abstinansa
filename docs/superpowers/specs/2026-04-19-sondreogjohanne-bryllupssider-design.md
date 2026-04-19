# Bryllupssider for Sondre & Johanne — design

**Dato:** 2026-04-19
**Kontekst:** Ny underseksjon på `abstinensa.no` med ei passordbeskytta bryllupsside og ein passordbeskytta bryllupsplanleggar-app for Sondre og Johanne.

## Mål

Gi Sondre og Johanne:

1. Ei delbar bryllupsside gjester kan besøke for informasjon om dagen og for å reservere gåver.
2. Ein privat planleggar-app for dei to der dei har kontroll på sjekkliste, budsjett, gjester, leverandørar, program, bordplan, musikk og gåveliste — med data delt i sanntid mellom einingane deira.

## Ikkje-mål

- Ekte tryggleik. Passordbeskyttinga er berre for å halde tilfeldige besøkande ute. Sida er ikkje eigna for sensitiv informasjon.
- SMS-utsending til gjester (krev betalt teneste).
- Dedikert mobilapp (sida er mobilvenleg via nettlesar).
- Fleirbrukar-innlogging med individuelle kontoar. Passordet er delt.

## Arkitektur

Rein statisk HTML/CSS/JS, ingen byggprosess. Filer blir lagt i eksisterande `abstinansa/`-repo og deployast via GitHub Pages.

```
abstinansa/
├── sondeogjohanne/
│   ├── index.html              # hovudsida (passord: bryllup)
│   ├── styles.css               # felles stil for begge sider
│   ├── firebase-config.js       # Firebase-konfig (lim inn etter Firebase-oppsett)
│   └── planlegger/
│       └── index.html          # planleggar-app (passord: iloveyou)
```

URL-ar:
- `https://abstinensa.no/sondeogjohanne/`
- `https://abstinensa.no/sondeogjohanne/planlegger/`

### Passordbeskytting

Enkel JavaScript-sjekk ved innlasting:

1. Side lastar med `display:none` på `<main>`.
2. `prompt()` spør om passord.
3. Feil passord → ny prompt. Tom eller cancel → `document.body` blir erstatta med ei enkel melding.
4. Rett passord → lagrar flag i `sessionStorage` så bruker slepp å skrive passord på nytt ved navigasjon mellom undersidene.

Passord ligg i kjeldekoden. Brukar er opplyst om at dette ikkje er ekte tryggleik.

### Datalagring — Firebase Firestore

Begge sider koplar seg til same Firestore-database. Data synkroniserast i sanntid mellom alle opne fanar.

**Firestore-collections:**

- `gjester` — eitt dokument per gjest
- `sjekkliste` — eitt dokument per oppgåve
- `budsjett` — eitt dokument per budsjettpost
- `leverandorer` — eitt dokument per leverandør
- `program` — eitt dokument per programpost
- `bord` — eitt dokument per bord (bordkart)
- `musikk` — underinndelt med ønskjeliste, forbode-liste, spesielle augneblink
- `gaveliste` — eitt dokument per gåve, med felt `reservertAv` (tom string om ledig)
- `meta` — parets generelle info (bryllupsdato, stad osv.)

**Firestore-reglar:** Alle dokument er lesbare av alle (read: true). Skriv er også tillate av alle (write: true). Dette er enkelt og passar scope — det finst ingen reell tryggleiksgrense her. Passord gir berre "soft gate".

### Teknologi

- HTML5 + vanilla CSS (gjenbruk av designtokens frå `abstinensa.no` — same fargepalett og typografi)
- Vanilla JavaScript (ingen framework)
- Firebase Web SDK v10 via CDN (modular import)
- Ingen byggsteg, ingen npm

## Hovudsida — `/sondeogjohanne/`

Ein lang scroll-side med seksjoner:

1. **Velkomst** — namna til Sondre & Johanne, dato (TBC)
2. **Når & kor** — dato, klokkeslett, vigsel-stad, festlokale (TBC)
3. **Program for dagen** — henta frå Firestore `program` (eller fast TBC om tomt)
4. **Dresscode** — TBC
5. **Overnatting & reise** — TBC (hotell, parkering, kollektiv)
6. **Gåveliste** — sjå eige avsnitt
7. **Kontakt** — telefonnummer til forlovarar (TBC)

### Gåveliste-flyt

Vising: kort per gåve med tittel, beskriving, lenke (til butikk), pris, status (ledig/reservert).

**For ledige gåver:**
- Knapp "Eg tar denne"
- Klikk opnar modal som ber om gjestens namn
- Ved innsending: gåve blir markert som reservert, `reservertAv`-felt blir sett til namnet

**For reserverte gåver:**
- Tekst "Reservert" vises (ikkje namnet — A3: anonymt for andre gjester)
- Liten "Angre"-lenke. Klikk opnar prompt "Skriv namnet ditt for å angre". Matchar input `reservertAv` → frigjer gåva. Matchar ikkje → feilmelding.

**Først til mølla** (B1) — ingen spleise-funksjon, kvar gåve kan reserverast av éin person.

Gåver redigerast frå planleggaren (ikkje frå hovudsida).

## Planleggaren — `/sondeogjohanne/planlegger/`

Ein SPA-aktig side med sidebar/tabs for 8 modular. All data levest frå Firestore. Endringar lagrast med ein gong.

### 1. Sjekkliste

Forhandsutfylt ved første besøk med vanlege bryllupsoppgåver (~20 stk: bestill lokale, send save-the-date, send invitasjonar, prøv brudekjole, bestill fotograf, osv.).

Felt per oppgåve: tittel, frist (valfri), ansvarleg (Sondre / Johanne / Begge), status (å gjere / pågår / ferdig), notat.

Visning: sortert på frist, grupperingar kan leggast til seinare om ynskja.

### 2. Budsjett

Forhandsutfylt med vanlege postar (~15 stk: lokale, mat & drikke, fotograf, kake, pynt, brudekjole, dress, ringar, musikk/DJ, invitasjonar, bryllupsreise, transport, brudebukett, prest/vigslar, diverse).

Felt per post: kategori, estimert sum, faktisk sum, status (planlagt / bestilt / betalt), notat.

Oversikt øverst: total estimert, total faktisk, differanse.

### 3. Gjesteliste

Felt per gjest: namn, telefon, e-post, rolle (forlovar / familie / venn / kollega / anna), RSVP-status (venter / kjem / kjem ikkje), kaffe eller middag, allergiar/diettar, notat.

Oversikt: tal gjester per status, tal som kjem til middag vs kaffe.

### 4. Leverandørar

Felt per leverandør: namn, type (fotograf / catering / DJ / florist / ...), kontakt (telefon/e-post), pris, status (kontakta / bestilt / betalt / avlyst), notat, lenke.

### 5. Tidslinje / program for dagen

Felt per programpost: tidspunkt, hending, notat.

Visning: sortert kronologisk. Kan eksporterast til hovudsida sitt program-avsnitt automatisk (les same collection).

### 6. Bordkart

Dra-og-slepp-grensesnitt.

- Legg til bord: form (rundt / rektangulært), namn, tal plassar
- Dra gjester frå sidelinje (henta frå gjestelista) til plassar ved bordet
- Gjester som allereie er plassert vises ikkje i sidelinja
- Eksport: "Skriv ut"-knapp (browserens print → PDF-mulighet)

### 7. Musikk & dans

Tre underseksjoner:

- **DJ-info:** namn, kontakt, pris, timar, notat
- **Spelliste-ønskje:** liste med songtittel, artist, notat (t.d. "skal spelast tidleg")
- **Forbode-liste:** liste med songtittel, artist, grunn (valfritt)
- **Spesielle augneblink:** liste med hending (første dans / bruevals / kastedans / ...), songval, tidspunkt

### 8. Gåveliste (redigering)

Felt per gåve: tittel, beskriving, lenke (til butikk), prisestimat, `reservertAv` (synleg for paret — kven har reservert).

Knappar: legg til gåve, slett gåve, nullstill reservasjon.

Her ser Sondre og Johanne kven som har reservert kva (i motsetnad til hovudsida der det er anonymt).

## Brukaroppsett (ein gong)

Brukar får detaljerte steg-for-steg-instruksjonar:

1. Opprett Firebase-prosjekt på console.firebase.google.com
2. Aktiver Firestore Database (start i test-modus)
3. Registrer web-app, kopier config-objektet
4. Lim inn i `sondeogjohanne/firebase-config.js` (klargjort med plassholdarar)
5. Sett Firestore-reglar (oppgitt i README eller kommentar)
6. Commit og push til GitHub → live på abstinensa.no/sondeogjohanne/

## Feilhandtering

- **Firebase ikkje tilgjengeleg / nettet nede:** Vis banner "Kan ikkje kople til data. Prøv igjen." Sida fungerer som read-only frå cache om Firestore har offline persistence aktivert.
- **Gåve allereie reservert (race condition):** Ved klikk på "Eg tar denne" gjer klienten ein transaksjonssjekk mot Firestore. Om `reservertAv` allereie er sett av nokon andre → melding "Beklager, nokon andre kom først!"
- **Feil passord:** Kontinuerleg ny prompt til rett eller cancel. Cancel → tom side med lenke tilbake til abstinensa.no.

## Testing

Manuell testing dekkjer:

- Passord-flyt (rett passord, feil passord, cancel, sessionStorage-persistens)
- CRUD på kvar modul i planleggaren
- Gåvereservasjon (reserver, angre med rett namn, angre med feil namn)
- Race condition på gåvereservasjon (to fanar samtidig)
- Visning på mobil (hovudsida og planleggaren)
- Firestore-reglar (ingen ekstern skriv utan rett struktur)

Ingen automatiske tester — for lite prosjekt, rein CRUD mot Firebase.

## Opne spørsmål / framtidige utvidingar

- RSVP-skjema direkte på hovudsida (krev at gjester kan oppdatere `gjester`-kolleksjonen, litt meir logikk rundt å knytte RSVP til eksisterande gjest)
- SMS-utsending til gjester (krev Twilio + betaling)
- Eksport av bordkart til PDF via bibliotek (no berre browser-print)
- Fotogalleri etter bryllupet
