import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";
import type {
  AudioFeatures,
  ConfidenceBucket,
  MoodCategory,
  PostureTag,
  StoredImageModel,
  StoredModel,
} from "../../types";
import { ensureBackendReady, restoreAudioBackend } from "./backend";
import { ensureWebglBackendReady } from "./imageBackend";
import { buildFeatureVector } from "./featureVector";
import { extractImagePixels, IMAGE_SIZE } from "./imageFeatures";
import { MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE } from "./trainModel";

export interface PredictionResult {
  category: MoodCategory;
  confidence: ConfidenceBucket;
  scoresByCategory: { category: MoodCategory; score: number }[];
}

const CONFIDENCE_RANK: Record<ConfidenceBucket, number> = { notSure: 0, fairlyConfident: 1, veryConfident: 2 };

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function confidenceBucket(topScore: number): ConfidenceBucket {
  if (topScore >= 0.7) return "veryConfident";
  if (topScore >= 0.45) return "fairlyConfident";
  return "notSure";
}

const audioModelCache = new Map<string, tfl.LayersModel>();

async function loadAudioModel(stored: StoredModel): Promise<tfl.LayersModel> {
  const cacheKey = `${stored.dogId}:${stored.trainedAt}`;
  const cached = audioModelCache.get(cacheKey);
  if (cached) return cached;

  await ensureBackendReady();
  const model = await tfl.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: stored.topology as tf.io.ModelJSON["modelTopology"],
      weightSpecs: stored.weightSpecs as tf.io.WeightsManifestEntry[],
      weightData: base64ToArrayBuffer(stored.weightDataBase64),
    }),
  );
  audioModelCache.clear();
  audioModelCache.set(cacheKey, model);
  return model;
}

export function hasEnoughDataForConfidentTranslation(sampleCount: number): boolean {
  return sampleCount >= MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE;
}

/** Per-category + total floor -- a from-scratch CNN on raw pixels needs more, and more *balanced*, data than the audio model's hand-engineered features. */
export function hasEnoughImageDataForConfidentTranslation(samplesByCategory: Map<MoodCategory, number>): boolean {
  const categoryCount = samplesByCategory.size;
  if (categoryCount === 0) return false;
  const total = [...samplesByCategory.values()].reduce((a, b) => a + b, 0);
  const totalFloor = Math.max(60, 20 * categoryCount);
  const perCategoryFloor = 15;
  return total >= totalFloor && [...samplesByCategory.values()].every((c) => c >= perCategoryFloor);
}

export async function predictFromAudio(
  stored: StoredModel,
  features: AudioFeatures,
  postureTags: PostureTag[],
): Promise<PredictionResult> {
  const model = await loadAudioModel(stored);
  const vector = buildFeatureVector(features, postureTags);
  const input = tf.tensor2d([vector]);
  const output = model.predict(input) as tf.Tensor;
  const scores = Array.from(await output.data());
  input.dispose();
  output.dispose();

  const scoresByCategory = stored.categories.map((category, i) => ({ category, score: scores[i] }));
  scoresByCategory.sort((a, b) => b.score - a.score);
  const top = scoresByCategory[0];

  return { category: top.category, confidence: confidenceBucket(top.score), scoresByCategory };
}

// Unlike the audio model, the image model is never cached across calls: its
// weights are tied to whichever backend was active when they were loaded,
// and this app switches the active TF.js backend (wasm <-> webgl) between
// audio and image operations. Reloading fresh each time is simple and safe;
// image translation is a rare, user-initiated action, so the cost is fine.
export async function predictFromImage(stored: StoredImageModel, imageBlob: Blob): Promise<PredictionResult> {
  await ensureWebglBackendReady();
  let model: tfl.LayersModel | null = null;
  try {
    model = await tfl.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: stored.topology as tf.io.ModelJSON["modelTopology"],
        weightSpecs: stored.weightSpecs as tf.io.WeightsManifestEntry[],
        weightData: base64ToArrayBuffer(stored.weightDataBase64),
      }),
    );

    const pixels = await extractImagePixels(imageBlob);
    const input = tf.tensor4d(pixels, [1, IMAGE_SIZE, IMAGE_SIZE, 3]);
    const output = model.predict(input) as tf.Tensor;
    const scores = Array.from(await output.data());
    input.dispose();
    output.dispose();

    const scoresByCategory = stored.categories.map((category, i) => ({ category, score: scores[i] }));
    scoresByCategory.sort((a, b) => b.score - a.score);
    const top = scoresByCategory[0];

    return { category: top.category, confidence: confidenceBucket(top.score), scoresByCategory };
  } finally {
    model?.dispose();
    await restoreAudioBackend();
  }
}

/**
 * Fuse audio + image predictions. Confidence-weighted (not plain) average so
 * a confidently-wrong guess from one modality can't silently swamp a
 * correct-but-modest guess from the other. The combined bucket is capped at
 * the stronger individual bucket, and can only reach "veryConfident" if both
 * modalities agree on the top category -- continues the app's "no fake
 * precision" principle into fusion.
 */
export function combinePredictions(
  audio: PredictionResult | null,
  image: PredictionResult | null,
): PredictionResult {
  if (audio && !image) return audio;
  if (image && !audio) return image;
  if (!audio || !image) throw new Error("combinePredictions requires at least one prediction");

  const audioWeight = audio.scoresByCategory[0].score;
  const imageWeight = image.scoresByCategory[0].score;
  const categories = new Set([...audio.scoresByCategory, ...image.scoresByCategory].map((s) => s.category));

  const combined = [...categories].map((category) => {
    const a = audio.scoresByCategory.find((s) => s.category === category)?.score ?? 0;
    const i = image.scoresByCategory.find((s) => s.category === category)?.score ?? 0;
    const score = (a * audioWeight + i * imageWeight) / (audioWeight + imageWeight);
    return { category, score };
  });
  combined.sort((a, b) => b.score - a.score);
  const top = combined[0];

  const computedBucket = confidenceBucket(top.score);
  const maxIndividualRank = Math.max(CONFIDENCE_RANK[audio.confidence], CONFIDENCE_RANK[image.confidence]);
  const agree = audio.category === image.category;

  let bucketRank = Math.min(CONFIDENCE_RANK[computedBucket], maxIndividualRank);
  if (!agree) bucketRank = Math.min(bucketRank, CONFIDENCE_RANK.fairlyConfident);
  const confidence = (Object.keys(CONFIDENCE_RANK) as ConfidenceBucket[]).find(
    (b) => CONFIDENCE_RANK[b] === bucketRank,
  )!;

  return { category: top.category, confidence, scoresByCategory: combined };
}
