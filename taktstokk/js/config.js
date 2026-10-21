/**
 * AI-modus for Taktstokk.
 *
 * Disabled by default. The browser never contains an API key.
 * The interview runs entirely on the local rule engine in engine.js.
 *
 * To point at a future server (for example the Cloudflare Worker in
 * /workers/taktstokk, where the key lives as a secret):
 *   1. Deploy that worker yourself. Do not commit the key.
 *   2. Set enabled to true.
 *   3. Set endpoint to the worker's /interview URL.
 *
 * If the request fails, the page keeps the local question.
 * Enabling this sends the transcript to that endpoint. The privacy
 * note on the page changes when enabled is true.
 */
export const AI_CONFIG = {
  enabled: false,
  endpoint: ''
};
