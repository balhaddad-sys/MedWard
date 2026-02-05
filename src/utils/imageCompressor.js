import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file for medical OCR.
 * Target: ~0.8–1 MB, 1920px max dimension, JPEG quality 0.8.
 * Runs in a Web Worker so the UI thread stays responsive.
 *
 * @param {File} file - Raw image file from <input> or camera
 * @returns {Promise<File>} - Compressed image file
 */
export async function compressMedicalImage(file) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(
      `[ImageCompressor] ${(file.size / 1024 / 1024).toFixed(2)} MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
    );
    return compressedFile;
  } catch (error) {
    console.error('[ImageCompressor] Compression failed, using original:', error);
    return file; // Fail-safe: never block the user
  }
}
