/// <reference lib="webworker" />
import * as tf from "@tensorflow/tfjs-core";
import { ensureBackendReady } from "./backend";
import { buildModel } from "./model";

export interface TrainRequest {
  type: "train";
  dogId: string;
  categories: string[];
  vectors: number[][];
  labelIndices: number[];
}

export interface TrainSuccess {
  type: "trained";
  dogId: string;
  categories: string[];
  topology: unknown;
  weightSpecs: unknown;
  weightDataBase64: string;
  sampleCountAtTrain: number;
}

export interface TrainError {
  type: "error";
  message: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

self.onmessage = async (event: MessageEvent<TrainRequest>) => {
  const { dogId, categories, vectors, labelIndices } = event.data;
  try {
    await ensureBackendReady();

    const model = buildModel(categories.length);
    const xs = tf.tensor2d(vectors);
    const ys = tf.oneHot(tf.tensor1d(labelIndices, "int32"), categories.length);

    await model.fit(xs, ys, {
      epochs: 120,
      batchSize: Math.max(4, Math.min(16, vectors.length)),
      shuffle: true,
      verbose: 0,
    });

    let topology: unknown = null;
    let weightSpecs: unknown = null;
    let weightDataBase64 = "";

    await model.save(
      tf.io.withSaveHandler(async (artifacts) => {
        topology = artifacts.modelTopology;
        weightSpecs = artifacts.weightSpecs;
        weightDataBase64 = arrayBufferToBase64(artifacts.weightData as ArrayBuffer);
        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: "JSON",
          },
        };
      }),
    );

    xs.dispose();
    ys.dispose();
    model.dispose();

    const response: TrainSuccess = {
      type: "trained",
      dogId,
      categories,
      topology,
      weightSpecs,
      weightDataBase64,
      sampleCountAtTrain: vectors.length,
    };
    (self as unknown as Worker).postMessage(response);
  } catch (err) {
    const response: TrainError = {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(response);
  }
};
