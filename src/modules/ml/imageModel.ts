import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";
import { IMAGE_SIZE } from "./imageFeatures";

const L2 = 1e-4;

export function buildImageModel(numCategories: number): tfl.LayersModel {
  const model = tfl.sequential();
  model.add(
    tfl.layers.conv2d({
      inputShape: [IMAGE_SIZE, IMAGE_SIZE, 3],
      filters: 8,
      kernelSize: 3,
      activation: "relu",
      kernelRegularizer: tfl.regularizers.l2({ l2: L2 }),
    }),
  );
  model.add(tfl.layers.maxPooling2d({ poolSize: 2 }));
  model.add(
    tfl.layers.conv2d({
      filters: 8,
      kernelSize: 3,
      activation: "relu",
      kernelRegularizer: tfl.regularizers.l2({ l2: L2 }),
    }),
  );
  model.add(tfl.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tfl.layers.flatten());
  model.add(tfl.layers.dense({ units: 16, activation: "relu", kernelRegularizer: tfl.regularizers.l2({ l2: L2 }) }));
  model.add(tfl.layers.dropout({ rate: 0.3 }));
  model.add(
    tfl.layers.dense({
      units: numCategories,
      activation: "softmax",
      kernelRegularizer: tfl.regularizers.l2({ l2: L2 }),
    }),
  );
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
}
