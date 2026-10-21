import { AI_CONFIG } from './config.js';
import {
  analyzeOrg,
  analyzePerson,
  answer,
  continueSession,
  createSession,
  liveSteps,
  personFromSession,
  present,
  progressOf,
  sessionFromPerson
} from './engine.js';
import { t, translateDom } from './i18n.js';
import { renderMap } from './map.js';
import { createSpeech } from './speech.js';
import { clearState, loadState, saveState } from './storage.js';

const HASH = {
  '#oversikt': 'home',
  '#kartlegging': 'studio',
  '#analyse': 'analysis',
  '#avdeling': 'org',
  '#rapport': 'report'
};
const TO_HASH = {
  home: '#oversikt',
  studio: '#kartlegging',
  analysis: '#analyse',
  org: '#avdeling',
  report: '#rapport'
};

const speech = createSpeech({
  getLang: () => state.lang,
  onInterim: (text) => {
    const field = document.querySelector('#answer');
    if (field) field.value = text;
  },
  onFinal: (text) => submit(text),
  onState: () => paintVoice(),
  onError: (code) => {
    state.voiceError = code || 'error';
    paintVoice();
  }
});

let state = hydrate(loadState());
let lastCursor = '';

function fresh() {
  return {
    version: 1,
    lang: 'nb',
    theme: null,
    voiceOut: true,
    hourlyCost: 900,
    implOverrides: {},
    included: {},
    people: [],
    session: null,
    view: 'home',
    analysisId: '',
    wipeArmed: false,
    voiceError: ''
  };
}

function hydrate(saved) {
  const base = fresh();
  if (!saved) return base;
  return {
    ...base,
    lang: saved.lang === 'en' ? 'en' : 'nb',
    theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : null,
    voiceOut: saved.voiceOut !== false,
    hourlyCost: Number.isFinite(Number(saved.hourlyCost)) ? Number(saved.hourlyCost) : 900,
    implOverrides: saved.implOverrides || {},
    included: saved.included || {},
    people: Array.isArray(saved.people) ? saved.people : [],
    session: saved.session || null,
    analysisId: saved.analysisId || ''
  };
}

function persist() {
  saveState(state);
}

function resolvedTheme() {
  if (state.theme === 'light' || state.theme === 'dark') return state.theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function locale() {
  return state.lang === 'en' ? 'en-GB' : 'nb-NO';
}

function num(value, digits = 1) {
  return new Intl.NumberFormat(locale(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits ? digits : 0
  }).format(Number(value) || 0);
}

function nok(value) {
  return new Intl.NumberFormat(locale(), {
    style: 'currency', currency: 'NOK', maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function band(value) {
  return t(value === 'high' ? 'high' : value === 'low' ? 'low' : 'medium');
}

function roiText(value) {
  if (value == null || !Number.isFinite(value)) return t('notComputed');
  return `${num(value, 1)}×`;
}

function monthsText(value) {
  if (value == null || !Number.isFinite(value)) return t('notComputed');
  return `${num(value, 1)} ${t('months')}`;
}

function freqText(step) {
  const known = {
    daily: 'freqDaily', weekly: 'freqWeekly', monthly: 'freqMonthly',
    quarterly: 'freqQuarterly', yearly: 'freqYearly', biweekly: 'freqBiweekly',
    assumed_monthly: 'freqAssumed'
  }[step.frequencyCode];
  const label = known ? t(known) : (step.frequencyRaw || '');
  const times = `${num(step.frequencyPerYear || 0, 0)} ${t('timesYear')}`;
  return label ? `${label} · ${times}` : times;
}

function personName(person) {
  return person?.label || person?.role || t('noLabel');
}

function deptName(value) {
  return value || t('noDept');
}

function activePeople() {
  return state.people.filter((person) => person && person.id);
}

function currentPerson() {
  const people = activePeople();
  return people.find((person) => person.id === state.analysisId)
    || people.find((person) => person.id === state.session?.person?.id && person.steps?.length)
    || people.find((person) => person.steps?.length)
    || people[0]
    || null;
}

function upsertSession() {
  if (!state.session) return;
  const hasSubstance = state.session.history.some((item) => item.role === 'user')
    || state.session.person.label
    || state.session.person.role
    || state.session.person.department;
  if (!hasSubstance && !state.people.some((item) => item.id === state.session.person.id)) return;
  const person = personFromSession(state.session);
  const index = state.people.findIndex((item) => item.id === person.id);
  if (index >= 0) state.people[index] = person;
  else state.people.push(person);
  state.analysisId = person.id;
}

function options() {
  return {
    hourlyCost: Number(state.hourlyCost) || 0,
    implOverrides: state.implOverrides,
    included: state.included
  };
}

function go(view, { speak = false } = {}) {
  state.speakOnNext = speak;
  const hash = TO_HASH[view] || '#oversikt';
  if (location.hash !== hash) location.hash = hash;
  else applyRoute();
}

function applyRoute() {
  const view = HASH[location.hash] || 'home';
  if (view === 'studio' && !state.session) {
    state.session = createSession({}, state.lang);
    upsertSession();
    persist();
  }
  state.view = view;
  render();
  if (state.speakOnNext && state.voiceOut && state.session && state.view === 'studio' && state.session.cursor !== 'done') {
    speech.speak(present(state.session).text);
  }
  state.speakOnNext = false;
}

function submit(text) {
  if (!state.session || state.session.cursor === 'done') return;
  speech.stop();
  state.voiceError = '';
  state.session = answer(state.session, text, state.lang);
  upsertSession();
  persist();
  render();
  if (state.session.notice === 'empty') return;
  if (state.voiceOut && state.session.cursor !== 'done') speech.speak(present(state.session).text);
  maybeAi(state.session);
}

async function maybeAi(session) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.endpoint) return;
  try {
    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: state.lang, transcript: session.history.slice(-30) })
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!data?.utterance || state.session?.person?.id !== session.person.id) return;
    const last = state.session.history.at(-1);
    if (!last || last.role !== 'guide') return;
    last.text = String(data.utterance).slice(0, 600);
    last.source = 'ai';
    upsertSession();
    persist();
    render();
    if (state.voiceOut) speech.speak(last.text);
  } catch {
    /* The local question stays. */
  }
}

function ctaMode() {
  if (!state.session) return 'start';
  if (state.session.cursor === 'done') return 'new';
  if (state.session.history.some((item) => item.role === 'user')) return 'continue';
  return 'start';
}

function render() {
  const theme = resolvedTheme();
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'nb';
  document.documentElement.dataset.theme = theme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = theme === 'dark' ? '#0B0D11' : '#F4F1EA';
  translateDom(state.lang);
  const titleKey = { home: 'titleHome', studio: 'titleStudio', analysis: 'titleAnalysis', org: 'titleOrg', report: 'titleReport' }[state.view];
  document.title = t(titleKey);
  paintChrome();
  const home = document.querySelector('#view-home');
  const stage = document.querySelector('#stage');
  home.hidden = state.view !== 'home';
  stage.hidden = state.view === 'home';
  if (state.view !== 'home') stage.innerHTML = viewMarkup(state.view);
  paintHome();
  if (state.view === 'studio') mountStudio();
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = t('heroLead');
}

function paintChrome() {
  const theme = resolvedTheme();
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.lang === state.lang ? 'true' : 'false');
  });
  const themeButton = document.querySelector('[data-theme-toggle]');
  if (themeButton) {
    themeButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    themeButton.setAttribute('aria-label', theme === 'dark' ? t('themeLight') : t('themeDark'));
    themeButton.innerHTML = theme === 'dark' ? sunIcon() : moonIcon();
  }
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === state.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const ai = document.querySelector('#ai-note');
  if (ai) ai.textContent = AI_CONFIG.enabled && AI_CONFIG.endpoint ? t('aiSummaryOn') : t('aiSummary');
  const privacy = document.querySelector('#privacy-body');
  if (privacy && AI_CONFIG.enabled && AI_CONFIG.endpoint) privacy.textContent = t('privacyAi');
  const wipe = document.querySelector('[data-wipe]');
  if (wipe) wipe.textContent = state.wipeArmed ? t('wipeConfirm') : t('wipe');
}

function paintHome() {
  const label = document.querySelector('#start-label');
  if (!label) return;
  const mode = ctaMode();
  label.textContent = t(mode === 'continue' ? 'ctaContinue' : mode === 'new' ? 'ctaNew' : 'ctaStart');
}

function paintVoice() {
  const button = document.querySelector('[data-mic]');
  const status = document.querySelector('#guide-status');
  const note = document.querySelector('#voice-note');
  const toggle = document.querySelector('[data-voice]');
  if (button) {
    button.classList.toggle('is-listening', speech.listening);
    button.classList.toggle('is-speaking', speech.speaking && !speech.listening);
    button.setAttribute('aria-pressed', speech.listening ? 'true' : 'false');
    button.disabled = !speech.supported;
  }
  if (status) {
    status.textContent = speech.listening ? t('statusListen') : speech.speaking ? t('statusSpeak') : t('statusReady');
  }
  if (toggle) toggle.textContent = state.voiceOut ? t('voiceToggleOn') : t('voiceToggleOff');
  if (toggle) toggle.setAttribute('aria-pressed', state.voiceOut ? 'true' : 'false');
  if (note) note.textContent = voiceMessage();
}

function voiceMessage() {
  if (!speech.supported) return t('voiceUnsupported');
  const codes = {
    'not-allowed': 'voiceDenied',
    'service-not-allowed': 'voiceDenied',
    'no-speech': 'voiceSilent',
    'audio-capture': 'voiceNoMic',
    network: 'voiceNetwork',
    start: 'voiceError',
    unsupported: 'voiceUnsupported'
  };
  if (state.voiceError) return t(codes[state.voiceError] || 'voiceError');
  return state.voiceOut ? t('voiceOn') : t('voiceOff');
}

function mountStudio() {
  const session = state.session;
  if (!session) return;
  drawMap();
  paintVoice();
  const heading = document.querySelector('#q-heading');
  const field = document.querySelector('#answer');
  if (session.cursor !== lastCursor) {
    lastCursor = session.cursor;
    const live = document.querySelector('#live');
    if (live) live.textContent = present(session).text;
    if (heading) heading.scrollIntoView({ block: 'nearest' });
    if (field) field.focus({ preventScroll: true });
    else heading?.focus();
  }
}

function drawMap() {
  const host = document.querySelector('#map');
  const session = state.session;
  if (!host || !session) return;
  renderMap(host, liveSteps(session.person, session.draft), {
    empty: t('mapEmpty'),
    pending: t('pending'),
    handoff: t('handoff'),
    perYear: t('perYear'),
    noTools: t('noTools')
  });
}

function viewMarkup(view) {
  if (view === 'studio') return studioMarkup();
  if (view === 'analysis') return analysisMarkup();
  if (view === 'org') return orgMarkup();
  return reportMarkup();
}

function studioMarkup() {
  const session = state.session;
  const question = present(session);
  const progress = progressLabel(session);
  const log = session.history.slice();
  if (log.at(-1)?.role === 'guide') log.pop();
  const done = question.done;
  return `
    <div class="wrap studio">
      <section class="card convo" aria-labelledby="q-heading">
        <div class="convo-top">
          <div>
            <p class="who">${esc(t('maestro'))}</p>
            <p id="guide-status" class="status">${esc(t('statusReady'))}</p>
          </div>
          <p class="progress">${esc(progress)}</p>
          <button type="button" class="text-btn" data-voice aria-pressed="${state.voiceOut ? 'true' : 'false'}">${esc(state.voiceOut ? t('voiceToggleOn') : t('voiceToggleOff'))}</button>
        </div>
        <ol class="log">
          ${log.map((item) => `<li class="${item.role}"><span>${esc(item.role === 'guide' ? t('maestro') : t('you'))}</span><p>${esc(item.text)}</p></li>`).join('')}
        </ol>
        <div class="ask">
          <h1 id="q-heading" tabindex="-1">${esc(question.text)}</h1>
        </div>
        ${done ? doneActions() : composer(question)}
        <p class="engine-note">${esc(AI_CONFIG.enabled && AI_CONFIG.endpoint ? t('aiEngine') : t('localEngine'))}</p>
      </section>
      <aside class="card map-panel">
        <div class="panel-head">
          <h2>${esc(t('mapTitle'))}</h2>
          <span class="est">${esc(t('estimate'))}</span>
        </div>
        <div id="map"></div>
      </aside>
    </div>`;
}

function progressLabel(session) {
  if (session.cursor === 'role' || session.cursor === 'department') return t('progressIntro');
  if (session.cursor === 'done') return t('progressDone');
  const progress = progressOf(session);
  return t('progressTask').replace('{n}', String(Math.max(1, progress.task || 1)));
}

function composer(question) {
  const chips = question.chips.map((chip) => `<button type="button" class="chip" data-chip="${esc(chip)}">${esc(chip)}</button>`).join('');
  return `
    <div class="chips">${chips}</div>
    <form id="composer">
      <label class="visually-hidden" for="answer">${esc(t('send'))}</label>
      <textarea id="answer" name="answer" rows="2" maxlength="2000" enterkeyhint="send" placeholder="${esc(question.placeholder)}" aria-labelledby="q-heading"></textarea>
      <div class="composer-actions">
        <button type="button" class="orb-btn" data-mic aria-pressed="false" aria-label="${esc(t('mic'))}">
          <span class="orb" aria-hidden="true"><span class="ring"></span><span class="ring r2"></span><span class="core"></span></span>
          <span>${esc(t('mic'))}</span>
        </button>
        <button type="button" class="text-btn" data-hear>${esc(t('hear'))}</button>
        <button type="submit" class="btn btn-primary">${esc(t('send'))}</button>
      </div>
    </form>
    <p id="voice-note" class="hint"></p>
    <p id="form-error" class="alert" role="alert">${state.session.notice === 'empty' ? esc(t('emptyAnswer')) : ''}</p>`;
}

function doneActions() {
  return `
    <div class="actions">
      <button type="button" class="btn btn-primary" data-go="analysis">${esc(t('seeAnalysis'))}</button>
      <button type="button" class="btn btn-ghost" data-add-task>${esc(t('addTask'))}</button>
      <button type="button" class="btn btn-ghost" data-go="org">${esc(t('addPerson'))}</button>
    </div>`;
}

function analysisMarkup() {
  const people = activePeople().filter((person) => person.steps?.length);
  const person = currentPerson();
  if (!person || !person.steps?.length) {
    return `<div class="wrap narrow">${emptyBlock(t('emptyAnalysis'), t('ctaStart'), 'studio')}</div>`;
  }
  const analysis = analyzePerson(person, options());
  return `
    <div class="wrap stack">
      <header class="page-head">
        <div>
          <p class="kicker">${esc(t('estimate'))}</p>
          <h1>${esc(t('navAnalysis'))}</h1>
        </div>
        <label class="field person-field">
          <span>${esc(t('person'))}</span>
          <select data-person>
            ${activePeople().map((item) => `<option value="${esc(item.id)}" ${item.id === person.id ? 'selected' : ''}>${esc(personName(item))}</option>`).join('')}
          </select>
        </label>
      </header>
      ${analysis.assumed ? `<p class="banner">${esc(t('assumedNote'))}</p>` : ''}
      ${summaryGrid(analysis)}
      <section class="card block">
        <h2>${esc(t('flagsTitle'))}</h2>
        ${analysis.flagList.length ? `<ul class="flags">${analysis.flagList.map((flag) => `<li><span class="tag tag-${esc(flag.type)}">${esc(t(`flag_${flag.type}`))}</span><span>${esc(flag.stepName)}</span><span class="muted">${esc(num(flag.hours, 1))} ${esc(t('perYear'))}</span></li>`).join('')}</ul>` : `<p class="hint">${esc(t('noFlags'))}</p>`}
      </section>
      <section class="block">
        <div class="panel-head">
          <h2>${esc(t('candidatesTitle'))}</h2>
          <span class="est">${esc(t('estimate'))}</span>
        </div>
        ${analysis.candidates.length ? `<div class="cands">${analysis.candidates.map((candidate, index) => candidateCard(candidate, index)).join('')}</div>` : `<p class="hint">${esc(t('noCandidates'))}</p>`}
        ${analysis.overlap ? `<p class="banner">${esc(t('overlapNote'))}</p>` : ''}
      </section>
      <section class="card block">
        <h2>${esc(t('stepsTitle'))}</h2>
        ${stepsTable(analysis.steps)}
      </section>
      <p class="hint">${esc(t('assumptions'))}</p>
      <div class="actions no-print">
        <button type="button" class="btn btn-primary" data-print>${esc(t('print'))}</button>
        <button type="button" class="btn btn-ghost" data-json>${esc(t('json'))}</button>
        <button type="button" class="btn btn-ghost" data-go="studio">${esc(t('backStudio'))}</button>
      </div>
    </div>`;
}

function summaryGrid(model) {
  return `
    <section class="card metrics" aria-label="${esc(t('estimate'))}">
      <label class="field metric metric-edit">
        <span>${esc(t('hourly'))}</span>
        <input id="hourly" type="number" min="0" max="100000" step="10" inputmode="decimal" value="${esc(state.hourlyCost)}">
        <small>${esc(t('hourlyHint'))}</small>
      </label>
      ${metric(t('hoursMapped'), num(model.hours, 1))}
      ${metric(t('hoursSaved'), num(model.hoursSaved, 1), true)}
      ${metric(t('moneySaved'), nok(model.annualSaving), true)}
      ${metric(t('implCost'), nok(model.implCost), true)}
      ${metric(t('roi'), roiText(model.roi), true)}
      ${metric(t('breakeven'), monthsText(model.breakevenMonths), true)}
    </section>`;
}

function metric(label, value, estimate = false) {
  return `<article class="metric"><span>${esc(label)}</span><strong data-kind="${esc(label)}">${esc(value)}</strong>${estimate ? `<em class="est">${esc(t('estimate'))}</em>` : ''}</article>`;
}

function candidateCard(candidate, index) {
  const level = { low: 1, medium: 2, high: 3 }[candidate.effort] || 2;
  const impact = { low: 1, medium: 2, high: 3 }[candidate.impact] || 1;
  const title = candidate.title[state.lang] || candidate.title.nb;
  const why = candidate.why[state.lang] || candidate.why.nb;
  return `
    <article class="card cand">
      <header>
        <span class="rank">${String(index + 1).padStart(2, '0')}</span>
        <h3>${esc(title)}</h3>
        <span class="est">${esc(t('estimate'))}</span>
      </header>
      <p>${esc(why)}</p>
      <p class="muted">${esc(candidate.stepName)}</p>
      <div class="bands">
        ${meter(t('effort'), band(candidate.effort), level)}
        ${meter(t('impact'), band(candidate.impact), impact)}
        <p><span>${esc(t('hoursSaved'))}</span><strong>${esc(num(candidate.hoursSaved, 1))}</strong></p>
        <p><span>${esc(t('capture'))}</span><strong>${esc(num(candidate.capture * 100, 0))} %</strong></p>
      </div>
      ${candidate.overlaps ? `<p class="hint">${esc(t('overlaps'))}</p>` : ''}
      <div class="cand-controls">
        <label class="field"><span>${esc(t('implField'))}</span><input type="number" min="0" step="1000" inputmode="decimal" data-impl="${esc(candidate.id)}" value="${esc(candidate.implCost)}"></label>
        <label class="check"><input type="checkbox" data-include="${esc(candidate.id)}" ${candidate.included ? 'checked' : ''}> ${esc(t('include'))}</label>
      </div>
    </article>`;
}

function meter(label, word, level) {
  const dots = [1, 2, 3].map((dot) => `<i class="${dot <= level ? 'on' : ''}"></i>`).join('');
  return `<p class="meter-row"><span>${esc(label)}</span><span class="meter" aria-label="${esc(label)}: ${esc(word)}">${dots}</span><strong>${esc(word)}</strong></p>`;
}

function stepsTable(steps) {
  const head = [t('colTask'), t('colRhythm'), t('colMinutes'), t('colHours'), t('colTools')];
  return `<div class="table-wrap"><table><thead><tr>${head.map((item) => `<th scope="col">${esc(item)}</th>`).join('')}</tr></thead><tbody>
    ${steps.map((step) => `<tr>
      <th scope="row">${esc(step.name)}</th>
      <td>${esc(freqText(step))}${step.frequencyAssumed ? ` · ${esc(t('assumedShort'))}` : ''}</td>
      <td>${esc(num((step.minutes || 0) + (step.chaseMinutes || 0), 0))}${step.minutesAssumed ? ` · ${esc(t('assumedShort'))}` : ''}</td>
      <td>${esc(num(step.hoursPerYear, 1))}</td>
      <td>${esc((step.tools || []).join(', '))}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function orgMarkup() {
  const org = analyzeOrg(activePeople(), options());
  const max = Math.max(...org.departments.map((dept) => dept.hours), 1);
  return `
    <div class="wrap stack">
      <header class="page-head">
        <div>
          <p class="kicker">${esc(t('estimate'))}</p>
          <h1>${esc(t('navOrg'))}</h1>
          <p class="lead">${esc(t('orgLead'))}</p>
        </div>
      </header>
      <form id="add-person" class="card form-grid">
        <label class="field"><span>${esc(t('label'))}</span><input name="label" autocomplete="off" placeholder="${esc(t('labelPh'))}"></label>
        <label class="field"><span>${esc(t('role'))}</span><input name="role" autocomplete="off" placeholder="${esc(t('rolePh'))}"></label>
        <label class="field"><span>${esc(t('dept'))}</span><input name="department" autocomplete="off" placeholder="${esc(t('deptPh'))}"></label>
        <button type="submit" class="btn btn-primary">${esc(t('startPerson'))}</button>
      </form>
      ${summaryGrid(org)}
      <section class="card block">
        <h2>${esc(t('peopleTitle'))}</h2>
        ${org.people.length ? `<ul class="people">${org.people.map((row) => `<li>
          <div><strong>${esc(personName(row))}</strong><span>${esc(deptName(row.department))}${row.role ? ` · ${esc(row.role)}` : ''}</span></div>
          <span>${esc(num(row.analysis.hours, 1))} ${esc(t('perYear'))}</span>
          <button type="button" class="text-btn" data-open-person="${esc(row.id)}">${esc(t('open'))}</button>
          <button type="button" class="text-btn danger" data-delete-person="${esc(row.id)}">${esc(t('remove'))}</button>
        </li>`).join('')}</ul>` : `<p class="hint">${esc(t('noPeople'))}</p>`}
      </section>
      <section class="card block">
        <h2>${esc(t('deptTitle'))}</h2>
        ${org.departments.length ? `<ul class="bars">${org.departments.map((dept) => `<li>
          <span>${esc(deptName(dept.name))}</span>
          <span class="bar" aria-hidden="true"><i style="width:${Math.max(4, (dept.hours / max) * 100)}%"></i></span>
          <span>${esc(num(dept.hours, 1))} ${esc(t('perYear'))} · ${esc(dept.people)} ${esc(t('countPeople'))}</span>
        </li>`).join('')}</ul>` : `<p class="hint">${esc(t('noPeople'))}</p>`}
      </section>
      <section class="block">
        <h2>${esc(t('orgTop'))}</h2>
        ${org.top.length ? `<ol class="top-list">${org.top.map((item) => `<li><strong>${esc(item.title[state.lang] || item.title.nb)}</strong><span>${esc(item.personLabel || '')} · ${esc(num(item.hoursSaved, 1))} ${esc(t('perYear'))}</span></li>`).join('')}</ol>` : `<p class="hint">${esc(t('noCandidates'))}</p>`}
      </section>
      <div class="actions no-print">
        <button type="button" class="btn btn-primary" data-print>${esc(t('print'))}</button>
        <button type="button" class="btn btn-ghost" data-json>${esc(t('json'))}</button>
      </div>
    </div>`;
}

function reportMarkup() {
  const org = analyzeOrg(activePeople(), options());
  const when = new Intl.DateTimeFormat(locale(), { dateStyle: 'long' }).format(new Date());
  const sections = org.people.map((row) => {
    const analysis = row.analysis;
    return `<section class="report-person">
      <h2>${esc(personName(row))}</h2>
      <p>${esc(deptName(row.department))}${row.role ? ` · ${esc(row.role)}` : ''}</p>
      ${analysis.steps.length ? stepsTable(analysis.steps) : `<p>${esc(t('noneYet'))}</p>`}
      ${analysis.candidates.filter((item) => item.included).map((item) => `<p><strong>${esc(item.title[state.lang] || item.title.nb)}</strong> — ${esc(item.why[state.lang] || item.why.nb)} ${esc(t('estimate'))}: ${esc(num(item.hoursSaved, 1))} ${esc(t('perYear'))}, ${esc(nok(item.implCost))}.</p>`).join('')}
    </section>`;
  }).join('');
  return `
    <article class="wrap report">
      <p class="kicker">Taktstokk</p>
      <h1>${esc(t('navReport'))}</h1>
      <p class="lead">${esc(t('reportLead'))}</p>
      <p>${esc(t('reportDate'))}: ${esc(when)}</p>
      ${summaryGrid(org)}
      ${sections || `<p>${esc(t('noneYet'))}</p>`}
      <h2>${esc(t('deptTitle'))}</h2>
      ${org.departments.map((dept) => `<p>${esc(deptName(dept.name))}: ${esc(num(dept.hours, 1))} ${esc(t('perYear'))}, ${esc(dept.people)} ${esc(t('countPeople'))}.</p>`).join('') || ''}
      <p class="hint">${esc(t('assumptions'))}</p>
      <p class="hint">${esc(t('reportPrivacy'))}</p>
      <div class="actions no-print">
        <button type="button" class="btn btn-primary" data-print>${esc(t('print'))}</button>
        <button type="button" class="btn btn-ghost" data-json>${esc(t('json'))}</button>
      </div>
    </article>`;
}

function emptyBlock(message, label, view) {
  return `<div class="card empty"><p>${esc(message)}</p><button type="button" class="btn btn-primary" data-go="${view}">${esc(label)}</button></div>`;
}

function paintFigures() {
  const person = state.view === 'org' ? null : currentPerson();
  const model = state.view === 'org' ? analyzeOrg(activePeople(), options()) : person ? analyzePerson(person, options()) : null;
  if (!model) return;
  const values = [
    [t('hoursSaved'), num(model.hoursSaved, 1)],
    [t('moneySaved'), nok(model.annualSaving)],
    [t('implCost'), nok(model.implCost)],
    [t('roi'), roiText(model.roi)],
    [t('breakeven'), monthsText(model.breakevenMonths)]
  ];
  for (const [label, value] of values) {
    document.querySelectorAll(`[data-kind="${CSS.escape(label)}"]`).forEach((node) => { node.textContent = value; });
  }
  const note = document.querySelector('.banner');
  if (state.view === 'analysis' && model.overlap && note && !note.dataset.lock) {
    /* overlap banner is rendered with the cards; a full refresh keeps it honest */
  }
}

function downloadJson() {
  const payload = {
    format: 'taktstokk-v1',
    exportedAt: new Date().toISOString(),
    note: state.lang === 'en'
      ? 'Local estimate. The page did not upload this file.'
      : 'Lokalt estimat. Siden lastet ikke opp denne filen.',
    hourlyCost: state.hourlyCost,
    people: activePeople().map((person) => ({
      id: person.id,
      label: person.label,
      role: person.role,
      department: person.department,
      createdAt: person.createdAt,
      steps: person.steps || []
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `taktstokk-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}

function moonIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.5a8.2 8.2 0 1 0 5 12.2A8 8 0 0 1 15.5 3.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
}
function sunIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}

function onClick(event) {
  const navToggle = event.target.closest('.nav-toggle');
  if (navToggle) {
    const nav = document.querySelector('#site-nav');
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    return;
  }
  if (event.target.closest('#site-nav a')) {
    document.querySelector('#site-nav')?.classList.remove('is-open');
    document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
  }
  if (event.target.closest('[data-theme-toggle]')) {
    state.theme = resolvedTheme() === 'dark' ? 'light' : 'dark';
    state.wipeArmed = false;
    persist();
    render();
    return;
  }
  const lang = event.target.closest('[data-lang]');
  if (lang) {
    state.lang = lang.dataset.lang === 'en' ? 'en' : 'nb';
    if (state.session) state.session.lang = state.lang;
    state.wipeArmed = false;
    persist();
    render();
    return;
  }
  if (event.target.closest('[data-action="start"]')) {
    const mode = ctaMode();
    if (mode === 'new' || !state.session) {
      state.session = createSession({}, state.lang);
      upsertSession();
      persist();
    }
    go('studio', { speak: true });
    return;
  }
  const jump = event.target.closest('[data-go]');
  if (jump) {
    if (jump.dataset.go === 'studio' && (!state.session || state.session.cursor === 'done')) {
      const person = currentPerson();
      if (person && state.session?.cursor === 'done' && person.id === state.session.person.id) {
        /* keep the finished session visible */
      } else if (!state.session) {
        state.session = createSession({}, state.lang);
        upsertSession();
        persist();
      }
    }
    go(jump.dataset.go, { speak: jump.dataset.go === 'studio' && !!event.target.closest('[data-action]') });
    return;
  }
  if (event.target.closest('[data-mic]')) {
    state.voiceError = '';
    speech.toggle();
    return;
  }
  if (event.target.closest('[data-hear]')) {
    if (state.session) speech.speak(present(state.session).text);
    return;
  }
  if (event.target.closest('[data-voice]')) {
    state.voiceOut = !state.voiceOut;
    if (!state.voiceOut) speech.cancel();
    persist();
    paintVoice();
    return;
  }
  const chip = event.target.closest('[data-chip]');
  if (chip) {
    submit(chip.dataset.chip);
    return;
  }
  if (event.target.closest('[data-add-task]')) {
    const person = personFromSession(state.session);
    state.session = continueSession(person, state.lang);
    upsertSession();
    persist();
    go('studio', { speak: true });
    return;
  }
  const opener = event.target.closest('[data-open-person]');
  if (opener) {
    const person = state.people.find((item) => item.id === opener.dataset.openPerson);
    if (!person) return;
    state.session = sessionFromPerson(person, state.lang);
    state.analysisId = person.id;
    persist();
    go('studio');
    return;
  }
  const remover = event.target.closest('[data-delete-person]');
  if (remover) {
    state.people = state.people.filter((item) => item.id !== remover.dataset.deletePerson);
    if (state.session?.person?.id === remover.dataset.deletePerson) state.session = null;
    if (state.analysisId === remover.dataset.deletePerson) state.analysisId = '';
    persist();
    render();
    return;
  }
  if (event.target.closest('[data-print]')) {
    if (state.view !== 'report') {
      state.view = 'report';
      if (location.hash !== '#rapport') history.pushState(null, '', '#rapport');
      render();
    }
    window.print();
    return;
  }
  if (event.target.closest('[data-json]')) {
    downloadJson();
    return;
  }
  const wipe = event.target.closest('[data-wipe]');
  if (wipe) {
    if (!state.wipeArmed) {
      state.wipeArmed = true;
      wipe.textContent = t('wipeConfirm');
      return;
    }
    clearState();
    speech.cancel();
    state = fresh();
    lastCursor = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
    render();
  }
}

function boot() {
  document.addEventListener('click', onClick);
  document.addEventListener('submit', (event) => {
    if (event.target.id === 'composer') {
      event.preventDefault();
      submit(document.querySelector('#answer')?.value || '');
    }
    if (event.target.id === 'add-person') {
      event.preventDefault();
      const data = new FormData(event.target);
      state.session = createSession({
        label: String(data.get('label') || '').trim(),
        role: String(data.get('role') || '').trim(),
        department: String(data.get('department') || '').trim()
      }, state.lang);
      upsertSession();
      persist();
      go('studio', { speak: true });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.id === 'answer' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(event.target.value);
    }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'hourly') {
      const value = Math.min(100000, Math.max(0, Number(event.target.value) || 0));
      state.hourlyCost = value;
      persist();
      paintFigures();
    }
    if (event.target.dataset.impl != null) {
      state.implOverrides[event.target.dataset.impl] = event.target.value === '' ? 0 : Math.max(0, Number(event.target.value) || 0);
      persist();
      paintFigures();
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.dataset.include != null) {
      state.included[event.target.dataset.include] = event.target.checked;
      persist();
      render();
      return;
    }
    if (event.target.dataset.person != null) {
      state.analysisId = event.target.value;
      const person = state.people.find((item) => item.id === event.target.value);
      if (person) state.session = sessionFromPerson(person, state.lang);
      persist();
      render();
    }
  });
  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('resize', () => { if (state.view === 'studio') drawMap(); });
  if (location.hash && HASH[location.hash]) applyRoute();
  else render();
}

boot();
