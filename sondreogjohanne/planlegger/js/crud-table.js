import { subscribe, add, update, remove } from '../../store.js';

export function mountCrudTable({ panelEl, collection, schema, seed = [] }) {
  let items = [];
  const summaryEl = document.createElement('div');
  summaryEl.className = 'summary';
  const tableEl = document.createElement('table');
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary add-row';
  addBtn.textContent = '+ Legg til';
  panelEl.innerHTML = '';
  panelEl.appendChild(summaryEl);
  panelEl.appendChild(tableEl);
  panelEl.appendChild(addBtn);

  addBtn.addEventListener('click', async () => {
    await add(collection, { ...(schema.defaults || {}), _created: Date.now() });
  });

  function render() {
    if (schema.summary) {
      summaryEl.innerHTML = schema.summary(items);
      summaryEl.style.display = '';
    } else {
      summaryEl.style.display = 'none';
    }
    const thead = '<tr>' + schema.fields.map(f => `<th>${f.label}</th>`).join('') + '<th></th></tr>';
    const tbody = items.map(item => {
      const cells = schema.fields.map(f => `<td>${renderField(f, item)}</td>`).join('');
      return `<tr data-id="${item.id}">${cells}<td class="row-actions"><button class="btn btn-ghost" data-action="del">Slett</button></td></tr>`;
    }).join('');
    tableEl.innerHTML = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;

    tableEl.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelectorAll('[data-field]').forEach(inp => {
        inp.addEventListener('change', async () => {
          const key = inp.dataset.field;
          const val = inp.type === 'number'
            ? (inp.value === '' ? null : Number(inp.value))
            : inp.value;
          await update(collection, id, { [key]: val });
        });
      });
      tr.querySelector('[data-action="del"]').addEventListener('click', async () => {
        if (confirm('Slett denne raden?')) await remove(collection, id);
      });
    });
  }

  function renderField(f, item) {
    const v = item[f.key] ?? '';
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (f.type === 'select') {
      return `<select data-field="${f.key}">` +
        f.options.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('') +
        '</select>';
    }
    if (f.type === 'textarea') return `<textarea data-field="${f.key}" rows="1">${esc(v)}</textarea>`;
    return `<input data-field="${f.key}" type="${f.type || 'text'}" value="${esc(v)}">`;
  }

  let seeded = false;
  subscribe(collection, async list => {
    items = list;
    if (!seeded && list.length === 0 && seed.length > 0) {
      seeded = true;
      for (const s of seed) await add(collection, s);
      return;
    }
    seeded = true;
    render();
  }, schema.orderBy);
}
