import { requirePassword } from '../../auth.js';

if (!await requirePassword({ key: 'planlegger', hash: 'cbf5a8a3bc535135da3e21cd25ef99fc65b8798a36f819182ce2f5ce5813c782', redirectOnCancel: '../' })) {
  throw new Error('auth failed');
}
document.querySelector('main').style.display = 'block';

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

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => activate(tab.dataset.tab));
});
activate('sjekkliste');
