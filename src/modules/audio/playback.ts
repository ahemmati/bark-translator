export function playBlob(blob: Blob): { audio: HTMLAudioElement; stop: () => void } {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  void audio.play();
  return {
    audio,
    stop: () => {
      audio.pause();
      URL.revokeObjectURL(url);
    },
  };
}
