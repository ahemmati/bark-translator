import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export class WebglUnavailableError extends Error {}

// CNN training/inference needs WebGL: TF.js's own WASM backend docs say WASM
// "prioritizes inference over training," and conv ops are far better
// supported/faster on WebGL. This is only ever called from main-thread code
// (never the audio Worker) -- WebGL-in-Worker via OffscreenCanvas has
// inconsistent browser support, so we deliberately avoid that gap rather
// than discover it later.
export async function ensureWebglBackendReady(): Promise<void> {
  try {
    await tf.setBackend("webgl");
    await tf.ready();
  } catch (err) {
    throw new WebglUnavailableError(
      `Photo-based training isn't supported on this device (WebGL unavailable): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
