// Copies the TensorFlow.js WASM backend binaries into public/ so they're
// served from our own origin instead of fetching from a CDN at runtime --
// required to keep the app fully offline-capable as a serverless PWA.
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "node_modules/@tensorflow/tfjs-backend-wasm/dist");
const dest = path.join(root, "public/tfjs-wasm");

const files = [
  "tfjs-backend-wasm.wasm",
  "tfjs-backend-wasm-simd.wasm",
  "tfjs-backend-wasm-threaded-simd.wasm",
];

if (!existsSync(src)) {
  console.warn("tfjs-backend-wasm not installed yet, skipping wasm copy");
  process.exit(0);
}

await mkdir(dest, { recursive: true });
for (const file of files) {
  await copyFile(path.join(src, file), path.join(dest, file));
}
console.log(`Copied ${files.length} tfjs wasm binaries to public/tfjs-wasm`);
