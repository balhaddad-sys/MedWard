/**
 * Shared image compression utility.
 * Used by LabAnalysisPage and ScanNotesButton.
 */

export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxSizeKB: number;
}

export const DEFAULT_COMPRESS: CompressOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  maxSizeKB: 1500,
};

/**
 * Compress an image file using canvas.
 * Iteratively reduces quality until the output is under maxSizeKB.
 * Returns { blob, base64, originalKB, compressedKB }.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = DEFAULT_COMPRESS,
): Promise<{ blob: Blob; base64: string; originalKB: number; compressedKB: number }> {
  const originalKB = Math.round(file.size / 1024);

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Scale to fit within max dimensions while preserving aspect ratio
  if (width > opts.maxWidth || height > opts.maxHeight) {
    const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Iteratively reduce quality until under target size
  let quality = opts.quality;
  let blob: Blob;
  const MIN_QUALITY = 0.35;

  do {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    if (blob.size / 1024 <= opts.maxSizeKB || quality <= MIN_QUALITY) break;
    quality -= 0.08;
  } while (quality >= MIN_QUALITY);

  // Convert to base64
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const compressedKB = Math.round(blob.size / 1024);

  return { blob, base64, originalKB, compressedKB };
}
