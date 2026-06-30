let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices.length === 0) refreshVoices();
  return cachedVoices;
}

export function onVoicesChanged(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (!("speechSynthesis" in window)) return () => {};
  const handler = () => callback(refreshVoices());
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  // Safari sometimes never fires voiceschanged; poll once shortly after as a fallback.
  const timeout = window.setTimeout(() => callback(refreshVoices()), 500);
  return () => {
    window.speechSynthesis.removeEventListener("voiceschanged", handler);
    window.clearTimeout(timeout);
  };
}

export function speak(text: string, voiceURI?: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (voiceURI) {
    const voice = getAvailableVoices().find((v) => v.voiceURI === voiceURI);
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
}

export function isSpeechSupported(): boolean {
  return "speechSynthesis" in window;
}
