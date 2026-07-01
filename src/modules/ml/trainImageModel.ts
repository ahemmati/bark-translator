import * as tf from "@tensorflow/tfjs-core";
import type * as tfl from "@tensorflow/tfjs-layers";
import { hasImage, type StoredImageModel } from "../../types";
import { imageModelsStore, samplesStore } from "../storage/db";
import { restoreAudioBackend } from "./backend";
import { ensureWebglBackendReady } from "./imageBackend";
import { extractImagePixels, IMAGE_SIZE } from "./imageFeatures";
import { buildImageModel } from "./imageModel";
import { InsufficientDataError, orderedCategoriesPresent } from "./trainModel";

export const MIN_IMAGE_SAMPLES_TO_TRAIN = 12;
export const MIN_IMAGE_CATEGORIES_TO_TRAIN = 2;

const AUGMENT_VARIANTS_PER_IMAGE = 4; // original + flip + rotate + brightness/contrast jitter
const EPOCHS = 200;
const BATCH_SIZE = 8;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** One real photo -> 4 tensor variants (original + flip + rotate + brightness/contrast jitter), batched. */
function augmentToBatch(pixels: Float32Array): tf.Tensor4D {
  return tf.tidy(() => {
    const base = tf.tensor3d(pixels, [IMAGE_SIZE, IMAGE_SIZE, 3]);
    const batched = tf.reshape(base, [1, IMAGE_SIZE, IMAGE_SIZE, 3]) as tf.Tensor4D;

    const flipped = tf.image.flipLeftRight(batched);

    const angleRad = ((Math.random() * 30 - 15) * Math.PI) / 180; // +/-15 degrees
    const rotated = tf.image.rotateWithOffset(batched, angleRad);

    const brightnessDelta = Math.random() * 0.3 - 0.15; // +/-0.15
    const contrastFactor = 0.8 + Math.random() * 0.4; // 0.8x - 1.2x
    const mean = tf.mean(batched);
    const jittered = tf.clipByValue(
      tf.add(tf.add(tf.mul(tf.sub(batched, mean), contrastFactor), mean), brightnessDelta),
      0,
      1,
    );

    return tf.concat([batched, flipped, rotated, jittered], 0) as tf.Tensor4D;
  });
}

export class DegenerateModelError extends Error {}

export async function trainImageModelForDog(
  dogId: string,
  onProgress?: (status: string) => void,
): Promise<StoredImageModel> {
  const samples = (await samplesStore.byDog(dogId)).filter(hasImage);
  if (samples.length < MIN_IMAGE_SAMPLES_TO_TRAIN) {
    throw new InsufficientDataError(
      `Need at least ${MIN_IMAGE_SAMPLES_TO_TRAIN} labeled photos to train (have ${samples.length}).`,
    );
  }

  const categories = orderedCategoriesPresent(samples.map((s) => s.category));
  if (categories.length < MIN_IMAGE_CATEGORIES_TO_TRAIN) {
    throw new InsufficientDataError(
      `Need photos in at least ${MIN_IMAGE_CATEGORIES_TO_TRAIN} different categories to train.`,
    );
  }

  onProgress?.("Reading photos…");
  const pixelsBySample = await Promise.all(samples.map((s) => extractImagePixels(s.image.imageBlob)));
  const labelIndices = samples.map((s) => categories.indexOf(s.category));

  await ensureWebglBackendReady();
  let model: tfl.LayersModel | null = null;
  try {
    onProgress?.("Augmenting dataset…");
    const perImageBatches = pixelsBySample.map((pixels) => augmentToBatch(pixels));
    const xs = tf.concat(perImageBatches, 0) as tf.Tensor4D;
    perImageBatches.forEach((t) => t.dispose());

    const augmentedLabels: number[] = [];
    for (const label of labelIndices) {
      for (let v = 0; v < AUGMENT_VARIANTS_PER_IMAGE; v++) augmentedLabels.push(label);
    }
    const ys = tf.oneHot(tf.tensor1d(augmentedLabels, "int32"), categories.length) as tf.Tensor2D;

    model = buildImageModel(categories.length);

    onProgress?.("Training photo model…");
    await model.fit(xs, ys, {
      epochs: EPOCHS,
      batchSize: BATCH_SIZE,
      shuffle: true,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch: number) => {
          if (epoch % 20 === 0) onProgress?.(`Training photo model… (epoch ${epoch}/${EPOCHS})`);
        },
      },
    });
    xs.dispose();
    ys.dispose();

    // Degenerate-model guard: a from-scratch CNN on this little data can
    // trivially hit high training accuracy by always guessing the majority
    // category. Refuse to ship a model that never predicts one of the
    // represented categories at all.
    const originals = tf.tidy(
      () => tf.stack(pixelsBySample.map((pixels) => tf.tensor3d(pixels, [IMAGE_SIZE, IMAGE_SIZE, 3]))) as tf.Tensor4D,
    );
    const predictions = model.predict(originals) as tf.Tensor;
    const predictedIndexTensor = tf.argMax(predictions, -1);
    const predictedIndices = Array.from(await predictedIndexTensor.data());
    originals.dispose();
    predictions.dispose();
    predictedIndexTensor.dispose();

    const distinctPredicted = new Set(predictedIndices);
    if (distinctPredicted.size < categories.length) {
      throw new DegenerateModelError(
        "The photo model couldn't learn to tell these moods apart yet — try adding more varied photos per category.",
      );
    }

    onProgress?.("Saving photo model…");
    let topology: unknown = null;
    let weightSpecs: unknown = null;
    let weightDataBase64 = "";
    await model.save(
      tf.io.withSaveHandler(async (artifacts) => {
        topology = artifacts.modelTopology;
        weightSpecs = artifacts.weightSpecs;
        weightDataBase64 = arrayBufferToBase64(artifacts.weightData as ArrayBuffer);
        return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON" } };
      }),
    );

    const stored: StoredImageModel = {
      dogId,
      topology,
      weightSpecs,
      weightDataBase64,
      trainedAt: Date.now(),
      sampleCountAtTrain: samples.length,
      categories,
    };
    await imageModelsStore.put(stored);
    onProgress?.("Done");
    return stored;
  } finally {
    model?.dispose();
    await restoreAudioBackend();
  }
}
