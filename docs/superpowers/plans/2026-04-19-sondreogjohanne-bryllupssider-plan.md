# Sondre & Johanne Bryllupssider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byggje ei passordbeskytta bryllupsside `/sondreogjohanne/` med gåveliste og ein planleggar-app `/sondreogjohanne/planlegger/` med åtte modular, alt med delt data via Firebase Firestore, på toppen av det eksisterande `abstinansa/`-repoet som deployer til `abstinensa.no` via GitHub Pages.

**Architecture:** Rein statisk HTML/CSS/JS utan byggprosess. Firebase Web SDK v10 via CDN. Passord-sjekk klient-side med `sessionStorage`-persistens. Delte moduler brukar ein liten Firestore-CRUD-wrapper. Planleggaren er éi HTML-side med fane-basert navigasjon mellom modulane.

**Tech Stack:** HTML5, vanilla CSS (reuse designtokens frå `abstinensa.no`), vanilla JS (ES modules), Firebase Firestore v10, GitHub Pages.

---

## File Structure

```
abstinansa/sondreogjohanne/
├── index.html              # hovudsida (passord: bryllup)
├── styles.css              # felles stilar for begge sider
├── auth.js                 # passord-prompt og sessionStorage-flag
├── firebase-config.js      # Firebase-konfig (lim inn etter oppsett)
├── firestore.js            # Firestore CRUD-helpers (subscribe, add, update, delete)
├── gaveliste-gjest.js      # gåveliste-logikk for gjester (reserver/angre)
└── planlegger/
    ├── index.html          # planleggar-shell med faner
    ├── planlegger.css      # planleggar-spesifikk stil
    └── js/
        ├── main.js         # fane-navigasjon + oppstart
        ├── crud-table.js   # gjenbrukbar tabell-modul (felt-schema → UI)
        ├── sjekkliste.js
        ├── budsjett.js
        ├── gjesteliste.js
        ├── leverandorer.js
        ├── program.js
        ├── musikk.js
        ├── gaveliste-edit.js
        └── bordkart.js     # dra-og-slepp, ikkje generisk
```

Tilleggsfiler:
- `sondreogjohanne/README.md` — Firebase-oppsett for brukar

## Phase Overview

1. **Phase 1 — Statisk grunnmur** (ingen Firebase): mapper, felles CSS, passord-auth, plassholdar-innhald. Lokal browser-testing.
2. **Phase 2 — Firebase-oppsett** (brukar utfører): konsoll, Firestore, reglar, config inn.
3. **Phase 3 — Datalag**: `firestore.js` helpers + røyktest.
4. **Phase 4 — Planleggar-modular**: åtte modular i sekvens.
5. **Phase 5 — Hovudsida-gåveliste**: synk-visning + reserver/angre.
6. **Phase 6 — Polish**: mobil, README, siste commit.

---

## Phase 1: Statisk grunnmur

### Task 1: Opprett mappestruktur og felles stilar

**Files:**
- Create: `sondreogjohanne/styles.css`
- Create: `sondreogjohanne/planlegger/planlegger.css`

- [ ] **Step 1:** Opprett mappene `sondreogjohanne/` og `sondreogjohanne/planlegger/js/` under `abstinansa/`.

- [ ] **Step 2:** Skriv `sondreogjohanne/styles.css` som gjenbrukar fargepalett frå eksisterande `index.html` (kopier `:root`-variablane, seksjonane for `body`, typografi, knappar). Legg til enkel layout (`.container`, `.section`, `.card`, `.btn`, `.btn-primary`, `.btn-ghost`).

```css
:root {
  --ink: #1a1a2e;
  --cream: #f8f6f1;
  --warm: #e8e4dc;
  --accent: #c4593e;
  --accent-light: #e8967f;
  --muted: #6b6b7b;
  --slate: #3d3d50;
  --gold: #b8944f;
  --radius: 8px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Outfit', sans-serif; background: var(--cream); color: var(--ink); -webkit-font-smoothing: antialiased; }
.container { max-width: 900px; margin: 0 auto; padding: 24px; }
.section { margin: 48px 0; }
.card { background: #fff; border-radius: var(--radius); padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 12px; }
.btn { display: inline-block; padding: 10px 18px; border-radius: var(--radius); border: none; font-family: inherit; font-size: 0.95rem; cursor: pointer; text-decoration: none; }
.btn-primary { background: var(--accent); color: var(--cream); }
.btn-primary:hover { background: var(--slate); }
.btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--muted); }
.btn-danger { background: #c94a4a; color: #fff; }
h1, h2, h3 { font-family: 'DM Serif Display', serif; font-weight: 400; }
h1 { font-size: 2.6rem; margin-bottom: 12px; }
h2 { font-size: 1.8rem; margin-bottom: 16px; }
h3 { font-size: 1.2rem; margin-bottom: 8px; }
input, textarea, select { font-family: inherit; font-size: 0.95rem; padding: 8px 10px; border: 1px solid var(--warm); border-radius: 6px; width: 100%; background: #fff; }
label { display: block; margin: 12px 0 4px; font-size: 0.85rem; color: var(--muted); }
```

- [ ] **Step 3:** Skriv `sondreogjohanne/planlegger/planlegger.css` med fane-navigasjon + datatabell-stil:

```css
.tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--warm); margin-bottom: 24px; }
.tab { padding: 10px 16px; cursor: pointer; border: none; background: transparent; font-family: inherit; font-size: 0.95rem; color: var(--muted); border-bottom: 2px solid transparent; }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 500; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--warm); font-size: 0.9rem; }
th { background: var(--warm); font-weight: 500; }
td input, td select, td textarea { border: none; padding: 4px; background: transparent; }
td input:focus, td select:focus, td textarea:focus { background: #fff9f0; outline: 1px solid var(--accent-light); }
.row-actions { white-space: nowrap; }
.add-row { margin-top: 12px; }
.summary { background: var(--warm); padding: 14px 18px; border-radius: var(--radius); margin-bottom: 16px; font-size: 0.95rem; }
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/stine/OneDrive/abstinansa"
git add sondreogjohanne/
git commit -m "scaffold: sondreogjohanne directory with shared styles"
```

### Task 2: Passord-auth-modul

**Files:**
- Create: `sondreogjohanne/auth.js`

- [ ] **Step 1:** Skriv `auth.js` som ES-modul:

```javascript
// auth.js — enkel passordbeskytting med sessionStorage
export function requirePassword({ key, correct, redirectOnCancel = '/' }) {
  const flag = `auth_${key}`;
  if (sessionStorage.getItem(flag) === '1') return true;
  let attempts = 0;
  while (attempts < 5) {
    const input = prompt(`Skriv passord for ${key}:`);
    if (input === null) {
      document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;text-align:center"><p>Tilgang kreves.</p><a href="${redirectOnCancel}">Tilbake</a></div>`;
      return false;
    }
    if (input === correct) {
      sessionStorage.setItem(flag, '1');
      return true;
    }
    attempts++;
    alert('Feil passord, prøv igjen.');
  }
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;text-align:center">For mange forsøk.</div>';
  return false;
}
```

- [ ] **Step 2: Manuell test** — lag ei mellombels `sondreogjohanne/test-auth.html` som importerer `auth.js` og kallar `requirePassword({ key: 'test', correct: 'abc' })`. Opne i browser, sjå at prompt dukkar opp. Test: rett passord, feil passord, cancel. Slett testfilen etterpå.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/auth.js
git commit -m "feat(sondreogjohanne): password protection module"
```

### Task 3: Hovudside-skjelett med plassholdar-innhald

**Files:**
- Create: `sondreogjohanne/index.html`

- [ ] **Step 1:** Skriv `sondreogjohanne/index.html` med alle seksjonar (velkomst, dato/stad, program, dresscode, overnatting, gåveliste, kontakt) som TBC-plassholdarar. Bruk passord `bryllup`.

```html
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sondre & Johanne</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <style>main { display: none; }</style>
</head>
<body>
  <main class="container">
    <section class="section" style="text-align:center;padding-top:60px">
      <h1>Sondre &amp; Johanne</h1>
      <p style="font-size:1.1rem;color:var(--muted)">skal gifte seg — <em>TBC</em></p>
    </section>

    <section class="section">
      <h2>Når &amp; kor</h2>
      <div class="card"><strong>Dato:</strong> TBC</div>
      <div class="card"><strong>Vigsel:</strong> TBC</div>
      <div class="card"><strong>Festlokale:</strong> TBC</div>
    </section>

    <section class="section">
      <h2>Program for dagen</h2>
      <div id="program-list"><p><em>Kjem snart.</em></p></div>
    </section>

    <section class="section">
      <h2>Dresscode</h2>
      <div class="card"><em>TBC</em></div>
    </section>

    <section class="section">
      <h2>Overnatting &amp; reise</h2>
      <div class="card"><em>TBC — hotell, parkering, kollektiv.</em></div>
    </section>

    <section class="section">
      <h2>Gåveliste</h2>
      <div id="gaveliste-container"><p><em>Kjem snart.</em></p></div>
    </section>

    <section class="section">
      <h2>Kontakt</h2>
      <div class="card"><em>TBC</em></div>
    </section>
  </main>

  <script type="module">
    import { requirePassword } from './auth.js';
    if (requirePassword({ key: 'bryllup', correct: 'bryllup' })) {
      document.querySelector('main').style.display = 'block';
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Manuell test** — opne `file:///C:/Users/stine/OneDrive/abstinansa/sondreogjohanne/index.html`. Verifiser: prompt → skriv `bryllup` → sida viser. Reload same tab → ikkje ny prompt (sessionStorage). Ny inkognito-tab → ny prompt.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/index.html
git commit -m "feat(sondreogjohanne): main page scaffold with password"
```

### Task 4: Planleggar-shell med faner

**Files:**
- Create: `sondreogjohanne/planlegger/index.html`
- Create: `sondreogjohanne/planlegger/js/main.js`

- [ ] **Step 1:** Skriv `planlegger/index.html` med 8 tomme fanepanel:

```html
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bryllupsplanleggar — Sondre &amp; Johanne</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="planlegger.css">
  <style>main { display: none; }</style>
</head>
<body>
  <main class="container">
    <h1 style="margin-top:40px">Bryllupsplanleggar</h1>
    <p style="color:var(--muted);margin-bottom:24px">Sondre &amp; Johanne</p>

    <div class="tabs" id="tabs">
      <button class="tab active" data-tab="sjekkliste">Sjekkliste</button>
      <button class="tab" data-tab="budsjett">Budsjett</button>
      <button class="tab" data-tab="gjesteliste">Gjesteliste</button>
      <button class="tab" data-tab="leverandorer">Leverandørar</button>
      <button class="tab" data-tab="program">Program</button>
      <button class="tab" data-tab="musikk">Musikk &amp; dans</button>
      <button class="tab" data-tab="gaveliste">Gåveliste</button>
      <button class="tab" data-tab="bordkart">Bordkart</button>
    </div>

    <div class="tab-panel active" id="panel-sjekkliste"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-budsjett"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-gjesteliste"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-leverandorer"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-program"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-musikk"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-gaveliste"><p>Lastar…</p></div>
    <div class="tab-panel" id="panel-bordkart"><p>Lastar…</p></div>
  </main>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2:** Skriv `planlegger/js/main.js`:

```javascript
import { requirePassword } from '../../auth.js';

if (!requirePassword({ key: 'planlegger', correct: 'iloveyou', redirectOnCancel: '../' })) {
  throw new Error('auth failed');
}
document.querySelector('main').style.display = 'block';

// Fane-navigasjon
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${name}`);
    });
  });
});
```

- [ ] **Step 3: Manuell test** — opne `planlegger/index.html`, passord `iloveyou`. Klikk på alle 8 faner, verifiser at rett panel vises.

- [ ] **Step 4: Commit**

```bash
git add sondreogjohanne/planlegger/
git commit -m "feat(planlegger): shell with tab navigation"
```

---

## Phase 2: Firebase-oppsett (brukar utfører)

### Task 5: Opprett Firebase-prosjekt

**Files:**
- Create: `sondreogjohanne/firebase-config.js`
- Create: `sondreogjohanne/README.md`

- [ ] **Step 1 (brukar):** Gå til <https://console.firebase.google.com>, logg inn, klikk "Add project". Namn: `sondreogjohanne`. Hopp over Google Analytics. Opprett prosjekt.

- [ ] **Step 2 (brukar):** I venstremeny: "Build" → "Firestore Database" → "Create database" → Start in **test mode** → vel region `eur3 (europe-west)` → Enable.

- [ ] **Step 3 (brukar):** I venstremeny: klikk tannhjul-ikon ved "Project Overview" → "Project settings". Rull ned til "Your apps" → klikk web-ikon (`</>`). App-namn: `sondreogjohanne-web`. Ikkje hook opp Hosting. Klikk Register.

- [ ] **Step 4 (brukar):** Kopier `firebaseConfig`-objektet (API-nøkkel, authDomain, projectId osv) — det skal sjå ut omtrent slik:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

- [ ] **Step 5:** Skriv `sondreogjohanne/firebase-config.js`:

```javascript
// LIM INN FRÅ FIREBASE CONSOLE (sjå README.md)
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
```

Brukar limer inn sine verdiar her. (Firebase web-API-nøklar er designa for å vere offentlege; tryggleik er i Firestore-reglar.)

- [ ] **Step 6 (brukar):** I Firebase Console: Firestore → Rules. Lim inn og publiser:

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

(Passordet i sida gir soft-gate; Firestore er ikkje låst.)

- [ ] **Step 7:** Skriv `sondreogjohanne/README.md` med alle steg ovanfor + note om at `firebase-config.js` er trygt å committe (offentleg API-nøkkel).

- [ ] **Step 8: Commit**

```bash
git add sondreogjohanne/firebase-config.js sondreogjohanne/README.md
git commit -m "feat(sondreogjohanne): firebase config stub and setup README"
```

---

## Phase 3: Datalag

### Task 6: Firestore-helpers

**Files:**
- Create: `sondreogjohanne/firestore.js`

- [ ] **Step 1:** Skriv `firestore.js`:

```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, runTransaction, getDoc
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export function subscribe(colName, cb, orderField = null) {
  const base = collection(db, colName);
  const q = orderField ? query(base, orderBy(orderField)) : base;
  return onSnapshot(q, snap => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    cb(items);
  });
}

export async function add(colName, data) {
  return addDoc(collection(db, colName), data);
}
export async function update(colName, id, data) {
  return updateDoc(doc(db, colName, id), data);
}
export async function remove(colName, id) {
  return deleteDoc(doc(db, colName, id));
}

// For gåvereservasjon — transaksjon for å hindre race condition
export async function reserveGave(id, navn) {
  const ref = doc(db, 'gaveliste', id);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Gåva finst ikkje');
    const data = snap.data();
    if (data.reservertAv) throw new Error('Allereie reservert');
    tx.update(ref, { reservertAv: navn, reservertTid: Date.now() });
  });
}

export async function angreReservasjon(id, navn) {
  const ref = doc(db, 'gaveliste', id);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Gåva finst ikkje');
    const data = snap.data();
    if (data.reservertAv !== navn) throw new Error('Feil namn');
    tx.update(ref, { reservertAv: '', reservertTid: null });
  });
}
```

- [ ] **Step 2: Røyktest** — i `planlegger/js/main.js` legg mellombels til:

```javascript
import { add, subscribe } from '../../firestore.js';
window.add = add; window.subscribe = subscribe;
```

Opne planleggaren, opne DevTools → Console. Køyr:

```javascript
await add('smoketest', { tid: Date.now() });
subscribe('smoketest', console.log);
```

Verifiser at objektet dukkar opp i både console og Firebase Console → Firestore → Data. Slett `smoketest`-samlinga i Firebase Console etter test. Fjern dei mellombelse linjene frå `main.js`.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/firestore.js
git commit -m "feat(sondreogjohanne): firestore CRUD helpers and gift reservation transaction"
```

### Task 7: Gjenbrukbar CRUD-tabell

**Files:**
- Create: `sondreogjohanne/planlegger/js/crud-table.js`

Målet er at kvar modul som er ein enkel tabell (sjekkliste, budsjett, gjester, leverandørar, program, gaveliste-edit) kan beskrivast med eit skjema og få UI gratis.

- [ ] **Step 1:** Skriv `crud-table.js`:

```javascript
import { subscribe, add, update, remove } from '../../firestore.js';

/**
 * schema: { fields: [{ key, label, type: 'text'|'number'|'select'|'textarea'|'date', options?: [...] }], orderBy?: 'key', defaults?: {...}, summary?: (items) => htmlString }
 */
export function mountCrudTable({ panelEl, collection, schema, seed = [] }) {
  let items = [];
  const summaryEl = document.createElement('div');
  summaryEl.className = 'summary';
  const tableEl = document.createElement('table');
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary add-row';
  addBtn.textContent = '+ Legg til';
  panelEl.innerHTML = '';
  panelEl.appendChild(summaryEl);
  panelEl.appendChild(tableEl);
  panelEl.appendChild(addBtn);

  addBtn.addEventListener('click', async () => {
    await add(collection, { ...(schema.defaults || {}), _created: Date.now() });
  });

  function render() {
    if (schema.summary) summaryEl.innerHTML = schema.summary(items); else summaryEl.style.display = 'none';
    const thead = '<tr>' + schema.fields.map(f => `<th>${f.label}</th>`).join('') + '<th></th></tr>';
    const tbody = items.map(item => {
      const cells = schema.fields.map(f => `<td>${renderField(f, item)}</td>`).join('');
      return `<tr data-id="${item.id}">${cells}<td class="row-actions"><button class="btn btn-ghost" data-action="del">Slett</button></td></tr>`;
    }).join('');
    tableEl.innerHTML = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
    // wire up change/input events
    tableEl.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelectorAll('[data-field]').forEach(inp => {
        inp.addEventListener('change', async () => {
          const key = inp.dataset.field;
          const val = inp.type === 'number' ? (inp.value === '' ? null : Number(inp.value)) : inp.value;
          await update(collection, id, { [key]: val });
        });
      });
      tr.querySelector('[data-action="del"]').addEventListener('click', async () => {
        if (confirm('Slett denne raden?')) await remove(collection, id);
      });
    });
  }

  function renderField(f, item) {
    const v = item[f.key] ?? '';
    const esc = s => String(s).replace(/"/g, '&quot;');
    if (f.type === 'select') {
      return `<select data-field="${f.key}">` +
        f.options.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${o}</option>`).join('') +
        '</select>';
    }
    if (f.type === 'textarea') return `<textarea data-field="${f.key}" rows="1">${esc(v)}</textarea>`;
    return `<input data-field="${f.key}" type="${f.type || 'text'}" value="${esc(v)}">`;
  }

  // Seed ved tom samling (berre første gang)
  let seeded = false;
  subscribe(collection, async list => {
    items = list;
    if (!seeded && list.length === 0 && seed.length > 0) {
      seeded = true;
      for (const s of seed) await add(collection, s);
      return;
    }
    seeded = true;
    render();
  }, schema.orderBy);
}
```

- [ ] **Step 2: Commit**

```bash
git add sondreogjohanne/planlegger/js/crud-table.js
git commit -m "feat(planlegger): reusable CRUD table component"
```

---

## Phase 4: Planleggar-modular

Kvar modul følgjer same mønster: lag ein `init(panelEl)`-funksjon, kall den frå `main.js` når fana aktiveast. Oppdater `main.js` slik at kvar fane blir initialisert éin gong.

### Task 8: Oppdater main.js med modul-initialisering

**Files:**
- Modify: `sondreogjohanne/planlegger/js/main.js`

- [ ] **Step 1:** Endre `main.js` slik at modular lastast "lazy" første gang fana klikkast:

```javascript
import { requirePassword } from '../../auth.js';
if (!requirePassword({ key: 'planlegger', correct: 'iloveyou', redirectOnCancel: '../' })) {
  throw new Error('auth failed');
}
document.querySelector('main').style.display = 'block';

const modules = {
  sjekkliste: () => import('./sjekkliste.js'),
  budsjett: () => import('./budsjett.js'),
  gjesteliste: () => import('./gjesteliste.js'),
  leverandorer: () => import('./leverandorer.js'),
  program: () => import('./program.js'),
  musikk: () => import('./musikk.js'),
  gaveliste: () => import('./gaveliste-edit.js'),
  bordkart: () => import('./bordkart.js'),
};
const initialized = new Set();

async function activate(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (!initialized.has(name)) {
    initialized.add(name);
    const mod = await modules[name]();
    const panel = document.getElementById(`panel-${name}`);
    mod.init(panel);
  }
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => activate(tab.dataset.tab));
});
activate('sjekkliste'); // første fane
```

- [ ] **Step 2: Commit**

```bash
git add sondreogjohanne/planlegger/js/main.js
git commit -m "refactor(planlegger): lazy-load modules per tab"
```

### Task 9: Sjekkliste-modul

**Files:**
- Create: `sondreogjohanne/planlegger/js/sjekkliste.js`

- [ ] **Step 1:** Skriv `sjekkliste.js`:

```javascript
import { mountCrudTable } from './crud-table.js';

const seed = [
  { tittel: 'Bestill lokale', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Send save-the-date', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bestill fotograf', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bestill catering', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Prøv brudekjole', frist: '', ansvarleg: 'Johanne', status: 'å gjere', notat: '' },
  { tittel: 'Prøv dress', frist: '', ansvarleg: 'Sondre', status: 'å gjere', notat: '' },
  { tittel: 'Bestill ringar', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bestill blomster/brudebukett', frist: '', ansvarleg: 'Johanne', status: 'å gjere', notat: '' },
  { tittel: 'Bestill DJ/musikk', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Send invitasjonar', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bestill kake', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bordplassering', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Kjøp gjestegåver', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Avtal vigslar', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Planlegg tale-rekkjefølgje', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bestill bryllupsreise', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Søk om papir (prøvingsattest)', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
  { tittel: 'Bestill transport', frist: '', ansvarleg: 'Begge', status: 'å gjere', notat: '' },
];

export function init(panelEl) {
  mountCrudTable({
    panelEl,
    collection: 'sjekkliste',
    seed,
    schema: {
      orderBy: 'frist',
      fields: [
        { key: 'tittel', label: 'Oppgåve', type: 'text' },
        { key: 'frist', label: 'Frist', type: 'date' },
        { key: 'ansvarleg', label: 'Ansvarleg', type: 'select', options: ['Begge', 'Sondre', 'Johanne'] },
        { key: 'status', label: 'Status', type: 'select', options: ['å gjere', 'pågår', 'ferdig'] },
        { key: 'notat', label: 'Notat', type: 'textarea' },
      ],
      defaults: { tittel: 'Ny oppgåve', status: 'å gjere', ansvarleg: 'Begge' },
      summary: items => {
        const ferdig = items.filter(i => i.status === 'ferdig').length;
        return `<strong>${ferdig} / ${items.length}</strong> ferdige`;
      },
    },
  });
}
```

- [ ] **Step 2: Manuell test** — opne planleggaren, verifiser at sjekklista seedast med 18 oppgåver første gong. Endre status på éi oppgåve → summary oppdaterast. Opne i ny tab → same data. Legg til rad. Slett rad.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/planlegger/js/sjekkliste.js
git commit -m "feat(planlegger): checklist module with pre-seeded tasks"
```

### Task 10: Budsjett-modul

**Files:**
- Create: `sondreogjohanne/planlegger/js/budsjett.js`

- [ ] **Step 1:** Skriv `budsjett.js`:

```javascript
import { mountCrudTable } from './crud-table.js';

const seed = [
  { post: 'Lokale', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Mat & drikke', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Fotograf', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Kake', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Pynt & blomster', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Brudekjole', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Dress', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Ringar', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Musikk/DJ', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Invitasjonar', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Bryllupsreise', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Transport', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Brudebukett', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Prest/vigslar', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
  { post: 'Diverse', estimert: 0, faktisk: 0, status: 'planlagt', notat: '' },
];

const kr = n => (n ?? 0).toLocaleString('nb-NO') + ' kr';

export function init(panelEl) {
  mountCrudTable({
    panelEl,
    collection: 'budsjett',
    seed,
    schema: {
      fields: [
        { key: 'post', label: 'Post', type: 'text' },
        { key: 'estimert', label: 'Estimert (kr)', type: 'number' },
        { key: 'faktisk', label: 'Faktisk (kr)', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['planlagt', 'bestilt', 'betalt'] },
        { key: 'notat', label: 'Notat', type: 'textarea' },
      ],
      defaults: { post: 'Ny post', estimert: 0, faktisk: 0, status: 'planlagt' },
      summary: items => {
        const e = items.reduce((s, i) => s + (Number(i.estimert) || 0), 0);
        const f = items.reduce((s, i) => s + (Number(i.faktisk) || 0), 0);
        return `Estimert: <strong>${kr(e)}</strong> · Faktisk: <strong>${kr(f)}</strong> · Differanse: <strong>${kr(f - e)}</strong>`;
      },
    },
  });
}
```

- [ ] **Step 2: Manuell test** — gå til Budsjett-fana, seed skal legge 15 rader. Skriv tal i estimert/faktisk → summary oppdaterast.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/planlegger/js/budsjett.js
git commit -m "feat(planlegger): budget module with pre-seeded categories"
```

### Task 11: Gjesteliste-modul

**Files:**
- Create: `sondreogjohanne/planlegger/js/gjesteliste.js`

- [ ] **Step 1:** Skriv `gjesteliste.js`:

```javascript
import { mountCrudTable } from './crud-table.js';

export function init(panelEl) {
  mountCrudTable({
    panelEl,
    collection: 'gjester',
    schema: {
      orderBy: 'navn',
      fields: [
        { key: 'navn', label: 'Namn', type: 'text' },
        { key: 'telefon', label: 'Telefon', type: 'text' },
        { key: 'epost', label: 'E-post', type: 'text' },
        { key: 'rolle', label: 'Rolle', type: 'select', options: ['familie', 'venn', 'forlovar', 'kollega', 'anna'] },
        { key: 'rsvp', label: 'RSVP', type: 'select', options: ['venter', 'kjem', 'kjem ikkje'] },
        { key: 'deltaking', label: 'Deltaking', type: 'select', options: ['middag', 'kaffe', 'begge'] },
        { key: 'allergiar', label: 'Allergiar', type: 'text' },
        { key: 'notat', label: 'Notat', type: 'textarea' },
      ],
      defaults: { navn: 'Ny gjest', rolle: 'familie', rsvp: 'venter', deltaking: 'middag' },
      summary: items => {
        const kjem = items.filter(i => i.rsvp === 'kjem').length;
        const middag = items.filter(i => i.rsvp === 'kjem' && (i.deltaking === 'middag' || i.deltaking === 'begge')).length;
        return `Totalt: <strong>${items.length}</strong> · Kjem: <strong>${kjem}</strong> · Til middag: <strong>${middag}</strong>`;
      },
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add sondreogjohanne/planlegger/js/gjesteliste.js
git commit -m "feat(planlegger): guest list module"
```

### Task 12: Leverandørar-modul

**Files:**
- Create: `sondreogjohanne/planlegger/js/leverandorer.js`

- [ ] **Step 1:** Skriv `leverandorer.js`:

```javascript
import { mountCrudTable } from './crud-table.js';

export function init(panelEl) {
  mountCrudTable({
    panelEl,
    collection: 'leverandorer',
    schema: {
      fields: [
        { key: 'navn', label: 'Namn', type: 'text' },
        { key: 'type', label: 'Type', type: 'select', options: ['fotograf', 'catering', 'DJ', 'florist', 'lokale', 'kake', 'transport', 'anna'] },
        { key: 'kontakt', label: 'Kontakt (tlf/e-post)', type: 'text' },
        { key: 'pris', label: 'Pris (kr)', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['kontakta', 'bestilt', 'betalt', 'avlyst'] },
        { key: 'lenke', label: 'Lenke', type: 'text' },
        { key: 'notat', label: 'Notat', type: 'textarea' },
      ],
      defaults: { navn: 'Ny leverandør', type: 'anna', status: 'kontakta' },
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add sondreogjohanne/planlegger/js/leverandorer.js
git commit -m "feat(planlegger): vendors module"
```

### Task 13: Program-modul

**Files:**
- Create: `sondreogjohanne/planlegger/js/program.js`

- [ ] **Step 1:** Skriv `program.js`:

```javascript
import { mountCrudTable } from './crud-table.js';

export function init(panelEl) {
  mountCrudTable({
    panelEl,
    collection: 'program',
    schema: {
      orderBy: 'tid',
      fields: [
        { key: 'tid', label: 'Tidspunkt', type: 'text' },
        { key: 'hending', label: 'Hending', type: 'text' },
        { key: 'notat', label: 'Notat', type: 'textarea' },
      ],
      defaults: { tid: '12:00', hending: 'Ny programpost' },
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add sondreogjohanne/planlegger/js/program.js
git commit -m "feat(planlegger): timeline/program module"
```

### Task 14: Musikk-modul (tre underlister)

**Files:**
- Create: `sondreogjohanne/planlegger/js/musikk.js`

Denne modulen er meir kompleks — tre separate underlister i same panel.

- [ ] **Step 1:** Skriv `musikk.js`:

```javascript
import { mountCrudTable } from './crud-table.js';
import { subscribe, update, add } from '../../firestore.js';

export function init(panelEl) {
  panelEl.innerHTML = `
    <h3>DJ / musikkansvarleg</h3>
    <div class="card" id="dj-card">Lastar…</div>
    <h3 style="margin-top:32px">Spelliste-ønskje</h3>
    <div id="onskje"></div>
    <h3 style="margin-top:32px">Skal ikkje spelast</h3>
    <div id="forbode"></div>
    <h3 style="margin-top:32px">Spesielle augneblink</h3>
    <div id="augneblink"></div>
  `;

  // DJ-info (singleton-dokument i 'musikk-dj')
  const djCard = panelEl.querySelector('#dj-card');
  subscribe('musikk-dj', async list => {
    let dj = list[0];
    if (!dj) { await add('musikk-dj', { namn: '', kontakt: '', pris: 0, timar: '', notat: '' }); return; }
    djCard.innerHTML = `
      <label>Namn</label><input data-f="namn" value="${dj.namn || ''}">
      <label>Kontakt</label><input data-f="kontakt" value="${dj.kontakt || ''}">
      <label>Pris (kr)</label><input type="number" data-f="pris" value="${dj.pris ?? 0}">
      <label>Timar</label><input data-f="timar" value="${dj.timar || ''}">
      <label>Notat</label><textarea data-f="notat">${dj.notat || ''}</textarea>
    `;
    djCard.querySelectorAll('[data-f]').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        update('musikk-dj', dj.id, { [inp.dataset.f]: v });
      });
    });
  });

  mountCrudTable({
    panelEl: panelEl.querySelector('#onskje'),
    collection: 'musikk-onskje',
    schema: {
      fields: [
        { key: 'tittel', label: 'Tittel', type: 'text' },
        { key: 'artist', label: 'Artist', type: 'text' },
        { key: 'notat', label: 'Notat', type: 'text' },
      ],
      defaults: { tittel: '', artist: '' },
    },
  });

  mountCrudTable({
    panelEl: panelEl.querySelector('#forbode'),
    collection: 'musikk-forbode',
    schema: {
      fields: [
        { key: 'tittel', label: 'Tittel', type: 'text' },
        { key: 'artist', label: 'Artist', type: 'text' },
        { key: 'grunn', label: 'Grunn', type: 'text' },
      ],
      defaults: { tittel: '', artist: '' },
    },
  });

  mountCrudTable({
    panelEl: panelEl.querySelector('#augneblink'),
    collection: 'musikk-augneblink',
    schema: {
      fields: [
        { key: 'hending', label: 'Hending', type: 'text' },
        { key: 'song', label: 'Songval', type: 'text' },
        { key: 'tid', label: 'Tidspunkt', type: 'text' },
      ],
      defaults: { hending: 'Første dans', song: '', tid: '' },
    },
  });
}
```

- [ ] **Step 2: Manuell test** — skriv i DJ-felt, reload → data består. Legg til ønske-song, forbode-song, augneblink.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/planlegger/js/musikk.js
git commit -m "feat(planlegger): music module with DJ info, wishlist, forbidden list, special moments"
```

### Task 15: Gåveliste-redigering (paret si vising)

**Files:**
- Create: `sondreogjohanne/planlegger/js/gaveliste-edit.js`

- [ ] **Step 1:** Skriv `gaveliste-edit.js` som viser `reservertAv` synleg (i motsetnad til hovudsida):

```javascript
import { mountCrudTable } from './crud-table.js';

export function init(panelEl) {
  mountCrudTable({
    panelEl,
    collection: 'gaveliste',
    schema: {
      fields: [
        { key: 'tittel', label: 'Gåve', type: 'text' },
        { key: 'beskriving', label: 'Beskriving', type: 'textarea' },
        { key: 'lenke', label: 'Lenke', type: 'text' },
        { key: 'pris', label: 'Pris (kr)', type: 'number' },
        { key: 'reservertAv', label: 'Reservert av', type: 'text' },
      ],
      defaults: { tittel: 'Ny gåve', reservertAv: '' },
      summary: items => {
        const reservert = items.filter(i => i.reservertAv).length;
        return `<strong>${reservert} / ${items.length}</strong> reservert`;
      },
    },
  });
}
```

(Paret kan manuelt nullstille `reservertAv` ved å tømme feltet.)

- [ ] **Step 2: Commit**

```bash
git add sondreogjohanne/planlegger/js/gaveliste-edit.js
git commit -m "feat(planlegger): gift list editor with reservedBy visible to couple"
```

### Task 16: Bordkart-modul

**Files:**
- Create: `sondreogjohanne/planlegger/js/bordkart.js`

Denne er mest kompleks — dra-og-slepp av gjester til bord.

- [ ] **Step 1:** Skriv `bordkart.js`:

```javascript
import { subscribe, add, update, remove } from '../../firestore.js';

export function init(panelEl) {
  panelEl.innerHTML = `
    <div style="display:flex;gap:24px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <h3>Ledige gjester</h3>
        <div id="pool" style="min-height:200px;background:var(--warm);border-radius:6px;padding:10px"></div>
      </div>
      <div style="flex:2;min-width:400px">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button class="btn btn-primary" id="add-round">+ Rundt bord</button>
          <button class="btn btn-primary" id="add-rect">+ Rektangulært bord</button>
          <button class="btn btn-ghost" onclick="window.print()">Skriv ut</button>
        </div>
        <div id="tables" style="display:flex;flex-wrap:wrap;gap:16px"></div>
      </div>
    </div>
  `;

  let gjester = [];
  let bord = [];

  subscribe('gjester', list => { gjester = list; render(); });
  subscribe('bord', list => { bord = list; render(); });

  panelEl.querySelector('#add-round').onclick = () => add('bord', { form: 'rund', namn: 'Bord ' + (bord.length + 1), plassar: 8, gjester: [] });
  panelEl.querySelector('#add-rect').onclick = () => add('bord', { form: 'rektangel', namn: 'Bord ' + (bord.length + 1), plassar: 8, gjester: [] });

  function render() {
    const plasserte = new Set(bord.flatMap(b => b.gjester || []));
    const pool = panelEl.querySelector('#pool');
    pool.innerHTML = gjester.filter(g => !plasserte.has(g.id))
      .map(g => `<div class="guest-chip" draggable="true" data-id="${g.id}" style="padding:6px 10px;background:#fff;border-radius:20px;margin:4px;display:inline-block;cursor:grab">${g.navn}</div>`)
      .join('') || '<em>Ingen ledige gjester</em>';

    panelEl.querySelector('#tables').innerHTML = bord.map(b => `
      <div class="bord" data-id="${b.id}" style="flex:0 0 260px;border:2px solid ${b.form === 'rund' ? 'var(--accent)' : 'var(--gold)'};border-radius:${b.form === 'rund' ? '50%' : '12px'};padding:16px;min-height:180px;text-align:center">
        <input value="${b.namn}" data-bf="namn" style="text-align:center;border:none;background:transparent;font-weight:500">
        <div style="font-size:0.8rem;color:var(--muted);margin-bottom:8px">plassar: <input type="number" value="${b.plassar}" data-bf="plassar" style="width:50px;display:inline-block"></div>
        <div class="drop-zone" style="min-height:80px">
          ${(b.gjester || []).map(id => {
            const g = gjester.find(x => x.id === id);
            return g ? `<div class="seated" data-id="${id}" style="padding:4px 8px;background:var(--cream);margin:2px;border-radius:6px;display:inline-block;font-size:0.85rem">${g.navn} <span class="remove" style="cursor:pointer;color:var(--accent)">×</span></div>` : '';
          }).join('')}
        </div>
        <button class="btn btn-ghost" data-del style="margin-top:8px;font-size:0.8rem;padding:4px 10px">Slett bord</button>
      </div>
    `).join('');

    // Wire up drag-drop and actions
    panelEl.querySelectorAll('.guest-chip').forEach(el => {
      el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', el.dataset.id));
    });
    panelEl.querySelectorAll('.bord').forEach(bordEl => {
      const id = bordEl.dataset.id;
      const b = bord.find(x => x.id === id);
      bordEl.addEventListener('dragover', e => e.preventDefault());
      bordEl.addEventListener('drop', e => {
        e.preventDefault();
        const gjestId = e.dataTransfer.getData('text/plain');
        if (!(b.gjester || []).includes(gjestId)) {
          update('bord', id, { gjester: [...(b.gjester || []), gjestId] });
        }
      });
      bordEl.querySelectorAll('[data-bf]').forEach(inp => {
        inp.addEventListener('change', () => {
          const v = inp.type === 'number' ? Number(inp.value) : inp.value;
          update('bord', id, { [inp.dataset.bf]: v });
        });
      });
      bordEl.querySelectorAll('.seated .remove').forEach(x => {
        x.addEventListener('click', () => {
          const gjestId = x.parentElement.dataset.id;
          update('bord', id, { gjester: (b.gjester || []).filter(g => g !== gjestId) });
        });
      });
      bordEl.querySelector('[data-del]').addEventListener('click', () => {
        if (confirm('Slett bordet? Gjestene blir ledige igjen.')) remove('bord', id);
      });
    });
  }
}
```

- [ ] **Step 2: Manuell test** — legg til 2 bord (eitt rundt, eitt rektangel). Dra gjester frå pool til bord. Verifiser at gjesten forsvinn frå pool. Klikk × for å flytte tilbake. Endre namn/plassar. Slett bord → gjester tilbake i pool.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/planlegger/js/bordkart.js
git commit -m "feat(planlegger): seating chart with drag-drop"
```

---

## Phase 5: Hovudsida — gåveliste og program-sync

### Task 17: Gåveliste-vising for gjester

**Files:**
- Create: `sondreogjohanne/gaveliste-gjest.js`
- Modify: `sondreogjohanne/index.html`

- [ ] **Step 1:** Skriv `gaveliste-gjest.js`:

```javascript
import { subscribe, reserveGave, angreReservasjon } from './firestore.js';

export function mount(containerEl) {
  subscribe('gaveliste', items => {
    if (items.length === 0) {
      containerEl.innerHTML = '<p><em>Ingen gåver lagt til enno.</em></p>';
      return;
    }
    containerEl.innerHTML = items.map(g => {
      const reservert = !!g.reservertAv;
      return `
        <div class="card" data-id="${g.id}">
          <h3>${escape(g.tittel || '(utan tittel)')}</h3>
          ${g.beskriving ? `<p>${escape(g.beskriving)}</p>` : ''}
          ${g.pris ? `<p style="color:var(--muted);font-size:0.9rem">Ca. ${Number(g.pris).toLocaleString('nb-NO')} kr</p>` : ''}
          ${g.lenke ? `<p><a href="${escape(g.lenke)}" target="_blank" rel="noopener">Sjå i butikk →</a></p>` : ''}
          ${reservert
            ? `<p style="color:var(--muted)"><em>Reservert</em> · <a href="#" data-action="angre" style="font-size:0.85rem">Angre</a></p>`
            : `<button class="btn btn-primary" data-action="reserver">Eg tar denne</button>`}
        </div>
      `;
    }).join('');

    containerEl.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async e => {
        e.preventDefault();
        const card = el.closest('[data-id]');
        const id = card.dataset.id;
        if (el.dataset.action === 'reserver') {
          const navn = prompt('Skriv namnet ditt:');
          if (!navn) return;
          try { await reserveGave(id, navn.trim()); }
          catch (err) { alert('Klarte ikkje reservere: ' + err.message); }
        } else if (el.dataset.action === 'angre') {
          const navn = prompt('Skriv namnet du brukte då du reserverte:');
          if (!navn) return;
          try { await angreReservasjon(id, navn.trim()); }
          catch (err) { alert('Klarte ikkje angre: ' + err.message); }
        }
      });
    });
  });
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
```

- [ ] **Step 2:** Oppdater script-blokka i `sondreogjohanne/index.html`:

```html
<script type="module">
  import { requirePassword } from './auth.js';
  import { mount as mountGaveliste } from './gaveliste-gjest.js';
  if (requirePassword({ key: 'bryllup', correct: 'bryllup' })) {
    document.querySelector('main').style.display = 'block';
    mountGaveliste(document.getElementById('gaveliste-container'));
  }
</script>
```

- [ ] **Step 3: Manuell test** — legg til 2-3 gåver via planleggaren (Gåveliste-fane). Opne hovudsida i ny tab, passord `bryllup`. Sjå gåvene. Klikk "Eg tar denne" → skriv namn → gåva blir "Reservert". Angre med rett namn → ledig igjen. Angre med feil namn → feilmelding. Opne 2 tabs samtidig og reserver same gåve → andre får "Allereie reservert"-feil.

- [ ] **Step 4: Commit**

```bash
git add sondreogjohanne/gaveliste-gjest.js sondreogjohanne/index.html
git commit -m "feat(sondreogjohanne): gift list with reservation flow"
```

### Task 18: Program-synk til hovudsida

**Files:**
- Modify: `sondreogjohanne/index.html`

- [ ] **Step 1:** Oppdater script-blokka i `index.html` slik at programlista lastar frå Firestore:

```html
<script type="module">
  import { requirePassword } from './auth.js';
  import { mount as mountGaveliste } from './gaveliste-gjest.js';
  import { subscribe } from './firestore.js';
  if (requirePassword({ key: 'bryllup', correct: 'bryllup' })) {
    document.querySelector('main').style.display = 'block';
    mountGaveliste(document.getElementById('gaveliste-container'));
    subscribe('program', items => {
      const el = document.getElementById('program-list');
      if (items.length === 0) { el.innerHTML = '<p><em>Kjem snart.</em></p>'; return; }
      el.innerHTML = items.map(p =>
        `<div class="card"><strong>${p.tid || ''}</strong> — ${p.hending || ''}${p.notat ? `<br><small style="color:var(--muted)">${p.notat}</small>` : ''}</div>`
      ).join('');
    }, 'tid');
  }
</script>
```

- [ ] **Step 2: Manuell test** — legg til 3 programpostar via planleggaren. Opne hovudsida → programseksjonen viser dei, sortert på tid.

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/index.html
git commit -m "feat(sondreogjohanne): main page syncs program from planner"
```

---

## Phase 6: Polish & deploy

### Task 19: Mobil-responsiv test

**Files:**
- Modify: `sondreogjohanne/styles.css` (små justeringar om nødvendig)
- Modify: `sondreogjohanne/planlegger/planlegger.css`

- [ ] **Step 1:** Opne hovudsida i browser, DevTools → Toggle device toolbar → iPhone/Pixel. Gå gjennom alle seksjonar. Fiks eventuelle overflow-problem med `max-width:100%` på tabellar, `word-break:break-word` på card-tekst, `flex-wrap` der det trengs.

- [ ] **Step 2:** Same for planleggaren. Fane-linja skal wrappe på smale skjermar (den har allereie `flex-wrap:wrap`). Sjå at tabellar scrollar horisontalt heller enn å bryte layout:

```css
.tab-panel > table { display: block; overflow-x: auto; }
```

- [ ] **Step 3: Commit**

```bash
git add sondreogjohanne/
git commit -m "style(sondreogjohanne): mobile responsive tweaks"
```

### Task 20: Oppdater README med komplett setup-instruks

**Files:**
- Modify: `sondreogjohanne/README.md`

- [ ] **Step 1:** Skriv ein README som forklarar:
  - Kva prosjektet er
  - Korleis setje opp Firebase (stega frå Task 5)
  - Kva passorda er (for parets eiga referanse)
  - Korleis endre passord (søk og erstatt i `index.html` og `planlegger/index.html`)
  - Korleis legge til/fjerne modular
  - Feilsøking (Firebase ikkje tilkobla, tom side, osv.)

- [ ] **Step 2: Commit og push**

```bash
git add sondreogjohanne/README.md
git commit -m "docs(sondreogjohanne): complete setup and usage README"
git push origin main
```

### Task 21: End-to-end acceptance test

- [ ] **Step 1:** Vent ~1 minutt på GitHub Pages deploy. Gå til `https://abstinensa.no/sondreogjohanne/` i inkognito.
- [ ] **Step 2:** Verifiser passord-prompt kjem (`bryllup`).
- [ ] **Step 3:** Verifiser alle seksjonar renderast.
- [ ] **Step 4:** Gå til `https://abstinensa.no/sondreogjohanne/planlegger/`, passord `iloveyou`.
- [ ] **Step 5:** Klikk gjennom alle 8 faner, verifiser at kvar modul lastar og fungerer.
- [ ] **Step 6:** Bordkart: dra ein gjest, verifiser at det lagrast (reload → gjesten står).
- [ ] **Step 7:** Gåveliste-flyt: reserver gåve i hovudside frå mobil, verifiser at den er markert i planleggaren frå PC innan få sekund.
- [ ] **Step 8: Final commit (om det er justeringar)**

```bash
git add -A && git commit -m "chore: acceptance test fixes" && git push
```

---

## Relevant skills

- @superpowers:subagent-driven-development — anbefalt utføringsmodus for denne planen
- @superpowers:systematic-debugging — om noko ikkje fungerer, særleg Firebase-tilkopling
- @superpowers:verification-before-completion — før du kallar noko "ferdig"
