export const IMAGE_SIZE = 32;

/**
 * Decode + resize any photo to a fixed 32×32 RGB grid, normalised to [0,1].
 *
 * createImageBitmap() is faster but doesn't support HEIC/HEIF/AVIF on iOS
 * Safari even though the browser can display those formats. Falls back to
 * HTMLImageElement which uses the browser's full rendering pipeline and
 * handles every format the OS can display, including Apple's HEIC.
 */
export async function extractImagePixels(blob: Blob): Promise<Float32Array> {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  try {
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    bitmap.close();
  } catch {
    // createImageBitmap failed (e.g. HEIC on iOS) -- use HTMLImageElement
    // which delegates to the OS image codec and handles Apple formats.
    await drawViaImageElement(blob, ctx);
  }

  const { data } = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 3) {
    pixels[p] = data[i] / 255;
    pixels[p + 1] = data[i + 1] / 255;
    pixels[p + 2] = data[i + 2] / 255;
  }
  return pixels;
}

async function drawViaImageElement(blob: Blob, ctx: CanvasRenderingContext2D): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
        resolve();
      };
      img.onerror = () =>
        reject(new Error("Couldn't decode this image — try saving it as JPEG or PNG first."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
