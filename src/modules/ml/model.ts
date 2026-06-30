import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";
import { FEATURE_VECTOR_LENGTH } from "./featureVector";

export function buildModel(numCategories: number): tfl.LayersModel {
  const model = tfl.sequential();
  model.add(
    tfl.layers.dense({ inputShape: [FEATURE_VECTOR_LENGTH], units: 16, activation: "relu" }),
  );
  model.add(tfl.layers.dense({ units: 8, activation: "relu" }));
  model.add(tfl.layers.dense({ units: numCategories, activation: "softmax" }));
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
}
