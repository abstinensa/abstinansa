# Sondre & Johanne — bryllupssider

Passordbeskytta bryllupsside og bryllupsplanleggar på `abstinensa.no/sondreogjohanne/`.

## Passord

- Hovudsida: `bryllup`
- Planleggaren: `iloveyou`

(Endre ved å søkje/erstatte i `index.html` og `planlegger/index.html` — leit etter `correct:`.)

## Firebase-oppsett (må gjerast ein gong)

Sidene brukar Firebase Firestore for å lagre og synkronisere data. Du må opprette eit gratis Firebase-prosjekt:

1. Gå til <https://console.firebase.google.com>, logg inn med Google-konto.
2. Klikk **Add project**. Namn: `sondreogjohanne`. Hopp over Google Analytics. Opprett.
3. I venstremeny: **Build → Firestore Database → Create database**.
   - Vel **Start in test mode**
   - Region: `eur3 (europe-west)`
   - Klikk **Enable**.
4. Klikk tannhjul-ikonet ved **Project Overview → Project settings**.
5. Rull ned til **Your apps**, klikk web-ikonet (`</>`).
   - App-namn: `sondreogjohanne-web`
   - Ikkje hook opp Firebase Hosting
   - Klikk **Register app**
6. Kopier verdiane i `firebaseConfig`-objektet og lim dei inn i `sondreogjohanne/firebase-config.js` (erstatt alle `REPLACE_ME`).
7. I Firebase Console: **Firestore → Rules**, lim inn og publiser:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

   (Passordet i sida gir "soft-gate". Firestore er ikkje låst — dette er medvite for scope.)

8. Commit og push. GitHub Pages deployar automatisk.

## Feilsøking

**Sida er tom etter passord:** Sjekk DevTools → Console. Vanlegvis Firebase-config feil eller manglande internett.

**"Firebase: Error (auth/invalid-api-key)":** `firebase-config.js` har framleis `REPLACE_ME`-verdiar.

**Gåvereservasjon fungerer ikkje:** Sjekk Firestore-reglane i Firebase Console (steg 7).

## Utvide

Legge til ein ny planleggar-modul: lag `planlegger/js/<namn>.js` med `export function init(panelEl)`, legg til ein fane-knapp i `planlegger/index.html`, og register modulen i `planlegger/js/main.js`.
