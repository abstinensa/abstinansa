import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeOrg,
  analyzePerson,
  answer,
  computeRoi,
  createSession,
  detectWorkaround,
  hasKey,
  liveSteps,
  parseChaseMinutes,
  parseFrequency,
  parseMinutes,
  parseRole,
  parseTools
} from '../js/engine.js';

test('parses Norwegian and English rhythms', () => {
  assert.equal(parseFrequency('daglig').perYear, 230);
  assert.equal(parseFrequency('ukentlig').perYear, 46);
  assert.equal(parseFrequency('månedlig').code, 'monthly');
  assert.equal(parseFrequency('3 ganger i uken').perYear, 138);
  assert.equal(parseFrequency('tre ganger i måneden').perYear, 36);
  assert.equal(parseFrequency('en gang i året').perYear, 1);
  assert.equal(parseFrequency('weekly').perYear, 46);
  assert.equal(parseFrequency('2 times a month').perYear, 24);
  assert.equal(parseFrequency('kvartalsvis').perYear, 4);
  assert.equal(parseFrequency('ved behov').confident, false);
});

test('parses minutes, including Norwegian phrases', () => {
  assert.equal(parseMinutes('45 minutter').minutes, 45);
  assert.equal(parseMinutes('en time').minutes, 60);
  assert.equal(parseMinutes('to timer').minutes, 120);
  assert.equal(parseMinutes('1,5 timer').minutes, 90);
  assert.equal(parseMinutes('halvtime').minutes, 30);
  assert.equal(parseMinutes('et kvarter').minutes, 15);
  assert.equal(parseMinutes('20').minutes, 20);
  assert.equal(parseMinutes('omtrent 25').minutes, 25);
  assert.equal(parseMinutes('ofte').confident, false);
  assert.equal(parseChaseMinutes('Ja, venter to dager og bruker 15 minutter på å purre'), 15);
  assert.equal(parseChaseMinutes('venter to dager'), 0);
  assert.equal(parseChaseMinutes('Nei'), 0);
});

test('splits role and department without treating økonomi as a queue', () => {
  const parsed = parseRole('Saksbehandler i økonomi');
  assert.equal(parsed.role, 'Saksbehandler');
  assert.equal(parsed.department, 'økonomi');
  assert.equal(parseRole('controller, finance').department, 'finance');
  assert.equal(hasKey('saksbehandler i økonomi', 'venter'), false);
  assert.equal(hasKey('vi venter på godkjenning', 'godkjenning'), true);
  assert.deepEqual(parseTools('Excel, e-post og Visma'), ['Excel', 'e-post', 'Visma']);
});

test('workaround detection listens for excel even after a no', () => {
  assert.equal(detectWorkaround('Nei'), false);
  assert.equal(detectWorkaround('Nei, men vi bruker excel'), true);
  assert.equal(detectWorkaround('Ja, jeg kopierer'), true);
});

test('a full interview adapts follow-ups and estimates hours', () => {
  const lines = [
    'Saksbehandler i økonomi',
    'Månedlig avstemming av fakturaer',
    'En e-post fra leverandør med pdf',
    'Ukentlig',
    '45 minutter',
    'Excel, e-post og Visma',
    'Økonomisjefen godkjenner',
    'Ja, jeg kopierer tall fra pdf til excel',
    'Ja, venter på godkjenning og bruker 15 minutter på å purre',
    'Ja, feil kontonummer må rettes'
  ];
  let session = createSession();
  for (const line of lines) session = answer(session, line);
  assert.equal(session.cursor, 'fu_copy_path');
  session = answer(session, 'Fra PDF til Excel');
  assert.equal(session.cursor, 'fu_excel_contents');
  session = answer(session, 'Status og beløp som ikke finnes i Visma');
  assert.equal(session.cursor, 'fu_pdf_rekey');
  session = answer(session, 'Ja, tallene tastes inn på nytt');
  assert.equal(session.cursor, 'more_tasks');
  assert.equal(session.person.steps.length, 1);
  session = answer(session, 'Nei, vis analysen');
  assert.equal(session.cursor, 'done');

  const step = session.person.steps[0];
  assert.equal(step.hoursPerYear, 46);
  assert.equal(step.chaseMinutes, 15);
  assert.equal(step.department || session.person.department, 'økonomi');
  assert.ok(step.flags.some((flag) => flag.type === 'time_thief'));
  assert.ok(step.flags.some((flag) => flag.type === 'workaround'));
  assert.ok(step.flags.some((flag) => flag.type === 'bottleneck'));
  assert.ok(step.flags.some((flag) => flag.type === 'rework'));

  const analysis = analyzePerson(session.person, { hourlyCost: 900 });
  assert.ok(analysis.candidates.length >= 3);
  assert.ok(analysis.candidates.length <= 5);
  const recommended = analysis.candidates.filter((item) => item.recommended);
  assert.equal(recommended.length, 1);
  assert.equal(analysis.hoursSaved, recommended[0].hoursSaved);
  assert.equal(analysis.overlap, false);
  assert.ok(analysis.roi > 0);
  assert.ok(analysis.breakevenMonths > 0);
  assert.match(analysis.candidates[0].why.nb, /avstemming/i);
});

test('unclear rhythm is asked once, then assumed monthly', () => {
  let session = createSession({}, 'nb');
  session = answer(session, 'Rådgiver i innkjøp');
  session = answer(session, 'Innkjøpsordre');
  session = answer(session, 'En frist');
  session = answer(session, 'ved behov');
  assert.equal(session.cursor, 'task_frequency_retry');
  session = answer(session, 'usikkert');
  assert.equal(session.cursor, 'task_minutes');
  assert.equal(session.draft.frequencyAssumed, true);
  assert.equal(session.draft.frequencyPerYear, 12);
});

test('empty answers do not advance the interview', () => {
  const session = createSession();
  const next = answer(session, '   ');
  assert.equal(next.cursor, 'role');
  assert.equal(next.notice, 'empty');
  assert.equal(next.history.length, session.history.length);
});

test('the map grows from the draft before the task is committed', () => {
  let session = createSession();
  session = answer(session, 'Controller i finans');
  session = answer(session, 'Lukke måneden');
  const steps = liveSteps(session.person, session.draft);
  assert.equal(steps.at(-1).pending, true);
  assert.equal(steps.at(-1).name, 'Lukke måneden');
});

test('ROI and breakeven are explicit', () => {
  const roi = computeRoi(10, 900, 35000);
  assert.equal(roi.annualSaving, 9000);
  assert.equal(roi.roi, 9000 / 35000);
  assert.equal(roi.breakevenMonths, (35000 / 9000) * 12);
  assert.equal(computeRoi(0, 900, 35000).breakevenMonths, null);
  assert.equal(computeRoi(10, 900, 0).roi, null);
});

test('several people aggregate by department without double-counting a step', () => {
  const script = (role, task) => {
    let session = createSession();
    for (const line of [role, task, 'E-post', 'Ukentlig', '30', 'Excel', 'Leder', 'Ja, kopierer', 'Nei', 'Nei']) {
      session = answer(session, line);
    }
    let guard = 0;
    while (session.cursor !== 'done' && guard < 8) {
      guard += 1;
      session = answer(session, session.cursor.startsWith('more_') ? 'Nei, vis analysen' : 'Kort notat');
    }
    assert.equal(session.cursor, 'done');
    return session.person;
  };
  const a = script('Saksbehandler i økonomi', 'Fakturamatch');
  const b = script('Rådgiver i økonomi', 'Reiseregning');
  const c = script('Recruiter in HR', 'Onboarding checklist');
  const org = analyzeOrg([a, b, c], { hourlyCost: 900 });
  assert.equal(org.people.length, 3);
  assert.equal(org.departments.filter((dept) => dept.name === 'økonomi')[0].people, 2);
  assert.equal(org.hours, round1(a.steps[0].hoursPerYear + b.steps[0].hoursPerYear + c.steps[0].hoursPerYear));
  assert.ok(org.top.length >= 2);
  assert.ok(org.top.length <= 5);
});

test('english answers follow the same rules', () => {
  let session = createSession({}, 'en');
  assert.match(session.history.at(-1).text, /role/i);
  session = answer(session, 'Caseworker in finance', 'en');
  session = answer(session, 'Invoice check', 'en');
  session = answer(session, 'An email with a pdf', 'en');
  session = answer(session, 'Weekly', 'en');
  session = answer(session, 'half an hour', 'en');
  assert.equal(session.draft.minutes, 30);
  assert.equal(session.draft.frequencyPerYear, 46);
});

function round1(n) {
  return Math.round(n * 10) / 10;
}
