// crypto-lock.js — ekte passordvern for statiske sider (ikkje "security by
// obscurity"). Tidlegare brukte desse sidene `auth.js`: eit klartekst-passord
// sjekka i JS, med innhaldet allereie liggande usynt i HTML-en bak
// `display:none`. Alt det var synleg for alle via "Vis kjeldekode", heilt
// utan passord.
//
// Her er sjølve innhaldet kryptert (AES-GCM) i staden. Nøkkelen blir utleda
// av passordet via PBKDF2 med eit høgt iterasjonstal, så eit feil gjetta
// passord feiler AES-GCM sin autentiseringssjekk — det finst ingen
// klartekst-samanlikning å lese ut av koden, og innhaldet er faktisk
// ulesbart utan rett passord.
//
// Bruk `tools/encrypt.mjs` for å (re)generere ein kryptert payload når
// innhaldet eller passordet endrar seg — sjå README.md.

const PBKDF2_ITERATIONS = 250_000;

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function deriveKey(password, saltB64) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * Ber om passord i ei løkke, dekrypterer `payload` (generert av
 * tools/encrypt.mjs) og set resultatet som innerHTML på `container`.
 *
 * Dekryptert HTML blir cacha i sessionStorage under `key` slik at ein
 * ikkje treng skrive passordet på nytt ved reload i same fane-økt — same
 * tillitsnivå som den gamle løysinga hadde med sitt sessionStorage-flagg.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container   - elementet som skal fyllast med det dekrypterte innhaldet
 * @param {string} opts.key              - namn brukt til sessionStorage-cache og i prompten
 * @param {{salt:string, iv:string, ciphertext:string}} opts.payload - frå tools/encrypt.mjs
 * @param {string} [opts.redirectOnCancel]
 * @param {number} [opts.maxAttempts]
 * @param {(container: HTMLElement) => void} [opts.onUnlocked] - kalla etter vellukka opplåsing, før innhaldet visast
 * @returns {Promise<boolean>}
 */
export async function unlock({ container, key, payload, redirectOnCancel = '/', maxAttempts = 5, onUnlocked }) {
  const sessionFlag = `locked_${key}`;
  const cached = sessionStorage.getItem(sessionFlag);
  if (cached !== null) {
    container.innerHTML = cached;
    if (onUnlocked) onUnlocked(container);
    return true;
  }

  let attempts = 0;
  while (attempts < maxAttempts) {
    const pw = prompt(`Skriv passord for ${key}:`);
    if (pw === null) {
      document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;text-align:center"><p>Tilgang kreves.</p><a href="${redirectOnCancel}">Tilbake</a></div>`;
      return false;
    }
    try {
      const cryptoKey = await deriveKey(pw, payload.salt);
      const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
        cryptoKey,
        b64ToBytes(payload.ciphertext)
      );
      const html = new TextDecoder().decode(plainBuf);
      sessionStorage.setItem(sessionFlag, html);
      container.innerHTML = html;
      if (onUnlocked) onUnlocked(container);
      return true;
    } catch {
      // AES-GCM sin autentiseringstag feiler på feil passord — dette er
      // den einaste tilbakemeldinga eit feil gjetta passord gir.
      attempts++;
      alert('Feil passord, prøv igjen.');
    }
  }
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;text-align:center">For mange forsøk.</div>';
  return false;
}
