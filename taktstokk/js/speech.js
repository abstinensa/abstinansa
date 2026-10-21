export function createSpeech({ getLang, onInterim, onFinal, onState, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let listening = false;
  let speaking = false;
  let lastFinal = '';
  let lastFinalAt = 0;

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    return voices.find((voice) => {
      const lang = (voice.lang || '').toLowerCase();
      return getLang() === 'en' ? lang.startsWith('en') : lang.startsWith('nb') || lang.startsWith('no');
    }) || null;
  }

  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLang() === 'en' ? 'en-GB' : 'nb-NO';
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.02;
    utterance.onstart = () => {
      speaking = true;
      onState?.();
    };
    utterance.onend = () => {
      speaking = false;
      onState?.();
    };
    utterance.onerror = () => {
      speaking = false;
      onState?.();
    };
    window.speechSynthesis.speak(utterance);
  }

  function cancel() {
    window.speechSynthesis?.cancel();
    speaking = false;
  }

  function stop() {
    try { rec?.stop(); } catch { /* already inactive */ }
    listening = false;
    onState?.();
  }

  function start() {
    if (!SR) {
      onError?.('unsupported');
      return;
    }
    cancel();
    rec = new SR();
    rec.lang = getLang() === 'en' ? 'en-US' : 'nb-NO';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      listening = true;
      onState?.();
    };
    rec.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      const spoken = finalText.trim();
      if (spoken) {
        const now = Date.now();
        if (spoken === lastFinal && now - lastFinalAt < 900) return;
        lastFinal = spoken;
        lastFinalAt = now;
        onFinal?.(spoken);
        return;
      }
      onInterim?.(interim.trim());
    };
    rec.onerror = (event) => {
      listening = false;
      if (event.error !== 'aborted') onError?.(event.error || 'error');
      onState?.();
    };
    rec.onend = () => {
      listening = false;
      onState?.();
    };
    try {
      rec.start();
    } catch {
      listening = false;
      onError?.('start');
    }
  }

  if (window.speechSynthesis) window.speechSynthesis.getVoices();

  return {
    supported: !!SR,
    speak,
    cancel,
    stop,
    start,
    toggle() { listening ? stop() : start(); },
    get listening() { return listening; },
    get speaking() { return speaking; }
  };
}
