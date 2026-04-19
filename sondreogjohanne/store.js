// store.js — localStorage-basert datastore med same API som ei Firestore-wrapper.
// Synk mellom fanar i same nettlesar via `storage`-event. Ingen synk mellom einingar.

const KEY_PREFIX = 'sj_';
const listeners = new Map();

function read(collection) {
  const raw = localStorage.getItem(KEY_PREFIX + collection);
  return raw ? JSON.parse(raw) : [];
}

function write(collection, items) {
  localStorage.setItem(KEY_PREFIX + collection, JSON.stringify(items));
  notify(collection);
}

function notify(collection) {
  const set = listeners.get(collection);
  if (!set) return;
  const items = read(collection);
  for (const cb of set) cb(items);
}

window.addEventListener('storage', e => {
  if (e.key && e.key.startsWith(KEY_PREFIX)) {
    const collection = e.key.slice(KEY_PREFIX.length);
    notify(collection);
  }
});

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sortBy(items, field) {
  if (!field) return items;
  return [...items].sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
}

export function subscribe(collection, cb, orderField = null) {
  if (!listeners.has(collection)) listeners.set(collection, new Set());
  const wrapped = items => cb(sortBy(items, orderField));
  listeners.get(collection).add(wrapped);
  wrapped(read(collection));
  return () => listeners.get(collection).delete(wrapped);
}

export async function add(collection, data) {
  const items = read(collection);
  const id = genId();
  items.push({ id, ...data });
  write(collection, items);
  return { id };
}

export async function update(collection, id, data) {
  const items = read(collection);
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...data };
  write(collection, items);
}

export async function remove(collection, id) {
  const items = read(collection).filter(i => i.id !== id);
  write(collection, items);
}

export async function reserveGave(id, navn) {
  const items = read('gaveliste');
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) throw new Error('Gåva finst ikkje');
  if (items[idx].reservertAv) throw new Error('Allereie reservert');
  items[idx] = { ...items[idx], reservertAv: navn, reservertTid: Date.now() };
  write('gaveliste', items);
}

export async function angreReservasjon(id, navn) {
  const items = read('gaveliste');
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) throw new Error('Gåva finst ikkje');
  if (items[idx].reservertAv !== navn) throw new Error('Feil namn');
  items[idx] = { ...items[idx], reservertAv: '', reservertTid: null };
  write('gaveliste', items);
}
