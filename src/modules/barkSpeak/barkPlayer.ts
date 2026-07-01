import { hasAudio, type MoodCategory, type Sample } from "../../types";
import { samplesStore } from "../storage/db";
import { playBlob } from "../audio/playback";

export interface PlayedBark {
  sample: Sample & { audio: NonNullable<Sample["audio"]> };
  /** How many real barks were sequenced for this "reply" */
  count: number;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Find bark recordings for a specific dog and mood, then play one (or a short
 * sequence) of the real recordings so the dog "replies" in their own voice.
 *
 * Falls back progressively: matching mood → any other mood → nothing.
 */
export async function playBarkReply(
  dogId: string,
  targetMood: MoodCategory,
): Promise<PlayedBark | null> {
  const allSamples = await samplesStore.byDog(dogId);
  const audioSamples = allSamples.filter(hasAudio);

  if (audioSamples.length === 0) return null;

  // Find samples for the target mood, falling back to any available.
  const moodSamples = audioSamples.filter((s) => s.category === targetMood);
  const pool = moodSamples.length > 0 ? moodSamples : audioSamples;

  // Energetic moods get 2 or 3 barks in sequence; calmer moods get just 1.
  const energeticMoods: MoodCategory[] = ["wantsToPlay", "greeting", "alertWarning", "hungry"];
  const count = energeticMoods.includes(targetMood) ? Math.floor(Math.random() * 2) + 2 : 1;

  for (let i = 0; i < count; i++) {
    const sample = pickRandom(pool);
    if (i > 0) {
      // Brief gap between sequential barks.
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    const { audio, stop } = playBlob(sample.audio.audioBlob);
    // Wait for this bark to finish before the next.
    await new Promise<void>((resolve) => {
      audio.addEventListener("ended", () => resolve(), { once: true });
      audio.addEventListener("error", () => resolve(), { once: true });
      // Safety timeout: move on after max 4s so nothing hangs.
      setTimeout(resolve, 4000);
      void stop; // keep reference alive
    });
  }

  return { sample: pickRandom(pool) as PlayedBark["sample"], count };
}
