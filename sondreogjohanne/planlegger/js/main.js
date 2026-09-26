import { unlock } from '../../crypto-lock.js';

// Generert av `node tools/encrypt.mjs iloveyou <fil>` — sjå README.md for
// korleis regenerere denne når fane-skjelettet eller passordet endrar seg.
const payload = {
  "salt": "g249bmCluZphMfaQ0qUYAQ==",
  "iv": "K8H7oeRWZ4Vj746T",
  "ciphertext": "sTAp9vxZgfYFKGW6poVR245efRbDKfswjtuR9GZ6AvE5KJWYprxEulvaomLs/EUlgs0KSFbYCUhsNR1TrLqx2O8d4gkCMz+XA6PkQegxOYUZzRiHbNCWML6ve+yvncPOw+V6Mb8YFeL25hJ+2rTFTR8qonfD3POAkKpU0QG/lWK+nvyNBR/t0iUo7dPOkvdbJsIcSVpgFqyMQN90aBF4JcpoGMY7aO6jKpz2qHhRqDUib9zoKfXZQSKOYoE/hH7W1PAo80DSjRy2Koctcm+w3yY6KESrUHA3JXL3tNe1FioHhRaZJ67JhltQbzUgPR9WdUc2ll+4u415CkBgRXrXtBTuScKgRn/W09LV+ThhDfKNZKl5DJ2FjTcugXjYKnr1VE/38f55jtXPdGGJYDk/rgGfTzaGaFGctqvAnD3uLqS/OsbOy6mlQJLWB3KlC6NM+RmSptmnjHUlpgyrid/06Ur/3QOfNECFcG3yPmia4p9qmti7uOLNv2b6Ip0huz1NYqGXgvZ/yoNZmZ2aIKUrol5a4M66Qrwp5ADXrEkSKO6o8i8ZWoV92eORmVFTPmBx/UKKfkCQmBETOMa7iu9O0QiDXIGkJPcl9NnFKxQchRwjfKnW9cOUQQVK+wfQjRHAzRLGnnDlcKVYX1uHBuC9VLzKjJAwaA4B0Zr+GSviVxPJSLaCpAglsC0fxzvKpKue+PWJwhp/HUTEbdzFi4MpAazqN68oqax3msbX/CHyWa0MHoZ2xG7SKvdlyx4dfthljOaHCp3KzbOkKYqvbzBKH5fJhTuoPFmVslRMKw56cPFh2wyVdSLvPI9hERwu4A1rCU8vRcnWqmy9tD6QR7IViVPCxAu6F+oTXha9ZAkxX8Q4+ARk2GG2vVLDiqYAddVx32+toFX3k9Q2xZWI6hA7m0VaDm71sR24/Hke6ZaUaKkkl8brNnitB7AN9d/VhHzl32/0ngskumqXzq6RVcjihI5J8bmiInoVZ6FWlMvzNkrqQAM0QAoGl51GRcaIsvn7kJ1NQ1GrH/RrtgjBhqzJlXureFXhcadIZffDZl6wadNRCK/vIxrrU3WTXivUY/4PB9Nu5VwHODOV4qpEyZFljj2uCL34nrKHdo+7hee69aCXFLobQ1G/GkKoYnoHSRW+mGkLv3qx8yTPsdIEKAZAAq6Hr0iKczeZQLZp4p2v7YscKZ95hOQF6NoJsCYXVaN8JLw0yv7eslip0ynTip+F+IUeafcv8D0iInyt/3cgxvwu7nufS9kdLP8ET8wa0fY9CkiFOlfh5PJ+2YLMJ8BkNdajz733qGl5G1zmHFmQBFD6nbcbRgQ2d4L47AIoBdF+XTfeQ9g5yPE+Z3jnDckvQaSiM/5AaZUTWYl3RB8dvOZBIfzD04wNkUrNG9xDp1TICcTiMG2XpmVzyMWlOkaiSq+e1NBAnnbuOCx/6H9XHlrVvJ4ga/i8G+MBMb6C+6lsKaKeD1u9gnHn57CI00q5kBqO3eN8jPGoF01c9ItByoMMZC1eOz98eNHxXRH9B4t879WMXaPrc29fcffNA/TDA4JmlEJEmRyoSqpqXu9gSLDqryJ621yRGO4BTi+W+h207VxK3v4SDylB3emBtUB1PmStHPqJwkJNa0hHBmyxG0pDxK6YYQyDZQkZrDZdaljxVV3tl4EsGeEPad/fqTn9Qtoe9PgWVXrn1GQGi3fvpCLYYRx1LURvu+UaQu+KVXIhE1GbuXGJWy5xgOz2P44jsp2TRoLE17MXEXDRvNnWzv4TdL24kIlMMg8CtZdRKVE7Gl0OrZp59vuiQ/QPLrvhNkemuFbtXqOx3dUPDGD5A3o7iJkaTafvdt7vdFMFxxX00YxYqy6WrSuCk/c27XDjD7l5GRC7LxXfpDh4xTaUsEZnCujmQ0rB+xsvWZilwvDNcfEz+/4zFPGNjaa2A5M5u3Dhsv73QbZSXm5hCG2v74nxGL+j8qO87/4="
};

const modules = {
  sjekkliste: () => import('./sjekkliste.js'),
  budsjett: () => import('./budsjett.js'),
  gjesteliste: () => import('./gjesteliste.js'),
  leverandorer: () => import('./leverandorer.js'),
  program: () => import('./program.js'),
  musikk: () => import('./musikk.js'),
  gaveliste: () => import('./gaveliste-edit.js'),
  bordkart: () => import('./bordkart.js'),
};
const initialized = new Set();

async function activate(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (!initialized.has(name)) {
    initialized.add(name);
    try {
      const mod = await modules[name]();
      const panel = document.getElementById(`panel-${name}`);
      mod.init(panel);
    } catch (err) {
      console.error(`Kunne ikkje laste modul ${name}:`, err);
    }
  }
}

unlock({
  container: document.getElementById('content'),
  key: 'planlegger',
  payload,
  redirectOnCancel: '../',
  onUnlocked: (el) => {
    el.style.display = 'block';
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => activate(tab.dataset.tab));
    });
    activate('sjekkliste'); // første fane
  },
});
