import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-layers";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

let readyPromise: Promise<void> | null = null;

export function ensureBackendReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      setWasmPaths("/tfjs-wasm/");
      await tf.setBackend("wasm");
      await tf.ready();
    })();
  }
  return readyPromise;
}
