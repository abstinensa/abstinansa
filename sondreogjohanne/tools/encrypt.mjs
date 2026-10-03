#!/usr/bin/env node
// tools/encrypt.mjs — genererer ein kryptert payload for crypto-lock.js.
//
// Bruk:
//   node tools/encrypt.mjs <passord> <fil-med-html-innhald>
//
// Skriv ut eit JSON-objekt ({salt, iv, ciphertext}, alle base64) til
// stdout. Lim det inn som verdien for `payload` i sida si <script>-blokk.
//
// Same algoritme (PBKDF2-SHA256 + AES-GCM-256) og same iterasjonstal som
// crypto-lock.js brukar i nettlesaren, så ein kryptert payload herifrå
// dekrypterer korrekt i sida.

import { readFileSync } from 'node:fs';

const PBKDF2_ITERATIONS = 250_000;

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

async function main() {
  const [, , password, file] = process.argv;
  if (!password || !file) {
    console.error('Bruk: node tools/encrypt.mjs <passord> <fil-med-html-innhald>');
    process.exit(1);
  }
  const plaintext = readFileSync(file, 'utf8');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const payload = {
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(ciphertextBuf)),
  };
  console.log(JSON.stringify(payload, null, 2));
}

main();
