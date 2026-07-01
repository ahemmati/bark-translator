import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-layers";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

let wasmPathsConfigured = false;

// The audio model is a tiny dense net -- the WASM backend is the right
// choice there (more predictable than WebGL on iOS Safari/WebView, no
// context-loss issues). This file is imported by the audio training Worker,
// so it deliberately does NOT pull in the WebGL backend (see
// imageBackend.ts) -- that would bloat the worker bundle with code it never
// uses.
//
// `tf.setBackend`/`tf.ready` run on every call (not just the first): the
// active TF.js backend is global, and the image pipeline switches it to
// WebGL during photo training/inference. Only the one-time wasm path
// configuration is memoized -- the switch itself must always re-run, or a
// later audio call silently stays on whatever backend image code left
// active.
export async function ensureBackendReady(): Promise<void> {
  if (!wasmPathsConfigured) {
    setWasmPaths("/tfjs-wasm/");
    wasmPathsConfigured = true;
  }
  await tf.setBackend("wasm");
  await tf.ready();
}

/** Switch back to the WASM backend used by the audio pipeline after an image-model operation. */
export async function restoreAudioBackend(): Promise<void> {
  await ensureBackendReady();
}
