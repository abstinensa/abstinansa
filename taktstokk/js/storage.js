const KEY = 'taktstokk.v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveState(state) {
  const copy = { ...state };
  delete copy.wipeArmed;
  delete copy.speakOnNext;
  delete copy.voiceError;
  localStorage.setItem(KEY, JSON.stringify(copy));
}

export function clearState() {
  localStorage.removeItem(KEY);
}
