import type { Dog, PhrasePool, Sample, StoredModel, TranslationRecord } from "../../types";
import { base64ToBlob, blobToBase64 } from "./blobStore";
import { dogsStore, historyStore, modelsStore, phrasePoolsStore, samplesStore, getDB } from "./db";

interface ExportedSample extends Omit<Sample, "audioBlob" | "imageBlob"> {
  audioBlobBase64: string;
  audioBlobType: string;
  imageBlobBase64?: string;
  imageBlobType?: string;
}

interface ExportedDog extends Omit<Dog, "photoThumb"> {
  photoThumbBase64?: string;
  photoThumbType?: string;
}

interface ExportBundle {
  version: 1;
  exportedAt: number;
  dogs: ExportedDog[];
  samples: ExportedSample[];
  models: StoredModel[];
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
      const { audioBlob, imageBlob, ...rest } = sample;
      const base: ExportedSample = {
        ...rest,
        audioBlobBase64: await blobToBase64(audioBlob),
        audioBlobType: audioBlob.type,
      };
      if (imageBlob) {
        base.imageBlobBase64 = await blobToBase64(imageBlob);
        base.imageBlobType = imageBlob.type;
      }
      return base;
    }),
  );

  const models: StoredModel[] = [];
  for (const dog of dogs) {
    const model = await modelsStore.get(dog.id);
    if (model) models.push(model);
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
    version: 1,
    exportedAt: Date.now(),
    dogs: exportedDogs,
    samples: exportedSamples,
    models,
    phrasePools,
    translationHistory,
  };

  return new Blob([JSON.stringify(bundle)], { type: "application/json" });
}

export async function importAllData(file: Blob): Promise<{ dogsImported: number; samplesImported: number }> {
  const text = await file.text();
  const bundle = JSON.parse(text) as ExportBundle;
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export version: ${bundle.version}`);
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

  for (const sample of bundle.samples) {
    const { audioBlobBase64, audioBlobType, imageBlobBase64, imageBlobType, ...rest } = sample;
    const restored: Sample = {
      ...rest,
      audioBlob: base64ToBlob(audioBlobBase64, audioBlobType),
      imageBlob: imageBlobBase64 ? base64ToBlob(imageBlobBase64, imageBlobType ?? "image/jpeg") : undefined,
    };
    await db.put("samples", restored);
  }

  for (const model of bundle.models) {
    await db.put("models", model);
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
