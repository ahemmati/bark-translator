import { DEFAULT_CATEGORIES, hasAudio, type MoodCategory, type StoredModel } from "../../types";
import { modelsStore, samplesStore } from "../storage/db";
import { buildFeatureVector } from "./featureVector";
import type { TrainError, TrainRequest, TrainSuccess } from "./training.worker";

export const MIN_SAMPLES_TO_TRAIN = 4;
export const MIN_CATEGORIES_TO_TRAIN = 2;
export const MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE = 30;

export class InsufficientDataError extends Error {}

export function orderedCategoriesPresent(categories: MoodCategory[]): MoodCategory[] {
  const present = new Set(categories);
  const ordered = DEFAULT_CATEGORIES.map((c) => c.id).filter((id) => present.has(id));
  // Include any category not in the default list (future custom categories) at the end.
  for (const id of present) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export async function trainModelForDog(
  dogId: string,
  onProgress?: (status: string) => void,
): Promise<StoredModel> {
  const samples = (await samplesStore.byDog(dogId)).filter(hasAudio);
  if (samples.length < MIN_SAMPLES_TO_TRAIN) {
    throw new InsufficientDataError(
      `Need at least ${MIN_SAMPLES_TO_TRAIN} labeled bark recordings to train (have ${samples.length}).`,
    );
  }

  const categories = orderedCategoriesPresent(samples.map((s) => s.category));
  if (categories.length < MIN_CATEGORIES_TO_TRAIN) {
    throw new InsufficientDataError(
      `Need bark recordings in at least ${MIN_CATEGORIES_TO_TRAIN} different categories to train.`,
    );
  }

  const vectors = samples.map((s) => buildFeatureVector(s.audio.features, s.postureTags));
  const labelIndices = samples.map((s) => categories.indexOf(s.category));

  onProgress?.("Training in background…");

  const stored = await new Promise<StoredModel>((resolve, reject) => {
    const worker = new Worker(new URL("./training.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<TrainSuccess | TrainError>) => {
      worker.terminate();
      if (event.data.type === "error") {
        reject(new Error(event.data.message));
        return;
      }
      const result = event.data;
      const model: StoredModel = {
        dogId,
        topology: result.topology,
        weightSpecs: result.weightSpecs,
        weightDataBase64: result.weightDataBase64,
        trainedAt: Date.now(),
        sampleCountAtTrain: result.sampleCountAtTrain,
        categories: result.categories as MoodCategory[],
      };
      resolve(model);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    const request: TrainRequest = { type: "train", dogId, categories, vectors, labelIndices };
    worker.postMessage(request);
  });

  await modelsStore.put(stored);
  onProgress?.("Done");
  return stored;
}
