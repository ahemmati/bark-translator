import { POSTURE_TAGS, type AudioFeatures, type PostureTag } from "../../types";

// Rough scale constants to keep inputs in a roughly comparable range for a
// tiny dense net trained on very little data -- doesn't need to be precise
// standardization, just enough to stop one feature from dominating by scale.
const NORMALIZERS: Record<keyof AudioFeatures, number> = {
  durationSec: 5,
  meanPitchHz: 1200,
  pitchVarianceHz: 400,
  rmsEnergy: 1,
  zeroCrossingRate: 1,
  spectralCentroid: 4000,
  barkCount: 10,
  attackSec: 2,
};

const AUDIO_FEATURE_KEYS = Object.keys(NORMALIZERS) as (keyof AudioFeatures)[];

export const FEATURE_VECTOR_LENGTH = AUDIO_FEATURE_KEYS.length + POSTURE_TAGS.length;

export function buildFeatureVector(features: AudioFeatures, postureTags: PostureTag[]): number[] {
  const audioPart = AUDIO_FEATURE_KEYS.map((key) => {
    const value = features[key] / NORMALIZERS[key];
    return Math.max(0, Math.min(2, value));
  });
  const postureSet = new Set(postureTags);
  const posturePart = POSTURE_TAGS.map((tag) => (postureSet.has(tag.id) ? 1 : 0));
  return [...audioPart, ...posturePart];
}
