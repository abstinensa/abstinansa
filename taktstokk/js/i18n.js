const STR = {
  skip: { nb: 'Hopp til innhold', en: 'Skip to content' },
  menu: { nb: 'Meny', en: 'Menu' },
  navHome: { nb: 'Oversikt', en: 'Overview' },
  navStudio: { nb: 'Kartlegging', en: 'Mapping' },
  navAnalysis: { nb: 'Analyse', en: 'Analysis' },
  navOrg: { nb: 'Avdeling', en: 'Department' },
  navReport: { nb: 'Rapport', en: 'Report' },
  langGroup: { nb: 'Språk', en: 'Language' },
  themeDark: { nb: 'Bytt til mørkt tema', en: 'Switch to dark theme' },
  themeLight: { nb: 'Bytt til lyst tema', en: 'Switch to light theme' },
  ctaStart: { nb: 'Start kartlegging', en: 'Start mapping' },
  ctaContinue: { nb: 'Fortsett kartlegging', en: 'Continue mapping' },
  ctaNew: { nb: 'Ny kartlegging', en: 'New mapping' },
  titleHome: { nb: 'Taktstokk — orkestrer arbeidet', en: 'Taktstokk — orchestrate the work' },
  titleStudio: { nb: 'Kartlegging — Taktstokk', en: 'Mapping — Taktstokk' },
  titleAnalysis: { nb: 'Analyse — Taktstokk', en: 'Analysis — Taktstokk' },
  titleOrg: { nb: 'Avdeling — Taktstokk', en: 'Department — Taktstokk' },
  titleReport: { nb: 'Rapport — Taktstokk', en: 'Report — Taktstokk' },
  kicker: { nb: 'Kart · tempo · estimat', en: 'Map · tempo · estimate' },
  heroTitle: { nb: 'Orkestrer<br><em>arbeidet.</em>', en: 'Orchestrate<br><em>the work.</em>' },
  heroLead: {
    nb: 'Taktstokk følger en samtale gjennom hvordan en avdeling faktisk jobber. Maestro spør ett spørsmål om gangen. Kartet tegnes mens dere snakker, og estimatet viser hvor timene, omveiene og ventingen sitter.',
    en: 'Taktstokk follows a conversation through how a department actually works. Maestro asks one question at a time. The map is drawn while you speak, and the estimate shows where the hours, workarounds and waiting sit.'
  },
  heroNote: { nb: 'Du styrer tempoet. Ett steg om gangen.', en: 'You set the tempo. One step at a time.' },
  howLink: { nb: 'Slik er løpet', en: 'How it runs' },
  factDays: { nb: '230 forekomster', en: '230 occurrences' },
  factDaysBody: { nb: 'Slik regnes «daglig» om til et år. Ukentlig er 46.', en: 'How “daily” becomes a year. Weekly is 46.' },
  factRate: { nb: '900 kr i timen', en: 'NOK 900 an hour' },
  factRateBody: { nb: 'Standard timepris. Du kan endre den i analysen.', en: 'Default hourly rate. You can change it in the analysis.' },
  factKind: { nb: 'Estimat', en: 'Estimate' },
  factKindBody: { nb: 'Ikke et tilbud. Tallene er til å justere.', en: 'Not a quote. The figures are there to be adjusted.' },
  findKicker: { nb: 'Mønstre', en: 'Patterns' },
  findTitle: { nb: 'Det samtalen leter etter', en: 'What the conversation looks for' },
  findLead: {
    nb: 'Tre mønstre går igjen når arbeid beskrives slik det gjøres, ikke slik det står i en rutine.',
    en: 'Three patterns show up when work is described the way it is done, not the way a routine reads.'
  },
  find1: { nb: 'Tidstyv', en: 'Time thief' },
  find1Body: {
    nb: 'Minutter som kommer tilbake hver uke. Lav friksjon, høy frekvens, og sjelden den oppgaven noen skrev en stillingsbeskrivelse for.',
    en: 'Minutes that return every week. Low friction, high frequency, and rarely the task anyone wrote into a job description.'
  },
  find2: { nb: 'Omvei', en: 'Workaround' },
  find2Body: {
    nb: 'Regneark, e-post og kopiering som holder sammen det systemene ikke snakker om. Omveien blir etter hvert den egentlige prosessen.',
    en: 'Spreadsheets, email and copying that hold together what the systems do not share. The workaround becomes the real process.'
  },
  find3: { nb: 'Flaskehals', en: 'Bottleneck' },
  find3Body: {
    nb: 'Godkjenning, kø og venting. Arbeidet er ferdig fra din side, men står stille hos noen andre.',
    en: 'Approval, queues and waiting. Your part is done, but the work stands still with someone else.'
  },
  methodKicker: { nb: 'Løpet', en: 'The run' },
  methodTitle: { nb: 'Tre takter', en: 'Three beats' },
  method1: { nb: 'Samtale', en: 'Conversation' },
  method1Body: {
    nb: 'Stemme eller tekst. Ett spørsmål. Oppfølging når svaret nevner regneark, e-post, kopiering, venting eller feil.',
    en: 'Voice or text. One question. A follow-up when the answer mentions a spreadsheet, email, copying, waiting or errors.'
  },
  method2: { nb: 'Kart', en: 'Map' },
  method2Body: {
    nb: 'Hvert steg blir en node med verktøy og overlevering. Det bygges mens samtalen pågår.',
    en: 'Each step becomes a node with tools and a hand-off. It is built while the conversation is going.'
  },
  method3: { nb: 'Estimat', en: 'Estimate' },
  method3Body: {
    nb: 'Timer i året, kostnad, innsats mot effekt, og hvor mange måneder et tiltak trenger for å gå i null.',
    en: 'Hours a year, cost, effort against impact, and how many months a change needs before it breaks even.'
  },
  privacyTitle: { nb: 'Kartleggingen blir her', en: 'The mapping stays here' },
  privacyBody: {
    nb: 'Svar, kart og tall lagres kun i localStorage på denne enheten. Taktstokk sender dem ikke til en server. Skriver du, forlater ikke teksten nettleseren. Bruker du mikrofon, er det nettleserens egen talegjenkjenning som tar lyden — den kan gå til nettleserens leverandør, ikke til dette nettstedet.',
    en: 'Answers, the map and the figures are stored only in localStorage on this device. Taktstokk does not send them to a server. Text you type does not leave the browser. If you use the microphone, the browser’s own speech recognition takes the audio — that may go to the browser vendor, not to this site.'
  },
  privacyAi: {
    nb: 'AI-modus er på. Svarene sendes til endepunktet som er satt i konfigurasjonen, så en server kan foreslå neste spørsmål. Nøkkelen ligger ikke i siden.',
    en: 'AI mode is on. Answers are sent to the endpoint set in the configuration, so a server can suggest the next question. The key is not in the page.'
  },
  aiSummary: {
    nb: 'AI-modus er av. Neste spørsmål velges med regler i nettleseren. Et endepunkt kan kobles på senere. Nøkkelen skal ligge som hemmelighet på serveren, aldri i siden.',
    en: 'AI mode is off. The next question is chosen by rules in the browser. An endpoint can be connected later. The key belongs as a secret on the server, never in the page.'
  },
  aiSummaryOn: {
    nb: 'AI-modus er på og peker på et endepunkt. Feiler kallet, brukes reglene lokalt.',
    en: 'AI mode is on and points at an endpoint. If the call fails, the local rules are used.'
  },
  homeLink: { nb: 'Til forsiden', en: 'Front page' },
  wipe: { nb: 'Slett alle data', en: 'Delete all data' },
  wipeConfirm: { nb: 'Bekreft sletting', en: 'Confirm delete' },
  footerNote: { nb: 'Taktstokk · abstinensa.no', en: 'Taktstokk · abstinensa.no' },
  maestro: { nb: 'Maestro', en: 'Maestro' },
  you: { nb: 'Du', en: 'You' },
  statusReady: { nb: 'Klar', en: 'Ready' },
  statusListen: { nb: 'Lytter', en: 'Listening' },
  statusSpeak: { nb: 'Leser opp', en: 'Speaking' },
  progressIntro: { nb: 'Innledning', en: 'Opening' },
  progressDone: { nb: 'Ferdig kartlagt', en: 'Mapping complete' },
  progressTask: { nb: 'Oppgave {n}', en: 'Task {n}' },
  send: { nb: 'Send', en: 'Send' },
  mic: { nb: 'Snakk', en: 'Speak' },
  hear: { nb: 'Hør spørsmålet', en: 'Hear the question' },
  voiceToggleOn: { nb: 'Opplesing på', en: 'Read-aloud on' },
  voiceToggleOff: { nb: 'Opplesing av', en: 'Read-aloud off' },
  voiceOn: { nb: 'Du kan snakke eller skrive. Maestro kan lese spørsmålet høyt.', en: 'You can speak or type. Maestro can read the question aloud.' },
  voiceOff: { nb: 'Opplesing er av. Du kan fortsatt snakke inn svaret, eller skrive.', en: 'Read-aloud is off. You can still dictate the answer, or type.' },
  voiceUnsupported: { nb: 'Stemme støttes ikke i denne nettleseren. Skriv svaret under.', en: 'Voice is not supported in this browser. Type the answer below.' },
  voiceDenied: { nb: 'Mikrofonen er ikke tillatt. Skriv svaret i stedet.', en: 'The microphone is not allowed. Type the answer instead.' },
  voiceSilent: { nb: 'Ingen tale ble fanget. Prøv igjen, eller skriv.', en: 'No speech was caught. Try again, or type.' },
  voiceNoMic: { nb: 'Fant ingen mikrofon. Skriv svaret under.', en: 'No microphone was found. Type the answer below.' },
  voiceNetwork: { nb: 'Talegjenkjenningen svarte ikke. Skriv svaret under.', en: 'Speech recognition did not respond. Type the answer below.' },
  voiceError: { nb: 'Stemmen feilet. Skriv svaret under.', en: 'Voice failed. Type the answer below.' },
  emptyAnswer: { nb: 'Skriv eller si et svar først.', en: 'Type or say an answer first.' },
  localEngine: { nb: 'Lokal regelmotor', en: 'Local rule engine' },
  aiEngine: { nb: 'AI-modus', en: 'AI mode' },
  mapTitle: { nb: 'Arbeidskart', en: 'Workflow map' },
  mapEmpty: { nb: 'Kartet tegnes mens dere snakker. Første steg kommer når oppgaven har et navn.', en: 'The map is drawn as you talk. The first step appears when the task has a name.' },
  pending: { nb: 'Pågår', en: 'In progress' },
  handoff: { nb: 'Videre til', en: 'Hand off to' },
  perYear: { nb: 't/år', en: 'h/year' },
  noTools: { nb: 'Verktøy ikke nevnt ennå', en: 'No tools mentioned yet' },
  seeAnalysis: { nb: 'Se analysen', en: 'See the analysis' },
  addTask: { nb: 'Legg til oppgave', en: 'Add a task' },
  addPerson: { nb: 'Ny person', en: 'New person' },
  backStudio: { nb: 'Tilbake til samtalen', en: 'Back to the conversation' },
  estimate: { nb: 'Estimat', en: 'Estimate' },
  hoursMapped: { nb: 'Timer kartlagt / år', en: 'Hours mapped / year' },
  hoursSaved: { nb: 'Timer som kan tas ut / år', en: 'Hours that could be won back / year' },
  moneySaved: { nb: 'Kostnad spart / år', en: 'Cost saved / year' },
  implCost: { nb: 'Implementering', en: 'Implementation' },
  roi: { nb: 'ROI', en: 'ROI' },
  breakeven: { nb: 'I null etter', en: 'Break-even' },
  months: { nb: 'mnd', en: 'months' },
  notComputed: { nb: 'Ikke beregnet', en: 'Not computed' },
  hourly: { nb: 'Timepris', en: 'Hourly rate' },
  hourlyHint: { nb: 'Kan endres. Standard er 900 kroner.', en: 'Editable. The default is 900 kroner.' },
  person: { nb: 'Person', en: 'Person' },
  flagsTitle: { nb: 'Funn i stegene', en: 'Findings in the steps' },
  noFlags: { nb: 'Ingen tydelige tidstyver, omveier eller flaskehalser i det som er kartlagt.', en: 'No clear time thieves, workarounds or bottlenecks in what is mapped.' },
  candidatesTitle: { nb: 'Automatisering, rangert', en: 'Automation, ranked' },
  noCandidates: { nb: 'Kartlegg minst én oppgave for å få kandidater.', en: 'Map at least one task to get candidates.' },
  effort: { nb: 'Innsats', en: 'Effort' },
  impact: { nb: 'Effekt', en: 'Impact' },
  low: { nb: 'Lav', en: 'Low' },
  medium: { nb: 'Middels', en: 'Medium' },
  high: { nb: 'Høy', en: 'High' },
  include: { nb: 'Ta med i totalen', en: 'Include in the total' },
  implField: { nb: 'Implementeringskost, kroner', en: 'Implementation cost, kroner' },
  overlaps: { nb: 'Overlapper en annen kandidat på samme steg', en: 'Overlaps another candidate on the same step' },
  overlapNote: { nb: 'Estimat: timer telles én gang per steg, selv om flere kandidater er huket av. Kostnadene summeres.', en: 'Estimate: hours are counted once per step, even if several candidates are ticked. Costs are summed.' },
  assumedNote: { nb: 'Minst ett tall er antatt, fordi et svar ikke kunne tolkes. Se stegene under.', en: 'At least one figure was assumed, because an answer could not be parsed. See the steps below.' },
  stepsTitle: { nb: 'Steg', en: 'Steps' },
  colTask: { nb: 'Oppgave', en: 'Task' },
  colRhythm: { nb: 'Rytme', en: 'Rhythm' },
  colMinutes: { nb: 'Minutter', en: 'Minutes' },
  colHours: { nb: 'Timer / år', en: 'Hours / year' },
  colTools: { nb: 'Verktøy', en: 'Tools' },
  timesYear: { nb: 'ganger i året', en: 'times a year' },
  freqDaily: { nb: 'daglig', en: 'daily' },
  freqWeekly: { nb: 'ukentlig', en: 'weekly' },
  freqMonthly: { nb: 'månedlig', en: 'monthly' },
  freqQuarterly: { nb: 'kvartalsvis', en: 'quarterly' },
  freqYearly: { nb: 'årlig', en: 'yearly' },
  freqBiweekly: { nb: 'annenhver uke', en: 'every other week' },
  freqAssumed: { nb: 'antatt månedlig', en: 'assumed monthly' },
  assumedShort: { nb: 'antatt', en: 'assumed' },
  emptyAnalysis: { nb: 'Ingen oppgaver er kartlagt ennå.', en: 'No tasks are mapped yet.' },
  assumptions: {
    nb: 'Lav innsats regnes som 75 % av timene, middels som 55 %, høy som 30 %. Standard kostnad er 35 000, 90 000 og 220 000 kroner. «Daglig» er 230 ganger i året, «ukentlig» er 46. Dette er estimat.',
    en: 'Low effort counts as 75% of the hours, medium as 55%, high as 30%. Default cost is 35,000, 90,000 and 220,000 kroner. “Daily” is 230 times a year, “weekly” is 46. These are estimates.'
  },
  orgLead: { nb: 'Legg til flere personer eller avdelinger. Tallene under er summen av det som er kartlagt på denne enheten.', en: 'Add several people or departments. The figures below are the sum of what is mapped on this device.' },
  label: { nb: 'Navn eller etikett', en: 'Name or label' },
  labelPh: { nb: 'For eksempel økonomi 1', en: 'For example finance 1' },
  role: { nb: 'Rolle', en: 'Role' },
  rolePh: { nb: 'Saksbehandler', en: 'Caseworker' },
  dept: { nb: 'Avdeling', en: 'Department' },
  deptPh: { nb: 'Økonomi', en: 'Finance' },
  startPerson: { nb: 'Start kartlegging', en: 'Start mapping' },
  peopleTitle: { nb: 'Personer', en: 'People' },
  noPeople: { nb: 'Ingen er lagt inn ennå.', en: 'No one is added yet.' },
  remove: { nb: 'Fjern', en: 'Remove' },
  open: { nb: 'Åpne', en: 'Open' },
  deptTitle: { nb: 'Per avdeling', en: 'By department' },
  noDept: { nb: 'Uten avdeling', en: 'No department' },
  noLabel: { nb: 'Uten etikett', en: 'No label' },
  orgTop: { nb: 'Høyest rangert på tvers', en: 'Highest ranked across the group' },
  countPeople: { nb: 'personer', en: 'people' },
  print: { nb: 'Skriv ut / PDF', en: 'Print / PDF' },
  json: { nb: 'Last ned JSON', en: 'Download JSON' },
  reportLead: { nb: 'Utskriftsvennlig sammendrag. Alle tall er estimat, regnet lokalt i nettleseren.', en: 'A print-friendly summary. Every figure is an estimate, calculated locally in the browser.' },
  reportDate: { nb: 'Dato', en: 'Date' },
  reportPrivacy: { nb: 'Produsert lokalt. Taktstokk har ikke sendt innholdet til en server.', en: 'Produced locally. Taktstokk has not sent the contents to a server.' },
  noneYet: { nb: 'Ingenting å vise ennå.', en: 'Nothing to show yet.' },
  labor: { nb: 'Timekost av kartlagt tid', en: 'Labour cost of mapped time' },
  capture: { nb: 'Andel av timene i estimatet', en: 'Share of hours in the estimate' },
  flag_time_thief: { nb: 'Tidstyv', en: 'Time thief' },
  flag_workaround: { nb: 'Omvei', en: 'Workaround' },
  flag_bottleneck: { nb: 'Flaskehals', en: 'Bottleneck' },
  flag_rework: { nb: 'Omarbeid', en: 'Rework' },
  flag_assembly: { nb: 'Sammenstilling', en: 'Assembly' }
};

export function t(key, lang) {
  const pack = STR[key];
  if (!pack) return key;
  return pack[lang === 'en' ? 'en' : 'nb'] ?? pack.nb;
}

export function translateDom(lang) {
  const active = lang === 'en' ? 'en' : 'nb';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = STR[el.dataset.i18n];
    if (value) el.textContent = value[active] ?? value.nb;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const value = STR[el.dataset.i18nHtml];
    if (value) el.innerHTML = value[active] ?? value.nb;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const value = STR[el.dataset.i18nAria];
    if (value) el.setAttribute('aria-label', value[active] ?? value.nb);
  });
}
