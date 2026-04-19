// auth.js — enkel passordbeskytting med sessionStorage
export function requirePassword({ key, correct, redirectOnCancel = '/' }) {
  const flag = `auth_${key}`;
  if (sessionStorage.getItem(flag) === '1') return true;
  let attempts = 0;
  while (attempts < 5) {
    const input = prompt(`Skriv passord for ${key}:`);
    if (input === null) {
      document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;text-align:center"><p>Tilgang kreves.</p><a href="${redirectOnCancel}">Tilbake</a></div>`;
      return false;
    }
    if (input === correct) {
      sessionStorage.setItem(flag, '1');
      return true;
    }
    attempts++;
    alert('Feil passord, prøv igjen.');
  }
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;text-align:center">For mange forsøk.</div>';
  return false;
}
