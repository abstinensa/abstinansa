import { requirePassword } from '../../auth.js';

if (!requirePassword({ key: 'planlegger', correct: 'iloveyou', redirectOnCancel: '../' })) {
  throw new Error('auth failed');
}
document.querySelector('main').style.display = 'block';

// Fane-navigasjon (utvidast til lazy modul-loading i Task 8)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${name}`);
    });
  });
});
