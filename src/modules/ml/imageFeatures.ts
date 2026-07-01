export const IMAGE_SIZE = 32;

/** Decode + resize a photo to a fixed 32x32 RGB grid, normalized to [0,1]. */
export async function extractImagePixels(blob: Blob): Promise<Float32Array> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");

    ctx.drawImage(bitmap, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const { data } = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);

    const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
    for (let i = 0, p = 0; i < data.length; i += 4, p += 3) {
      pixels[p] = data[i] / 255;
      pixels[p + 1] = data[i + 1] / 255;
      pixels[p + 2] = data[i + 2] / 255;
    }
    return pixels;
  } finally {
    bitmap.close();
  }
}
