import {
  hasAudio,
  hasImage,
  type AudioFeatures,
  type Dog,
  type ModalityUsed,
  type MoodCategory,
  type PhrasePool,
  type PostureTag,
  type Sample,
  type SampleSource,
  type StoredImageModel,
  type StoredModel,
  type TranslationRecord,
} from "../../types";
import { base64ToBlob, blobToBase64 } from "./blobStore";
import { dogsStore, historyStore, modelsStore, imageModelsStore, phrasePoolsStore, samplesStore, getDB } from "./db";

interface ExportedSample {
  id: string;
  dogId: string;
  postureTags: PostureTag[];
  category: MoodCategory;
  sentence?: string;
  source: SampleSource;
  createdAt: number;
  modality: ModalityUsed;
  audioBlobBase64?: string;
  audioBlobType?: string;
  audioFeatures?: AudioFeatures;
  imageBlobBase64?: string;
  imageBlobType?: string;
}

interface ExportedDog extends Omit<Dog, "photoThumb"> {
  photoThumbBase64?: string;
  photoThumbType?: string;
}

interface ExportBundle {
  version: 2;
  exportedAt: number;
  dogs: ExportedDog[];
  samples: ExportedSample[];
  models: StoredModel[];
  imageModels: StoredImageModel[];
  phrasePools: PhrasePool[];
  translationHistory: TranslationRecord[];
}

export async function exportAllData(): Promise<Blob> {
  const dogs = await dogsStore.all();
  const exportedDogs: ExportedDog[] = await Promise.all(
    dogs.map(async (dog) => {
      const { photoThumb, ...rest } = dog;
      if (!photoThumb) return rest;
      return {
        ...rest,
        photoThumbBase64: await blobToBase64(photoThumb),
        photoThumbType: photoThumb.type,
      };
    }),
  );

  const allSamples: Sample[] = [];
  for (const dog of dogs) {
    allSamples.push(...(await samplesStore.byDog(dog.id)));
  }
  const exportedSamples: ExportedSample[] = await Promise.all(
    allSamples.map(async (sample) => {
      const { id, dogId, postureTags, category, sentence, source, createdAt, modality } = sample;
      const base: ExportedSample = { id, dogId, postureTags, category, sentence, source, createdAt, modality };
      if (hasAudio(sample)) {
        base.audioBlobBase64 = await blobToBase64(sample.audio.audioBlob);
        base.audioBlobType = sample.audio.audioBlob.type;
        base.audioFeatures = sample.audio.features;
      }
      if (hasImage(sample)) {
        base.imageBlobBase64 = await blobToBase64(sample.image.imageBlob);
        base.imageBlobType = sample.image.imageBlob.type;
      }
      return base;
    }),
  );

  const models: StoredModel[] = [];
  const imageModels: StoredImageModel[] = [];
  for (const dog of dogs) {
    const model = await modelsStore.get(dog.id);
    if (model) models.push(model);
    const imageModel = await imageModelsStore.get(dog.id);
    if (imageModel) imageModels.push(imageModel);
  }

  const phrasePools: PhrasePool[] = [];
  for (const dog of dogs) {
    phrasePools.push(...(await phrasePoolsStore.byDog(dog.id)));
  }

  const translationHistory: TranslationRecord[] = [];
  for (const dog of dogs) {
    translationHistory.push(...(await historyStore.byDog(dog.id)));
  }

  const bundle: ExportBundle = {
    version: 2,
    exportedAt: Date.now(),
    dogs: exportedDogs,
    samples: exportedSamples,
    models,
    imageModels,
    phrasePools,
    translationHistory,
  };

  return new Blob([JSON.stringify(bundle)], { type: "application/json" });
}

function restoreSample(exported: ExportedSample): Sample {
  const { id, dogId, postureTags, category, sentence, source, createdAt, modality } = exported;
  const base = { id, dogId, postureTags, category, sentence, source, createdAt };

  const audio =
    exported.audioBlobBase64 && exported.audioFeatures
      ? {
          audioBlob: base64ToBlob(exported.audioBlobBase64, exported.audioBlobType ?? "audio/webm"),
          features: exported.audioFeatures,
        }
      : undefined;
  const image = exported.imageBlobBase64
    ? { imageBlob: base64ToBlob(exported.imageBlobBase64, exported.imageBlobType ?? "image/jpeg") }
    : undefined;

  if (modality === "audio" && audio) return { ...base, modality, audio };
  if (modality === "image" && image) return { ...base, modality, image };
  if (modality === "both" && audio && image) return { ...base, modality, audio, image };
  throw new Error(`Imported sample ${id} is missing data for its modality "${modality}"`);
}

export async function importAllData(file: Blob): Promise<{ dogsImported: number; samplesImported: number }> {
  const text = await file.text();
  const bundle = JSON.parse(text) as ExportBundle;
  if (bundle.version !== 2) {
    throw new Error(`Unsupported export version: ${bundle.version}. Re-export from the current app version.`);
  }

  const db = await getDB();

  for (const dog of bundle.dogs) {
    const { photoThumbBase64, photoThumbType, ...rest } = dog;
    const restored: Dog = {
      ...rest,
      photoThumb: photoThumbBase64 ? base64ToBlob(photoThumbBase64, photoThumbType ?? "image/jpeg") : undefined,
    };
    await db.put("dogs", restored);
  }

  for (const exported of bundle.samples) {
    await db.put("samples", restoreSample(exported));
  }

  for (const model of bundle.models) {
    await db.put("models", model);
  }
  for (const imageModel of bundle.imageModels) {
    await db.put("imageModels", imageModel);
  }
  for (const pool of bundle.phrasePools) {
    await db.put("phrasePools", pool);
  }
  for (const record of bundle.translationHistory) {
    await db.put("translationHistory", record);
  }

  return { dogsImported: bundle.dogs.length, samplesImported: bundle.samples.length };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
