# Taktstokk AI-modus worker

Optional Cloudflare Worker for Taktstokk. It is not deployed, and this folder contains no API key.

The page at `/taktstokk/` runs a local rule engine. AI mode is off. To connect it later, deploy this worker yourself and edit `taktstokk/js/config.js`:

```js
export const AI_CONFIG = {
  enabled: true,
  endpoint: "https://<your-worker>/interview"
};
```

The browser posts `{ locale, transcript }` and expects `{ utterance, done }`. The model key stays in a Worker secret.

## Configure

```bash
cd workers/taktstokk
npx wrangler secret put AI_API_KEY
```

Set `ALLOWED_ORIGIN` to the site origin, for example `https://abstinensa.no`, under `[vars]` in `wrangler.toml` or as its own secret. Requests are refused until that origin is set. The worker also refuses a browser `Origin` that does not match.

`AI_BASE_URL` defaults to `https://api.openai.com/v1`. `AI_MODEL` defaults to `gpt-4.1-mini`. Change either in `wrangler.toml` if you use another OpenAI-compatible endpoint.

Do not commit `.dev.vars`, `wrangler.toml` secrets, or a key inside the static site.

## Local check

```bash
npx wrangler dev
```

`GET /health` reports whether a key and an allowed origin are present. It does not print the key.

## What it does not do

The worker does not replace the local estimates. If the call fails, the page keeps the rule-based question. Deploy and DNS are left to whoever turns the mode on.
