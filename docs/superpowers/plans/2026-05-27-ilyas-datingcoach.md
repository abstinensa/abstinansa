# Ilyas Dating Coach — Stigespel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lag ei sjølvstendig HTML-side (`ilyas.html`) på abstinensa.no med eit solo stigespel på stord-dialekt og ein innebygd AI dating coach-chatbot som alltid konkluderer med Stine.

**Architecture:** Éi flat HTML-fil med inline CSS og JS, same mønster som `spill.html` og `oslo-events.html`. Chatboten kallar eksisterande Cloudflare Worker-proxy (same som oslo-events.html). Ingen byggsteg.

**Tech Stack:** Vanilla HTML5, CSS3 (CSS Grid, CSS variables), Vanilla JS (ES2020), Cloudflare Worker (eksisterande), Claude API via `claude-sonnet-4-6`

---

## Filer

| Fil | Handling | Ansvar |
|-----|----------|--------|
| `abstinensa/ilyas.html` | Opprett | Heile sida — brett, spelelogikk, chatbot |
| `abstinensa/worker.js` | Uendra | Proxy til Anthropic API (allereie deployert) |

> **Cloudflare Worker URL:** Finn den deployerte worker-URL-en din (sjå Cloudflare Dashboard eller `oslo-events.html` for mønster). Erstatt `WORKER_URL` i koden nedanfor.

---

## Task 1: HTML-skjelett og CSS-grunnlag

**Filer:**
- Opprett: `abstinensa/ilyas.html`

- [ ] **Steg 1: Opprett fila med HTML-skjelett**

```html
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ilyas sin dating coach</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* CSS kjem i Task 2 */
  </style>
</head>
<body>
  <header>
    <h1>Ilyas sin dating coach</h1>
    <p class="ingress">Klar for å finna kjærleiken? Me veit allereie svaret.</p>
  </header>
  <main>
    <div id="game-area">
      <div id="board"></div>
      <div id="controls">
        <div id="status-msg">Trykk på terningen for å starta!</div>
        <button id="roll-btn">🎲 Kast terning</button>
        <div id="dice-display"></div>
      </div>
    </div>
  </main>
  <!-- Chatbot-knapp -->
  <button id="coach-btn">Spør coachen 🎙️</button>
  <!-- Chat-modal -->
  <div id="chat-modal" class="hidden">
    <div id="chat-box">
      <button id="close-chat">✕</button>
      <div id="chat-messages"></div>
      <div id="chat-input-area">
        <input id="chat-input" type="text" placeholder="Spør coachen...">
        <button id="send-btn">Send</button>
      </div>
    </div>
  </div>
  <script>
    /* JS kjem i Task 3 og 4 */
  </script>
</body>
</html>
```

- [ ] **Steg 2: Opna i nettlesar og verifiser at skjeletten lastar utan feil**

Opna `ilyas.html` direkte i Chrome. Forventar: tom side med tittel "Ilyas sin dating coach".

- [ ] **Steg 3: Commit**

```bash
git add abstinensa/ilyas.html
git commit -m "feat: add ilyas.html skeleton"
```

---

## Task 2: CSS — brett, brikke og layout

**Filer:**
- Endra: `abstinensa/ilyas.html` — `<style>`-blokka

- [ ] **Steg 1: Legg til CSS-variablar og grunnstil**

Erstatt `<style>`-blokka med:

```css
:root {
  --ink: #1a1a1a;
  --cream: #faf6f0;
  --accent: #c4593e;
  --gold: #b8944f;
  --surface: #f0ebe3;
  --border: #ddd6cc;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--cream);
  color: var(--ink);
  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
  padding: 2rem 1rem 6rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

h1 {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(1.8rem, 5vw, 3rem);
  color: var(--accent);
  margin-bottom: 0.5rem;
}

.ingress {
  font-size: 1.1rem;
  color: var(--gold);
  font-style: italic;
}

/* ─── SPEL-OMRÅDE ─── */
#game-area {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* ─── BRETT ─── */
#board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  width: 100%;
  max-width: 540px;
  background: var(--border);
  border: 2px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.cell {
  background: var(--surface);
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.55rem, 1.5vw, 0.75rem);
  text-align: center;
  padding: 4px;
  position: relative;
  cursor: default;
  border-radius: 4px;
  transition: background 0.2s;
}

.cell .cell-num {
  font-size: 0.6rem;
  color: var(--gold);
  font-weight: 600;
  position: absolute;
  top: 3px;
  left: 5px;
}

.cell .cell-icon {
  font-size: 1.1rem;
}

.cell.ladder { background: #e8f5e9; border: 2px solid #66bb6a; }
.cell.snake  { background: #fce4ec; border: 2px solid #ef9a9a; }
.cell.finish { background: #fff3e0; border: 2px solid var(--gold); }
.cell.active { background: #fff9c4; }

.player-piece {
  font-size: 1.3rem;
  position: absolute;
}

/* ─── KONTROLLPANEL ─── */
#controls {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

#status-msg {
  font-size: 1rem;
  max-width: 400px;
  min-height: 2.5rem;
  color: var(--ink);
  background: var(--surface);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border);
}

#roll-btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.8rem 2rem;
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
#roll-btn:hover { opacity: 0.88; }
#roll-btn:active { transform: scale(0.97); }
#roll-btn:disabled { opacity: 0.4; cursor: not-allowed; }

#dice-display {
  font-size: 2.5rem;
  min-height: 3rem;
}

/* ─── COACH-KNAPP ─── */
#coach-btn {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: var(--gold);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 0.8rem 1.4rem;
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  z-index: 100;
  transition: opacity 0.2s;
}
#coach-btn:hover { opacity: 0.88; }

/* ─── CHAT-MODAL ─── */
#chat-modal {
  position: fixed;
  bottom: 5rem;
  right: 1.5rem;
  width: min(380px, calc(100vw - 2rem));
  z-index: 200;
}

#chat-modal.hidden { display: none; }

#chat-box {
  background: var(--cream);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 420px;
}

#close-chat {
  align-self: flex-end;
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.6rem 0.8rem;
  color: var(--ink);
}

#chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 180px;
}

.chat-bubble {
  max-width: 85%;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.45;
}
.chat-bubble.user {
  align-self: flex-end;
  background: var(--accent);
  color: white;
  border-bottom-right-radius: 4px;
}
.chat-bubble.coach {
  align-self: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

#chat-input-area {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}

#chat-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  background: white;
}
#chat-input:focus { outline: 2px solid var(--gold); }

#send-btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
}
```

- [ ] **Steg 2: Opna i nettlesar og verifiser layout**

Forventar: Korrekt fargepalett, fontar lastar, coach-knapp synleg nedst til høgre.

- [ ] **Steg 3: Commit**

```bash
git add abstinensa/ilyas.html
git commit -m "feat: add CSS layout for ilyas stigespel"
```

---

## Task 3: Spelelogikk i JavaScript

**Filer:**
- Endra: `abstinensa/ilyas.html` — `<script>`-blokka

- [ ] **Steg 1: Legg til speldata og brett-rendering**

Erstatt `<script>`-blokka med:

```js
// ── SPELDATA ──────────────────────────────────────────
const LADDERS = { 4:14, 10:18, 17:24, 21:27, 23:29, 26:30 };
const SNAKES  = { 9:3, 16:6, 20:12, 25:8 };

const CELL_TEXT = {
  1:  "Start! Heile Stord håpar på deg, Ilyas. 💪",
  3:  "Tilbake hit. Men du er framleis ein vinnar i hjarta.",
  4:  "Du tok initiativ! Stor stige! ⬆️",
  5:  "Du smilte til henne i kantina. Bra start!",
  6:  "Landingsruta. Tenk deg om.",
  8:  "Oi. Nedtur. Men Stine er framleis interessert.",
  9:  "Du venta for lenge. Slange nedover! 🐍",
  10: "Du bydde på middag! Stor stige! ⬆️",
  12: "Her er du no. Reis deg støvla og prøv igjen.",
  14: "Flott! Du er på god veg.",
  15: "Du venta to dagar før du skreiv. Klassisk.",
  16: "For mykje Netflix-snakk. Slange! 🐍",
  17: "Du sende ei blomst. Sjarmerande! Stige opp! ⬆️",
  18: "Godt jobba. Ho la merke til deg.",
  20: "Du skreiv berre 'hei' på Tinder. Ned att, ven. 🐍",
  21: "Du lærte deg favorittlåten hennar. Imponerande! ⬆️",
  23: "Du viste deg frå beste sida. Stige! ⬆️",
  24: "Nesten i mål! Ikkje rot det til no.",
  25: "Du gløymde bursdagen. Skam deg. Slange! 🐍",
  26: "Siste stige! Du er klar, Ilyas! ⬆️",
  27: "Eitt skritt att. Du kan det.",
  28: "Du er så nærme no. Ho bur forresten på Stord.",
  29: "Neste kast er det siste. Pust roleg.",
  30: "🎉 STINE! Det var jo Stine heile tida! 🎉"
};

const DICE_FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];

let playerPos = 0;
let isRolling = false;

// ── BRETT-RENDERING ───────────────────────────────────
function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  // Bygg 5 rader × 6 kolonnar (rute 1–30)
  // Rad 1 (botnen): 1-6 venstre→høgre
  // Rad 2: 7-12 høgre→venstre
  // osv. (slange-mønster)
  const rows = [];
  for (let r = 0; r < 5; r++) {
    const start = r * 6 + 1;
    const row = Array.from({length: 6}, (_, i) => start + i);
    if (r % 2 === 1) row.reverse(); // annankvar rad snudd
    rows.push(row);
  }
  // Vis frå topp (rad 5 = rute 25-30 øvst)
  rows.reverse();

  rows.forEach(row => {
    row.forEach(num => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = `cell-${num}`;

      if (LADDERS[num]) cell.classList.add('ladder');
      if (SNAKES[num])  cell.classList.add('snake');
      if (num === 30)   cell.classList.add('finish');

      const icon = LADDERS[num] ? '⬆️' : SNAKES[num] ? '🐍' : num === 30 ? '❤️' : '';

      cell.innerHTML = `
        <span class="cell-num">${num}</span>
        ${icon ? `<span class="cell-icon">${icon}</span>` : ''}
      `;
      board.appendChild(cell);
    });
  });

  renderPiece();
}

function renderPiece() {
  document.querySelectorAll('.player-piece').forEach(p => p.remove());
  document.querySelectorAll('.cell.active').forEach(c => c.classList.remove('active'));

  if (playerPos === 0) return;

  const cell = document.getElementById(`cell-${playerPos}`);
  if (!cell) return;
  cell.classList.add('active');

  const piece = document.createElement('span');
  piece.className = 'player-piece';
  piece.textContent = '🕺';
  cell.appendChild(piece);
}

// ── TERNINGKAST ───────────────────────────────────────
async function rollDice() {
  if (isRolling) return;
  isRolling = true;

  const rollBtn = document.getElementById('roll-btn');
  const diceDisplay = document.getElementById('dice-display');
  const statusMsg = document.getElementById('status-msg');

  rollBtn.disabled = true;

  // Animér terning
  let ticks = 0;
  const anim = setInterval(() => {
    diceDisplay.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
    ticks++;
    if (ticks > 10) clearInterval(anim);
  }, 80);

  await delay(900);
  const roll = Math.floor(Math.random() * 6) + 1;
  diceDisplay.textContent = DICE_FACES[roll - 1];

  let newPos = Math.min(playerPos + roll, 30);
  playerPos = newPos;
  renderPiece();

  const cellText = CELL_TEXT[newPos] || `Rute ${newPos}. Du held fram.`;
  statusMsg.textContent = `Du kasta ${roll}! → Rute ${newPos}. ${cellText}`;

  await delay(800);

  // Sjekk stige eller slange
  let autoCoachMsg = null;

  if (LADDERS[newPos]) {
    const dest = LADDERS[newPos];
    statusMsg.textContent = `🪜 STIGE! Rute ${newPos} → ${dest}! ${CELL_TEXT[newPos]}`;
    await delay(1000);
    playerPos = dest;
    renderPiece();
    autoCoachMsg = `ladderAt${newPos}`;
  } else if (SNAKES[newPos]) {
    const dest = SNAKES[newPos];
    statusMsg.textContent = `🐍 SLANGE! Rute ${newPos} → ${dest}! ${CELL_TEXT[newPos]}`;
    await delay(1000);
    playerPos = dest;
    renderPiece();
    autoCoachMsg = `snakeAt${newPos}`;
  }

  // Vinn-sjekk
  if (playerPos === 30) {
    statusMsg.textContent = "🎉 DU VANN! STINE ER SVARET! Det var jo openbert heile tida, Ilyas!";
    rollBtn.textContent = "🔄 Spel igjen";
    rollBtn.disabled = false;
    rollBtn.onclick = restartGame;
    isRolling = false;
    return;
  }

  // Auto-coach ved stige/slange
  if (autoCoachMsg) {
    await delay(1000);
    const context = SNAKES[newPos === playerPos ? newPos : Object.keys(SNAKES).find(k => SNAKES[k] === playerPos)]
      ? "spelaren landa på ei slange og gjekk nedover. Oppmuntre han litt."
      : "spelaren landa på ei stige og gjekk oppover. Gratulér entusiastisk.";
    await autoCoachComment(context);
  }

  rollBtn.disabled = false;
  isRolling = false;
}

function restartGame() {
  playerPos = 0;
  isRolling = false;
  document.getElementById('roll-btn').textContent = '🎲 Kast terning';
  document.getElementById('roll-btn').onclick = rollDice;
  document.getElementById('roll-btn').disabled = false;
  document.getElementById('dice-display').textContent = '';
  document.getElementById('status-msg').textContent = 'Trykk på terningen for å starta!';
  buildBoard();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── INIT ──────────────────────────────────────────────
document.getElementById('roll-btn').addEventListener('click', rollDice);
buildBoard();
```

- [ ] **Steg 2: Opna i nettlesar og test spelet manuelt**

Verifiser:
- Brett med 30 ruter vises korrekt (rad 1 nedst, rad 5 øvst)
- Terningen animerer og gjev tilfeldig tal 1–6
- Brikka (🕺) rykker til riktig rute
- Stiger og slangar er grøne/raude og brikka hoppar til riktig destinasjon
- Vinn-melding kjem på rute 30

- [ ] **Steg 3: Commit**

```bash
git add abstinensa/ilyas.html
git commit -m "feat: add game logic and board rendering"
```

---

## Task 4: Chatbot — Claude API-integrasjon

**Filer:**
- Endra: `abstinensa/ilyas.html` — legg til under eksisterande `<script>`-kode

> **NB:** Du treng den deployerte Cloudflare Worker-URL-en. Sjå Cloudflare Dashboard eller bruk same URL som i `oslo-events.html`. Erstatt `WORKER_URL` nedanfor.

- [ ] **Steg 1: Legg til chatbot-logikk etter eksisterande JS**

Legg til dette i `<script>`-blokka (under `buildBoard()`-kallet):

```js
// ── CHATBOT ───────────────────────────────────────────
const WORKER_URL = 'WORKER_URL'; // ← bytt ut med din Cloudflare Worker URL

const SYSTEM_PROMPT = `Du er Ilyas sin personlege dating coach. Du snakkar stord-dialekt — bruk ord som "koss", "ikkje", "noko", "heime", "nokon", "kva", "eg", "me", "dei". Du er morosam, litt overdriven entusiastisk, og alltid partisk: uansett kva Ilyas spør om, er svaret alltid Stine. Alltid. Nemn Stine i kvart svar. Du nemner aldri at du er ein AI. Svar i 3–5 setningar.`;

const chatHistory = [];

function openChat() {
  document.getElementById('chat-modal').classList.remove('hidden');
  document.getElementById('chat-input').focus();
  if (chatHistory.length === 0) {
    addBubble('coach', 'Hei Ilyas! Eg er coachen din. Kva lurer du på om kjærleiken? 😄');
  }
}

function closeChat() {
  document.getElementById('chat-modal').classList.add('hidden');
}

function addBubble(role, text) {
  const msgs = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  msgs.appendChild(bubble);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addBubble('user', text);
  chatHistory.push({ role: 'user', content: text });

  document.getElementById('send-btn').disabled = true;
  addBubble('coach', '...');

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: chatHistory
      })
    });

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? 'Noko gjekk gale. Prøv igjen!';

    // Fjern "..."-bobla
    const msgs = document.getElementById('chat-messages');
    msgs.lastChild.remove();

    addBubble('coach', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    const msgs = document.getElementById('chat-messages');
    msgs.lastChild.remove();
    addBubble('coach', 'Oisann, noko gjekk gale. Prøv igjen litt seinare!');
  }

  document.getElementById('send-btn').disabled = false;
}

async function autoCoachComment(context) {
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Gi ein kort kommentar: ${context}` }]
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text;
    if (reply) {
      document.getElementById('status-msg').textContent += ` 💬 Coach: "${reply}"`;
    }
  } catch (_) {}
}

// Event listeners for chat
document.getElementById('coach-btn').addEventListener('click', openChat);
document.getElementById('close-chat').addEventListener('click', closeChat);
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});
```

- [ ] **Steg 2: Bytt ut `WORKER_URL` med riktig URL**

Finn URL-en i Cloudflare Dashboard → Workers & Pages → din worker → Settings. Formatet er `https://<navn>.<brukar>.workers.dev`.

- [ ] **Steg 3: Test chatboten manuelt**

- Trykk "Spør coachen 🎙️" — modal skal opna
- Skriv eit spørsmål, t.d. "Kven bør eg bli med på date?" — svar skal koma på stord-dialekt og nemna Stine
- Test at Enter-tasten sender melding
- Test lukk-knappen (✕)

- [ ] **Steg 4: Test auto-coach-kommentar**

Spel til du landar på ei stige eller slange — coach-kommentar skal dukka opp i status-meldinga etter 1 sekund.

- [ ] **Steg 5: Commit**

```bash
git add abstinensa/ilyas.html
git commit -m "feat: add Claude API chatbot integration"
```

---

## Task 5: Polering og deploy

**Filer:**
- Endra: `abstinensa/ilyas.html`

- [ ] **Steg 1: Sjekk at sida ikkje er lenkja frå index.html**

```bash
grep -n "ilyas" abstinensa/index.html
```
Forventar: ingen treff.

- [ ] **Steg 2: Test på mobil (DevTools responsive mode)**

Opna Chrome DevTools → toggle device toolbar → iPhone SE. Verifiser:
- Brett er lesbart
- Coach-knapp er tilgjengeleg
- Chat-modal fyller ikkje heile skjermen

- [ ] **Steg 3: Push til GitHub**

```bash
git push origin main
```

GitHub Pages publiserer automatisk til `abstinensa.no/ilyas.html`.

- [ ] **Steg 4: Verifiser live på abstinensa.no/ilyas.html**

Opna `https://abstinensa.no/ilyas.html` i nettlesaren. Test:
- [ ] Brett vises og spelet fungerer
- [ ] Chatbot svarar på stord-dialekt
- [ ] Stine vert nemnt i chat-svar
- [ ] Sida er ikkje lenkja frå framsida

- [ ] **Steg 5: Final commit**

```bash
git add abstinensa/ilyas.html
git commit -m "feat: ilyas dating coach stigespel — complete"
git push origin main
```

---

## Avhengigheiter

| Avhengigheit | Status | Handling |
|---|---|---|
| Cloudflare Worker deployert | Ukjend | Verifiser i Cloudflare Dashboard før Task 4 |
| GitHub Pages aktivert for abstinensa | Sannsynleg aktiv | Verifiser i GitHub repo Settings → Pages |
