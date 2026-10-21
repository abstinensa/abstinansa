/**
 * Taktstokk interview, classification and ROI model.
 * Pure functions. No network, no DOM, no secrets.
 *
 * Time model (stated as estimates in the UI):
 * - "daglig" = 230 occurrences / year, "ukentlig" = 46.
 * - Chase minutes from the waiting question are added to active minutes.
 * - A candidate saves a share of those hours: low effort 75%, medium 55%, high 30%.
 * - Default implementation cost: 35 000 / 90 000 / 220 000 kr.
 * - When several candidates describe the same step, the total counts the
 *   highest hour-saving once. Costs of ticked candidates are summed.
 */

export const MODEL = {
  workdays: 230,
  weeks: 46,
  capture: { low: 0.75, medium: 0.55, high: 0.3 },
  implCost: { low: 35000, medium: 90000, high: 220000 },
  defaultHourly: 900,
  maxFollowups: 3
};

const WORD_NUM = {
  en: 1, ett: 1, ei: 1, a: 1, an: 1, one: 1,
  to: 2, two: 2, tre: 3, three: 3, fire: 4, four: 4,
  fem: 5, five: 5, seks: 6, six: 6, sju: 7, syv: 7, seven: 7,
  atte: 8, eight: 8, ni: 9, nine: 9, ti: 10, ten: 10,
  elleve: 11, eleven: 11, tolv: 12, twelve: 12
};

const FOLLOWUPS = [
  { id: 'copy_path', keys: ['kopier', 'kopiere', 'copy', 'paste', 'lim inn', 'manuelt', 'manuell', 'punche', 'taster inn'] },
  { id: 'excel_contents', keys: ['excel', 'regneark', 'spreadsheet', 'google sheet'] },
  { id: 'pdf_rekey', keys: ['pdf', 'skann', 'scan', 'papir', 'blankett'] },
  { id: 'email_role', keys: ['e-post', 'epost', 'email', 'outlook', 'gmail'] },
  { id: 'wait_who', keys: ['venter', 'ventetid', 'venting', 'godkjenning', 'godkjenne', 'godkjenner', 'approval', 'purre', 'purring', 'queue'] },
  { id: 'report_sources', keys: ['rapport', 'powerpoint', 'ppt', 'dashboard'] },
  { id: 'error_kind', keys: ['feil', 'avvik', 'dobbelt', 'omarbeid', 'rework', 'korriger'] },
  { id: 'system_gap', keys: ['sap', 'visma', 'unit4', 'salesforce', 'dynamics', 'fagsystem', 'sharepoint', 'erp', 'crm'] }
];

const PROMPTS = {
  intro: {
    nb: 'Jeg er Maestro. Vi kartlegger én oppgave om gangen, slik den faktisk gjøres.',
    en: 'I am Maestro. We map one task at a time, the way the work is actually done.'
  },
  role: {
    nb: 'Hva er rollen din, og hvilken avdeling hører arbeidet til?',
    en: 'What is your role, and which department does the work belong to?'
  },
  department: {
    nb: 'Hvilken avdeling eller hvilket team er dette for?',
    en: 'Which department or team is this for?'
  },
  task_name: {
    nb: 'Nevn én oppgave du gjør om igjen. Hva kaller du den?',
    en: 'Name one task you do again and again. What do you call it?'
  },
  task_trigger: {
    nb: 'Hva setter oppgaven i gang?',
    en: 'What kicks the task off?'
  },
  task_frequency: {
    nb: 'Hvor ofte skjer det?',
    en: 'How often does it happen?'
  },
  task_frequency_retry: {
    nb: 'Jeg fikk ikke tak i rytmen. Prøv for eksempel «daglig», «ukentlig» eller «tre ganger i måneden».',
    en: 'I did not catch the rhythm. Try “daily”, “weekly”, or “three times a month”.'
  },
  task_minutes: {
    nb: 'Hvor mange minutter bruker du aktivt hver gang?',
    en: 'How many minutes do you actively spend each time?'
  },
  task_minutes_retry: {
    nb: 'Et tall er nok. Omtrent hvor mange minutter tar selve jobben?',
    en: 'A number is enough. About how many minutes does the work itself take?'
  },
  task_tools: {
    nb: 'Hvilke systemer eller verktøy er med?',
    en: 'Which systems or tools are involved?'
  },
  task_handoff: {
    nb: 'Hvem leverer du til, eller hvem venter du på? Si «ingen» hvis steget blir hos deg.',
    en: 'Who do you hand this to, or who are you waiting on? Say “no one” if it stays with you.'
  },
  task_workaround: {
    nb: 'Kopierer du noe for hånd, eller holder et regneark eller en e-post tråden sammen?',
    en: 'Do you copy anything by hand, or does a spreadsheet or an email hold the thread together?'
  },
  task_wait: {
    nb: 'Er det ventetid, godkjenning eller kø? Hvor mange minutter går med til å følge opp?',
    en: 'Is there waiting, approval, or a queue? How many minutes do you spend chasing it?'
  },
  task_errors: {
    nb: 'Hender det feil, dobbeltarbeid eller at noe må gjøres på nytt?',
    en: 'Do errors, double work, or rework show up?'
  },
  more_tasks: {
    nb: 'Er det en annen oppgave vi bør ta med?',
    en: 'Is there another task we should include?'
  },
  more_tasks_retry: {
    nb: 'Skal vi ta en oppgave til, eller er kartleggingen ferdig?',
    en: 'Shall we take another task, or is the mapping finished?'
  },
  done: {
    nb: 'Kartleggingen er inne. Tallene i analysen er estimat, og du kan justere timepris og kostnad.',
    en: 'The mapping is in. The figures in the analysis are estimates, and you can adjust the hourly rate and cost.'
  },
  fu_copy_path: {
    nb: 'Hvor kopierer du fra, og hvor havner det til slutt?',
    en: 'Where do you copy from, and where does it end up?'
  },
  fu_excel_contents: {
    nb: 'Hva ligger i regnearket som ikke finnes i et fagsystem?',
    en: 'What sits in the spreadsheet that is not in a system of record?'
  },
  fu_pdf_rekey: {
    nb: 'Blir innholdet fra dokumentet tastet inn på nytt etterpå?',
    en: 'Is the document typed in again afterwards?'
  },
  fu_email_role: {
    nb: 'Hva gjør e-posten i steget — starter den saken, bærer den et vedlegg, eller er den selve godkjenningen?',
    en: 'What does email do here — start the case, carry an attachment, or act as the approval?'
  },
  fu_wait_who: {
    nb: 'Hvem er det dere venter på, og hva skal til for at steget går videre?',
    en: 'Who are you waiting on, and what has to happen before the step can move?'
  },
  fu_report_sources: {
    nb: 'Hentes tallene fra flere steder før rapporten settes sammen?',
    en: 'Are the figures gathered from several places before the report is assembled?'
  },
  fu_error_kind: {
    nb: 'Hva er den vanligste feilen, og hvem retter den?',
    en: 'What is the most common error, and who fixes it?'
  },
  fu_system_gap: {
    nb: 'Finnes informasjonen allerede i systemet, eller fører dere en kopi ved siden av?',
    en: 'Does the system already hold this, or do you keep a copy beside it?'
  }
};

const FLOW = [
  'task_name', 'task_trigger', 'task_frequency', 'task_minutes',
  'task_tools', 'task_handoff', 'task_workaround', 'task_wait', 'task_errors'
];

let seq = 0;
function uid(prefix) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function fold(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/é/g, 'e');
}

function wordsOf(value) {
  return fold(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenHit(word, needle) {
  if (word === needle) return true;
  if (needle.length < 5 || !word.startsWith(needle)) return false;
  return /^(e|en|et|er|ene|n|t)?$/.test(word.slice(needle.length));
}

export function hasKey(blob, key) {
  const hay = wordsOf(blob);
  const needle = wordsOf(key);
  if (!needle || !hay) return false;
  if (needle.includes(' ')) return ` ${hay} `.includes(` ${needle} `);
  return hay.split(' ').some((word) => tokenHit(word, needle));
}

function flat(value) {
  return fold(value)
    .replace(/(\d)\s*,\s*(\d)/g, '$1.$2')
    .replace(/[^a-z0-9.\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(blob, keys) {
  return keys.some((key) => hasKey(blob, key));
}

function tidy(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').trim();
}

export function parseRole(text) {
  let raw = tidy(text).replace(/^(jeg er|eg er|i am|i'm|im)\s+/i, '');
  const split = raw.match(/^(.+?)\s+(?:i|på|hos|in|at)\s+(.+)$/i);
  if (split) return { role: tidy(split[1]), department: tidy(split[2]) };
  const comma = raw.split(',');
  if (comma.length === 2 && tidy(comma[0]) && tidy(comma[1])) {
    return { role: tidy(comma[0]), department: tidy(comma[1]) };
  }
  return { role: tidy(raw), department: '' };
}

function wordNumber(token) {
  if (token == null) return null;
  const t = String(token);
  if (/^\d+(?:\.\d+)?$/.test(t)) return parseFloat(t);
  return WORD_NUM[wordsOf(t)] ?? null;
}

function unitOf(word) {
  const w = wordsOf(word);
  if (/^(dag|dagen|daglig|day|daily)$/.test(w)) return 'day';
  if (/^(uke|uka|uken|ukentlig|week|weekly)$/.test(w)) return 'week';
  if (/^(maned|maneden|manedlig|month|monthly)$/.test(w)) return 'month';
  if (/^(kvartal|kvartalet|kvartalsvis|quarter|quarterly)$/.test(w)) return 'quarter';
  if (/^(ar|aret|arlig|year|yearly|annually)$/.test(w)) return 'year';
  return null;
}

const PER_YEAR = { day: MODEL.workdays, week: MODEL.weeks, month: 12, quarter: 4, year: 1 };

export function parseFrequency(text) {
  const f = flat(text);
  const times = f.match(/(\d+(?:\.\d+)?|[a-z]+)\s+ganger?(?:\s+(?:om|i|per|a|an))?\s+([a-z]+)/)
    || f.match(/(\d+(?:\.\d+)?|[a-z]+)\s+times?(?:\s+(?:a|an|per|each))?\s+([a-z]+)/);
  if (times) {
    const n = wordNumber(times[1]);
    const unit = unitOf(times[2]);
    if (n && unit) {
      return { perYear: Math.round(n * PER_YEAR[unit]), code: 'custom', confident: true, raw: tidy(text) };
    }
  }
  const rules = [
    [/annenhver uke|hver annen uke|biweekly|every other week/, 23, 'biweekly'],
    [/hver arbeidsdag|hver dag|daglig|daily|each day|every day/, MODEL.workdays, 'daily'],
    [/ukentlig|hver uke|weekly|each week|every week/, MODEL.weeks, 'weekly'],
    [/manedlig|hver maned|monthly|each month|every month/, 12, 'monthly'],
    [/kvartalsvis|hvert kvartal|quarterly|each quarter/, 4, 'quarterly'],
    [/arlig|hvert ar|en gang i aret|once a year|yearly|annually/, 1, 'yearly']
  ];
  for (const [pattern, perYear, code] of rules) {
    if (pattern.test(f)) return { perYear, code, confident: true, raw: tidy(text) };
  }
  const per = f.match(/(\d+(?:\.\d+)?|[a-z]+)\s+(?:per|i|a|om)\s+(dagen|dag|uka|uken|uke|maneden|maned|kvartalet|kvartal|aret|ar|day|week|month|quarter|year)/);
  if (per) {
    const n = wordNumber(per[1]);
    const unit = unitOf(per[2]);
    if (n && unit) return { perYear: Math.round(n * PER_YEAR[unit]), code: 'custom', confident: true, raw: tidy(text) };
  }
  return { perYear: null, code: '', confident: false, raw: tidy(text) };
}

export function parseMinutes(text) {
  const f = flat(text);
  if (/(halvannen time|an hour and a half)/.test(f)) return { minutes: 90, confident: true };
  if (/(halvtime|halv time|half an hour|half hour)/.test(f)) return { minutes: 30, confident: true };
  if (/(kvarter|quarter of an hour|a quarter of an hour)/.test(f)) return { minutes: 15, confident: true };
  const clock = f.match(/(?:^|\s)(\d+(?:\.\d+)?) t(?:\s|$)/);
  if (clock) return { minutes: Math.round(parseFloat(clock[1]) * 60), confident: true };
  const hours = f.match(/(\d+(?:\.\d+)?)\s*(timer|time|hours|hour)\b/);
  if (hours) return { minutes: Math.round(parseFloat(hours[1]) * 60), confident: true };
  const wordHour = f.match(/\b([a-z]+)\s+(timer|time|hours|hour)\b/);
  if (wordHour && WORD_NUM[wordHour[1]] != null) return { minutes: WORD_NUM[wordHour[1]] * 60, confident: true };
  const mins = f.match(/(\d+(?:\.\d+)?)\s*(minutter|minutt|minutes|mins|min)\b/);
  if (mins) return { minutes: Math.round(parseFloat(mins[1])), confident: true };
  const wordMin = f.match(/\b([a-z]+)\s+(minutter|minutt|minutes|mins|min)\b/);
  if (wordMin && WORD_NUM[wordMin[1]] != null) return { minutes: WORD_NUM[wordMin[1]], confident: true };
  const approx = f.match(/(?:ca|cirka|omtrent|about|around)\s+(\d+(?:\.\d+)?)/);
  if (approx) return { minutes: Math.round(parseFloat(approx[1])), confident: true };
  const bare = f.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return { minutes: Math.round(parseFloat(bare[1])), confident: true };
  return { minutes: null, confident: false };
}

export function parseChaseMinutes(text) {
  const f = flat(text);
  if (/(dager|days|uker|weeks)/.test(f) && !/(minutt|minutter|min\b|time|timer|hour|hours)/.test(f)) return 0;
  const parsed = parseMinutes(text);
  if (!parsed.confident || parsed.minutes == null) return 0;
  return Math.min(480, parsed.minutes);
}

export function parseTools(text) {
  return String(text || '')
    .split(/\s*(?:,|;|\/|\+|&|\bog\b|\band\b)\s*/i)
    .map((part) => tidy(part).replace(/^(jeg bruker|vi bruker|bruker|we use|i use)\s+/i, ''))
    .map(tidy)
    .filter((part) => part && !/^(ingen|none|ikke noe|nothing)$/i.test(part));
}

export function isNo(text) {
  const f = wordsOf(text);
  return /^(nei|no|nope|ferdig|stopp|done)\b/.test(f)
    || /\b(det var alt|vis analysen|show the analysis|that is all|that's all)\b/.test(f);
}

export function isYes(text) {
  if (isNo(text)) return false;
  const f = wordsOf(text);
  return /^(ja|yes|jepp|yeah|gjerne|neste|ok)\b/.test(f)
    || /\b(neste oppgave|en oppgave til|another task|legg til)\b/.test(f);
}

export function detectWorkaround(text) {
  if (hasAny(text, ['excel', 'regneark', 'spreadsheet', 'kopier', 'kopiere', 'manuelt', 'manuell', 'paste', 'lim inn'])) {
    return true;
  }
  if (isNo(text)) return false;
  if (isYes(text)) return true;
  return false;
}

export function detectAffirm(text) {
  const f = wordsOf(text);
  const negative = /^(nei|no|ingen|ikke|never|nope)\b/.test(f);
  const positive = /\b(ja|yes|jepp|ofte|alltid|av og til|iblant|som regel|pleier|sometimes|often)\b/.test(f);
  if (negative && !positive && !hasAny(text, ['feil', 'avvik', 'venter', 'godkjenning', 'kopier', 'excel', 'manuelt'])) {
    return false;
  }
  if (positive) return true;
  if (hasAny(text, ['feil', 'avvik', 'venter', 'ventetid', 'godkjenning', 'kopier', 'excel', 'manuelt', 'omarbeid', 'dobbelt'])) {
    return true;
  }
  return false;
}

export function hasHandoff(value) {
  const f = wordsOf(value);
  if (!f) return false;
  return !/^(ingen|none|no one|nobody|meg selv|myself|nei|no|hos meg|with me)$/.test(f);
}

function emptyDraft() {
  return {
    name: '',
    trigger: '',
    frequencyPerYear: null,
    frequencyCode: '',
    frequencyRaw: '',
    frequencyConfident: false,
    frequencyAssumed: false,
    minutes: null,
    minutesConfident: false,
    minutesAssumed: false,
    chaseMinutes: 0,
    tools: [],
    toolsRaw: '',
    handoff: '',
    workaround: false,
    workaroundRaw: '',
    wait: false,
    waitRaw: '',
    errorProne: false,
    errorRaw: '',
    notes: [],
    corpus: [],
    committed: false
  };
}

function langOf(session) {
  return session.lang === 'en' ? 'en' : 'nb';
}

export function questionPrompt(id, lang) {
  const pack = PROMPTS[id] || PROMPTS.done;
  return pack[lang === 'en' ? 'en' : 'nb'];
}

function placeholder(id, lang) {
  const nb = lang !== 'en';
  const map = {
    role: nb ? 'For eksempel: saksbehandler i økonomi' : 'For example: caseworker in finance',
    department: nb ? 'For eksempel: økonomi' : 'For example: finance',
    task_name: nb ? 'For eksempel: månedlig avstemming' : 'For example: monthly reconciliation',
    task_trigger: nb ? 'En e-post, en frist, en sak …' : 'An email, a deadline, a case …',
    task_frequency: nb ? 'Daglig, ukentlig, tre ganger i måneden …' : 'Daily, weekly, three times a month …',
    task_minutes: nb ? 'For eksempel 25' : 'For example 25',
    task_tools: nb ? 'Excel, e-post, Visma …' : 'Excel, email, Visma …',
    task_handoff: nb ? 'Navn på rolle, eller «ingen»' : 'A role, or “no one”',
    task_workaround: nb ? 'Ja, fra PDF til Excel — eller nei' : 'Yes, from PDF into Excel — or no',
    task_wait: nb ? 'Ja, 15 minutter på purring — eller nei' : 'Yes, 15 minutes chasing — or no',
    task_errors: nb ? 'Ja, feil kontonummer — eller nei' : 'Yes, a wrong account — or no'
  };
  return map[id] || (nb ? 'Skriv svaret' : 'Type the answer');
}

function chipsFor(id, lang) {
  const nb = lang !== 'en';
  if (id === 'task_frequency' || id === 'task_frequency_retry') {
    return nb ? ['Daglig', 'Ukentlig', 'Månedlig', 'Kvartalsvis'] : ['Daily', 'Weekly', 'Monthly', 'Quarterly'];
  }
  if (id === 'task_workaround' || id === 'task_wait' || id === 'task_errors') return nb ? ['Ja', 'Nei'] : ['Yes', 'No'];
  if (id === 'more_tasks' || id === 'more_tasks_retry') {
    return nb ? ['Ja, en oppgave til', 'Nei, vis analysen'] : ['Yes, another task', 'No, show the analysis'];
  }
  if (id === 'task_minutes' || id === 'task_minutes_retry') return ['15', '30', '45', '60'];
  return [];
}

export function present(session) {
  const lang = langOf(session);
  const id = session.cursor;
  return {
    id,
    text: questionPrompt(id, lang),
    placeholder: placeholder(id, lang),
    chips: chipsFor(id, lang),
    done: id === 'done'
  };
}

export function progressOf(session) {
  const inTask = !['role', 'department', 'done', 'intro'].includes(session.cursor);
  const task = session.person.steps.length + (inTask && session.cursor !== 'more_tasks' && session.cursor !== 'more_tasks_retry' ? 1 : 0);
  return {
    task: Math.max(task, session.person.steps.length || (inTask ? 1 : 0)),
    steps: session.person.steps.length,
    done: session.cursor === 'done'
  };
}

export function createSession(seed = {}, lang = 'nb') {
  const person = {
    id: seed.id || uid('p'),
    label: seed.label || '',
    role: seed.role || '',
    department: seed.department || '',
    steps: structuredClone(seed.steps || []),
    createdAt: seed.createdAt || new Date().toISOString()
  };
  if (!person.label && person.role && person.department) person.label = `${person.role} · ${person.department}`;
  const cursor = person.role && person.department ? 'task_name' : 'role';
  const session = {
    lang: lang === 'en' ? 'en' : 'nb',
    phase: 'ask',
    cursor,
    reasks: {},
    person,
    draft: emptyDraft(),
    followups: [],
    asked: [],
    history: [],
    notice: ''
  };
  if (!seed.resume) session.history.push({ role: 'guide', qid: 'intro', text: questionPrompt('intro', session.lang) });
  session.history.push({ role: 'guide', qid: cursor, text: questionPrompt(cursor, session.lang) });
  return session;
}

export function continueSession(person, lang = 'nb') {
  return createSession({
    id: person.id,
    label: person.label,
    role: person.role,
    department: person.department,
    steps: person.steps || [],
    createdAt: person.createdAt,
    resume: true
  }, lang);
}

function applyFrequency(draft, text, isRetry) {
  const parsed = parseFrequency(text);
  draft.frequencyRaw = tidy(text);
  draft.corpus.push(draft.frequencyRaw);
  if (parsed.confident) {
    draft.frequencyPerYear = parsed.perYear;
    draft.frequencyCode = parsed.code;
    draft.frequencyConfident = true;
    draft.frequencyAssumed = false;
    return;
  }
  if (isRetry) {
    draft.frequencyPerYear = 12;
    draft.frequencyCode = 'assumed_monthly';
    draft.frequencyConfident = true;
    draft.frequencyAssumed = true;
    return;
  }
  draft.frequencyPerYear = null;
  draft.frequencyConfident = false;
  draft.frequencyAssumed = false;
}

function applyMinutes(draft, text, isRetry) {
  const parsed = parseMinutes(text);
  draft.corpus.push(tidy(text));
  if (parsed.confident) {
    draft.minutes = parsed.minutes;
    draft.minutesConfident = true;
    draft.minutesAssumed = false;
    return;
  }
  if (isRetry) {
    draft.minutes = 30;
    draft.minutesConfident = true;
    draft.minutesAssumed = true;
    return;
  }
  draft.minutes = null;
  draft.minutesConfident = false;
  draft.minutesAssumed = false;
}

function applyAnswer(session, qid, text) {
  const d = session.draft;
  if (qid === 'role') {
    const parsed = parseRole(text);
    session.person.role = parsed.role;
    if (parsed.department) session.person.department = parsed.department;
    if (!session.person.label || session.person.label === session.person.role) {
      session.person.label = session.person.department
        ? `${session.person.role} · ${session.person.department}`
        : session.person.role;
    }
    return;
  }
  if (qid === 'department') {
    session.person.department = tidy(text);
    if (!session.person.label || session.person.label === session.person.role) {
      session.person.label = `${session.person.role} · ${session.person.department}`;
    }
    return;
  }
  if (qid === 'task_name') {
    d.name = tidy(text);
    d.corpus.push(d.name);
    return;
  }
  if (qid === 'task_trigger') {
    d.trigger = tidy(text);
    d.corpus.push(d.trigger);
    return;
  }
  if (qid === 'task_frequency' || qid === 'task_frequency_retry') {
    applyFrequency(d, text, qid.endsWith('_retry'));
    return;
  }
  if (qid === 'task_minutes' || qid === 'task_minutes_retry') {
    applyMinutes(d, text, qid.endsWith('_retry'));
    return;
  }
  if (qid === 'task_tools') {
    d.toolsRaw = tidy(text);
    d.tools = parseTools(text);
    d.corpus.push(d.toolsRaw);
    return;
  }
  if (qid === 'task_handoff') {
    d.handoff = tidy(text);
    d.corpus.push(d.handoff);
    return;
  }
  if (qid === 'task_workaround') {
    d.workaroundRaw = tidy(text);
    d.workaround = detectWorkaround(text);
    d.corpus.push(d.workaroundRaw);
    return;
  }
  if (qid === 'task_wait') {
    d.waitRaw = tidy(text);
    d.wait = detectAffirm(text);
    d.chaseMinutes = parseChaseMinutes(text);
    d.corpus.push(d.waitRaw);
    return;
  }
  if (qid === 'task_errors') {
    d.errorRaw = tidy(text);
    d.errorProne = detectAffirm(text);
    d.corpus.push(d.errorRaw);
    return;
  }
  if (qid.startsWith('fu_')) {
    const note = { id: qid.slice(3), text: tidy(text) };
    d.notes.push(note);
    d.corpus.push(note.text);
    if (detectWorkaround(text)) d.workaround = true;
    if (hasAny(text, ['venter', 'godkjenning', 'purre'])) d.wait = true;
    if (hasAny(text, ['feil', 'avvik', 'omarbeid'])) d.errorProne = true;
  }
}

function rebuildFollowups(session) {
  const blob = session.draft.corpus.join('\n');
  const hits = [];
  for (const item of FOLLOWUPS) {
    if (session.asked.includes(item.id)) continue;
    if (item.keys.some((key) => hasKey(blob, key))) hits.push(item.id);
  }
  const room = MODEL.maxFollowups - session.asked.length;
  session.followups = room > 0 ? hits.slice(0, room) : [];
}

function blobOf(step) {
  return [
    step.name, step.trigger, ...(step.tools || []), step.handoff, step.notes,
    step.answers?.workaround, step.answers?.wait, step.answers?.error,
    ...(step.answers?.notes || []).map((n) => n.text)
  ].filter(Boolean).join('\n');
}

export function classifyStep(step) {
  const blob = blobOf(step);
  const hours = step.hoursPerYear || 0;
  const excel = hasAny(blob, ['excel', 'regneark', 'spreadsheet']);
  const copy = !!step.workaround || hasAny(blob, ['kopier', 'kopiere', 'manuelt', 'manuell', 'paste', 'lim inn']);
  const email = hasAny(blob, ['e-post', 'epost', 'email', 'outlook']);
  const wait = !!step.wait || hasAny(blob, ['venter', 'ventetid', 'godkjenning', 'godkjenne', 'purre']);
  const error = !!step.errorProne || hasAny(blob, ['feil', 'avvik', 'omarbeid', 'dobbelt', 'rework']);
  const report = hasAny(blob, ['rapport', 'powerpoint', 'ppt', 'dashboard']);
  const flags = [];
  if ((hours >= 40 && (copy || excel || report || wait)) || hours >= 100) {
    flags.push({ type: 'time_thief', severity: hours >= 80 ? 'high' : 'medium' });
  }
  if (excel || (copy && (email || step.workaround))) flags.push({ type: 'workaround', severity: 'high' });
  if (wait) flags.push({ type: 'bottleneck', severity: hours >= 20 ? 'high' : 'medium' });
  if (error) flags.push({ type: 'rework', severity: 'medium' });
  if (report && (excel || copy)) flags.push({ type: 'assembly', severity: 'high' });
  const seen = new Set();
  return flags.filter((flag) => (seen.has(flag.type) ? false : seen.add(flag.type)));
}

function finalizeStep(draft) {
  const minutes = (draft.minutes || 0) + (draft.chaseMinutes || 0);
  const perYear = draft.frequencyPerYear || 0;
  const step = {
    id: uid('s'),
    name: draft.name || 'Oppgave',
    trigger: draft.trigger || '',
    frequencyPerYear: perYear,
    frequencyCode: draft.frequencyCode || 'custom',
    frequencyRaw: draft.frequencyRaw || '',
    frequencyAssumed: !!draft.frequencyAssumed,
    minutes: draft.minutes || 0,
    chaseMinutes: draft.chaseMinutes || 0,
    minutesAssumed: !!draft.minutesAssumed,
    hoursPerYear: round1((perYear * minutes) / 60),
    tools: [...(draft.tools || [])],
    handoff: draft.handoff || '',
    workaround: !!draft.workaround,
    wait: !!draft.wait,
    errorProne: !!draft.errorProne,
    notes: (draft.notes || []).map((note) => note.text).filter(Boolean).join('\n'),
    answers: {
      workaround: draft.workaroundRaw || '',
      wait: draft.waitRaw || '',
      error: draft.errorRaw || '',
      notes: draft.notes || []
    }
  };
  step.flags = classifyStep(step);
  return step;
}

function commitDraft(session) {
  if (!session.draft || session.draft.committed || !session.draft.name) return null;
  const step = finalizeStep(session.draft);
  session.person.steps.push(step);
  session.draft.committed = true;
  return step;
}

function pickNext(session, qid, text) {
  if (qid === 'role') return session.person.department ? 'task_name' : 'department';
  if (qid === 'department') return 'task_name';
  if (qid === 'task_frequency' && !session.draft.frequencyConfident) return 'task_frequency_retry';
  if (qid === 'task_frequency_retry') return 'task_minutes';
  if (qid === 'task_minutes' && !session.draft.minutesConfident) return 'task_minutes_retry';
  if (qid === 'task_minutes_retry') return 'task_tools';
  const index = FLOW.indexOf(qid);
  if (index >= 0 && index < FLOW.length - 1) return FLOW[index + 1];
  if (qid === 'task_errors' || qid.startsWith('fu_')) {
    rebuildFollowups(session);
    if (session.followups.length && session.asked.length < MODEL.maxFollowups) {
      const id = session.followups[0];
      session.asked.push(id);
      session.followups = session.followups.filter((item) => item !== id);
      return `fu_${id}`;
    }
    commitDraft(session);
    return 'more_tasks';
  }
  if (qid === 'more_tasks' || qid === 'more_tasks_retry') {
    if (isYes(text)) {
      session.draft = emptyDraft();
      session.followups = [];
      session.asked = [];
      return 'task_name';
    }
    if (isNo(text) || qid === 'more_tasks_retry') {
      session.phase = 'done';
      return 'done';
    }
    return 'more_tasks_retry';
  }
  session.phase = 'done';
  return 'done';
}

export function answer(session, text, lang) {
  const value = String(text ?? '').trim().slice(0, 2000);
  const next = structuredClone(session);
  if (lang) next.lang = lang === 'en' ? 'en' : 'nb';
  if (!value) {
    next.notice = 'empty';
    return next;
  }
  if (next.cursor === 'done') return next;
  next.notice = '';
  const current = next.cursor;
  applyAnswer(next, current, value);
  next.history.push({ role: 'user', qid: current, text: value });
  next.cursor = pickNext(next, current, value);
  if (next.cursor === 'done') next.phase = 'done';
  next.history.push({ role: 'guide', qid: next.cursor, text: questionPrompt(next.cursor, next.lang) });
  return next;
}

export function liveSteps(person, draft) {
  const steps = (person?.steps || []).map((step) => ({ ...step, pending: false }));
  if (draft?.name && !draft.committed) {
    const minutes = (draft.minutes || 0) + (draft.chaseMinutes || 0);
    const perYear = draft.frequencyPerYear || 0;
    steps.push({
      id: 'draft',
      name: draft.name,
      tools: draft.tools || [],
      handoff: draft.handoff || '',
      hoursPerYear: perYear && minutes ? round1((perYear * minutes) / 60) : 0,
      flags: [],
      pending: true
    });
  }
  return steps;
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function assessEffort(step, kind) {
  const blob = blobOf(step);
  if (hasAny(blob, ['skjonn', 'vurdering', 'forhandling', 'judgment', 'negotiat'])) return 'high';
  if ((step.tools || []).length >= 4) return 'high';
  if (kind === 'bottleneck' || kind === 'rework' || kind === 'assembly') return 'medium';
  if (kind === 'workaround' && (step.tools || []).length <= 2) return 'low';
  if ((step.minutes || 0) <= 20 && step.workaround) return 'low';
  return 'medium';
}

function impactOf(hours) {
  if (hours >= 80) return 'high';
  if (hours >= 24) return 'medium';
  return 'low';
}

function candidateKinds(step) {
  const types = new Set(classifyStep(step).map((flag) => flag.type));
  const kinds = [];
  if (types.has('assembly')) kinds.push('assembly');
  else if (types.has('workaround') || step.workaround) kinds.push('workaround');
  else if (types.has('time_thief')) kinds.push('general');
  if (types.has('bottleneck') || step.wait) kinds.push('bottleneck');
  if (types.has('rework') || step.errorProne) kinds.push('rework');
  if (!kinds.length && (step.hoursPerYear || 0) >= 20) kinds.push('general');
  return [...new Set(kinds)];
}

function textPair(nb, en) {
  return { nb, en };
}

function candidateCopy(step, kind) {
  const name = step.name || 'Oppgaven';
  const tools = (step.tools || []).slice(0, 3).join(', ');
  if (kind === 'workaround') {
    return {
      title: textPair('Ta bort den manuelle flyttingen', 'Remove the manual transfer'),
      why: tools
        ? textPair(
          `«${name}» går via ${tools}. Selve kopieringen er det en flyt kan ta, hvis feltene er stabile.`,
          `“${name}” moves through ${tools}. The copying itself is what a flow can take, if the fields stay stable.`
        )
        : textPair(
          `«${name}» holdes sammen for hånd. Et kort skjema som skriver til fagsystemet er det første å prøve.`,
          `“${name}” is held together by hand. A short form that writes into the system of record is the first thing to try.`
        )
    };
  }
  if (kind === 'assembly') {
    return {
      title: textPair('Sett sammen rapporten automatisk', 'Assemble the report automatically'),
      why: textPair(
        `«${name}» samler tall før de presenteres. En fast mal som henter tallene selv fjerner limingen.`,
        `“${name}” gathers figures before they are presented. A fixed template that fetches them removes the pasting.`
      )
    };
  }
  if (kind === 'bottleneck') {
    const who = hasHandoff(step.handoff) ? step.handoff : '';
    return {
      title: textPair('Gjør venting og godkjenning synlig', 'Make waiting and approval visible'),
      why: who
        ? textPair(
          `«${name}» stopper hos ${who}. En kø med frist og automatisk purring tar jakten ut av innboksen.`,
          `“${name}” stops with ${who}. A queue with a deadline and an automatic nudge takes the chase out of the inbox.`
        )
        : textPair(
          `«${name}» har venting inne i steget. Synlig status gjør at arbeidet ikke blir liggende stille.`,
          `“${name}” has waiting inside the step. A visible status keeps the work from sitting still.`
        )
    };
  }
  if (kind === 'rework') {
    return {
      title: textPair('Stopp feilen før den må rettes', 'Catch the error before rework'),
      why: textPair(
        `«${name}» bærer feil eller dobbeltarbeid. Et felt med kontroll før innsending er billigere enn å rette etterpå.`,
        `“${name}” carries errors or double work. A check before submit is cheaper than fixing it afterwards.`
      )
    };
  }
  return {
    title: textPair('Automatiser det gjentakende steget', 'Automate the repeated step'),
    why: textPair(
      `«${name}» tar merkbart med tid og følger samme løype. Start med det som er likt hver gang.`,
      `“${name}” takes noticeable time and follows the same path. Start with the part that is the same every time.`
    )
  };
}

export function buildCandidates(step, personId) {
  return candidateKinds(step).map((kind) => {
    const effort = assessEffort(step, kind);
    const hoursSaved = round1((step.hoursPerYear || 0) * MODEL.capture[effort]);
    const copy = candidateCopy(step, kind);
    return {
      id: `${personId}:${step.id}:${kind}`,
      stepId: step.id,
      personId,
      stepName: step.name,
      kind,
      effort,
      impact: impactOf(hoursSaved),
      hoursSaved,
      capture: MODEL.capture[effort],
      defaultImplCost: MODEL.implCost[effort],
      score: hoursSaved / ({ low: 1, medium: 2.2, high: 4 }[effort]),
      title: copy.title,
      why: copy.why
    };
  });
}

export function rankCandidates(steps, personId) {
  const all = (steps || []).flatMap((step) => buildCandidates(step, personId));
  all.sort((a, b) => b.score - a.score || b.hoursSaved - a.hoursSaved);
  const chosen = [];
  const used = new Set();
  for (const candidate of all) {
    if (chosen.length >= 5) break;
    if (used.has(candidate.stepId)) continue;
    chosen.push({ ...candidate, recommended: true, overlaps: false });
    used.add(candidate.stepId);
  }
  if (chosen.length < 3) {
    for (const candidate of all) {
      if (chosen.length >= 3) break;
      if (chosen.some((item) => item.id === candidate.id)) continue;
      chosen.push({ ...candidate, recommended: false, overlaps: used.has(candidate.stepId) });
    }
  }
  return chosen.slice(0, 5);
}

export function computeRoi(hoursSaved, hourlyCost, implCost) {
  const annualSaving = (Number(hoursSaved) || 0) * (Number(hourlyCost) || 0);
  const cost = Number(implCost) || 0;
  return {
    annualSaving,
    roi: cost > 0 ? annualSaving / cost : null,
    breakevenMonths: annualSaving > 0 ? (cost / annualSaving) * 12 : null
  };
}

export function priceCandidates(candidates, hourlyCost, options = {}) {
  const overrides = options.implOverrides || {};
  const included = options.included || {};
  const items = (candidates || []).map((candidate) => {
    const raw = overrides[candidate.id];
    const implCost = raw == null || raw === '' || Number.isNaN(Number(raw))
      ? candidate.defaultImplCost
      : Math.max(0, Number(raw));
    const on = Object.prototype.hasOwnProperty.call(included, candidate.id)
      ? !!included[candidate.id]
      : !!candidate.recommended;
    return { ...candidate, implCost, included: on };
  });
  const checked = items.filter((item) => item.included);
  const best = new Map();
  for (const item of checked) {
    const prev = best.get(item.stepId) || 0;
    if (item.hoursSaved > prev) best.set(item.stepId, item.hoursSaved);
  }
  let hoursSaved = 0;
  for (const value of best.values()) hoursSaved += value;
  const implCost = checked.reduce((sum, item) => sum + item.implCost, 0);
  const roi = computeRoi(hoursSaved, hourlyCost, implCost);
  return {
    items,
    hoursSaved: round1(hoursSaved),
    implCost,
    overlap: checked.length > best.size,
    annualSaving: roi.annualSaving,
    roi: roi.roi,
    breakevenMonths: roi.breakevenMonths
  };
}

export function analyzePerson(person, options = {}) {
  const hourlyCost = options.hourlyCost ?? MODEL.defaultHourly;
  const steps = (person?.steps || []).map((step) => ({ ...step, flags: classifyStep(step) }));
  const ranked = rankCandidates(steps, person?.id || 'p');
  const priced = priceCandidates(ranked, hourlyCost, options);
  const hours = round1(steps.reduce((sum, step) => sum + (step.hoursPerYear || 0), 0));
  const counts = {};
  const flagList = [];
  for (const step of steps) {
    for (const flag of step.flags) {
      counts[flag.type] = (counts[flag.type] || 0) + 1;
      flagList.push({ ...flag, stepId: step.id, stepName: step.name, hours: step.hoursPerYear });
    }
  }
  return {
    steps,
    hours,
    laborCost: hours * hourlyCost,
    counts,
    flagList,
    assumed: steps.some((step) => step.frequencyAssumed || step.minutesAssumed),
    ...priced,
    candidates: priced.items
  };
}

export function analyzeOrg(people, options = {}) {
  const hourlyCost = options.hourlyCost ?? MODEL.defaultHourly;
  const rows = (people || []).map((person) => ({
    id: person.id,
    label: person.label || person.role || '',
    role: person.role || '',
    department: person.department || '',
    analysis: analyzePerson(person, options)
  }));
  const buckets = new Map();
  for (const row of rows) {
    const key = row.department || '';
    if (!buckets.has(key)) buckets.set(key, { name: key, people: 0, hours: 0, saved: 0, annualSaving: 0 });
    const bucket = buckets.get(key);
    bucket.people += 1;
    bucket.hours = round1(bucket.hours + row.analysis.hours);
    bucket.saved = round1(bucket.saved + row.analysis.hoursSaved);
    bucket.annualSaving += row.analysis.annualSaving;
  }
  const top = rows
    .flatMap((row) => row.analysis.candidates
      .filter((candidate) => candidate.recommended && candidate.included)
      .map((candidate) => ({ ...candidate, personLabel: row.label, department: row.department })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const hours = round1(rows.reduce((sum, row) => sum + row.analysis.hours, 0));
  const hoursSaved = round1(rows.reduce((sum, row) => sum + row.analysis.hoursSaved, 0));
  const implCost = rows.reduce((sum, row) => sum + row.analysis.implCost, 0);
  const roi = computeRoi(hoursSaved, hourlyCost, implCost);
  const counts = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.analysis.counts)) counts[key] = (counts[key] || 0) + value;
  }
  return {
    people: rows,
    departments: [...buckets.values()].sort((a, b) => b.hours - a.hours),
    hours,
    hoursSaved,
    implCost,
    annualSaving: roi.annualSaving,
    roi: roi.roi,
    breakevenMonths: roi.breakevenMonths,
    top,
    counts
  };
}

export function personFromSession(session) {
  const person = structuredClone(session.person);
  person.interview = {
    cursor: session.cursor,
    draft: session.draft,
    history: session.history,
    followups: session.followups,
    asked: session.asked,
    phase: session.phase,
    lang: session.lang,
    reasks: session.reasks,
    notice: session.notice || ''
  };
  return person;
}

export function sessionFromPerson(person, lang = 'nb') {
  const interview = person?.interview;
  if (!interview || !interview.cursor) return continueSession(person, lang);
  return {
    lang: lang || interview.lang || 'nb',
    phase: interview.phase || 'ask',
    cursor: interview.cursor,
    reasks: interview.reasks || {},
    person: {
      id: person.id,
      label: person.label || '',
      role: person.role || '',
      department: person.department || '',
      steps: structuredClone(person.steps || []),
      createdAt: person.createdAt
    },
    draft: interview.draft || emptyDraft(),
    followups: interview.followups || [],
    asked: interview.asked || [],
    history: interview.history || [],
    notice: ''
  };
}
