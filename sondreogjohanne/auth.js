// Client-side gating is only obscurity: this file is public.
// The gate compares SHA-256(SALT + ":" + the text entered in the prompt).
const SALT = 'abstinensa-sondreogjohanne-v1';

async function sha256Hex(text) {
  const data = new TextEncoder().encode(SALT + ':' + text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function requirePassword({ key, hash, redirectOnCancel = '/' }) {
  const flag = `auth_${key}`;
  if (sessionStorage.getItem(flag) === '1') return true;
  let attempts = 0;
  while (attempts < 5) {
    const input = prompt(`Skriv passord for ${key}:`);
    if (input === null) {
      document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;text-align:center"><p>Tilgang kreves.</p><a href="${redirectOnCancel}">Tilbake</a></div>`;
      return false;
    }
    if (sameHash(await sha256Hex(input), hash)) {
      sessionStorage.setItem(flag, '1');
      return true;
    }
    attempts++;
    alert('Feil passord, prøv igjen.');
  }
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;text-align:center">For mange forsøk.</div>';
  return false;
}
