import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";
import type { AudioFeatures, ConfidenceBucket, MoodCategory, PostureTag, StoredModel } from "../../types";
import { ensureBackendReady } from "./backend";
import { buildFeatureVector } from "./featureVector";
import { MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE } from "./trainModel";

export interface PredictionResult {
  category: MoodCategory;
  confidence: ConfidenceBucket;
  scoresByCategory: { category: MoodCategory; score: number }[];
}

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

const modelCache = new Map<string, tfl.LayersModel>();

async function loadModel(stored: StoredModel): Promise<tfl.LayersModel> {
  const cacheKey = `${stored.dogId}:${stored.trainedAt}`;
  const cached = modelCache.get(cacheKey);
  if (cached) return cached;

  await ensureBackendReady();
  const model = await tfl.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: stored.topology as tf.io.ModelJSON["modelTopology"],
      weightSpecs: stored.weightSpecs as tf.io.WeightsManifestEntry[],
      weightData: base64ToArrayBuffer(stored.weightDataBase64),
    }),
  );
  modelCache.clear();
  modelCache.set(cacheKey, model);
  return model;
}

export function hasEnoughDataForConfidentTranslation(sampleCount: number): boolean {
  return sampleCount >= MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE;
}

export async function predict(
  stored: StoredModel,
  features: AudioFeatures,
  postureTags: PostureTag[],
): Promise<PredictionResult> {
  const model = await loadModel(stored);
  const vector = buildFeatureVector(features, postureTags);
  const input = tf.tensor2d([vector]);
  const output = model.predict(input) as tf.Tensor;
  const scores = Array.from(await output.data());
  input.dispose();
  output.dispose();

  const scoresByCategory = stored.categories.map((category, i) => ({ category, score: scores[i] }));
  scoresByCategory.sort((a, b) => b.score - a.score);
  const top = scoresByCategory[0];

  return {
    category: top.category,
    confidence: confidenceBucket(top.score),
    scoresByCategory,
  };
}
