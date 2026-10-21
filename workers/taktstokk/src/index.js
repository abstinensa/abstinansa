/**
 * Optional AI mode for Taktstokk.
 * Not deployed. No API key is stored in this file.
 *
 *   wrangler secret put AI_API_KEY
 *   wrangler secret put ALLOWED_ORIGIN   # or set it under [vars]
 *
 * The browser sends { locale, transcript }. This worker returns
 * { utterance, done }. The key stays in the Worker secret.
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '';
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
      vary: 'Origin'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: origin ? headers : { vary: 'Origin' } });
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return Response.json({
        ok: true,
        service: 'taktstokk',
        configured: Boolean(env.AI_API_KEY && origin)
      }, { headers: origin ? headers : { 'content-type': 'application/json' } });
    }

    if (request.method !== 'POST' || url.pathname !== '/interview') {
      return Response.json({ error: 'not_found' }, { status: 404, headers });
    }
    if (!origin) {
      return Response.json({ error: 'allowed_origin_not_set' }, { status: 503 });
    }
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== origin) {
      return Response.json({ error: 'origin_rejected' }, { status: 403, headers });
    }
    if (!env.AI_API_KEY) {
      return Response.json({ error: 'missing_secret' }, { status: 503, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400, headers });
    }

    const transcript = Array.isArray(body.transcript) ? body.transcript.slice(-30) : [];
    const locale = body.locale === 'en' ? 'en' : 'nb';
    const base = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = env.AI_MODEL || 'gpt-4.1-mini';
    const system = locale === 'en'
      ? 'You are Maestro, interviewing one person about how their work actually runs. Ask one short question at a time about role, recurring tasks, frequency, active minutes, tools, hand-offs, manual copy-paste or spreadsheets, waiting and errors. Return JSON only: {"utterance":"...","done":false}. Never invent numbers the person did not say.'
      : 'Du er Maestro og kartlegger hvordan arbeidet faktisk gjøres. Still ett kort spørsmål om gangen om rolle, gjentakende oppgaver, frekvens, aktive minutter, verktøy, overlevering, manuell kopiering eller regneark, venting og feil. Svar kun med JSON: {"utterance":"...","done":false}. Ikke finn på tall personen ikke har sagt.';

    let upstream;
    try {
      upstream = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.AI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            ...transcript.map((turn) => ({
              role: turn.role === 'guide' ? 'assistant' : 'user',
              content: String(turn.text || '').slice(0, 2000)
            }))
          ]
        })
      });
    } catch {
      return Response.json({ error: 'upstream_unreachable' }, { status: 502, headers });
    }
    if (!upstream.ok) {
      return Response.json({ error: 'upstream_failed' }, { status: 502, headers });
    }

    const data = await upstream.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    return Response.json({
      utterance: String(parsed.utterance || '').slice(0, 600),
      done: Boolean(parsed.done)
    }, { headers });
  }
};
