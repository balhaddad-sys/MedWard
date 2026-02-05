/**
 * Convert a File/Blob to a base64 data URL string.
 * @param {File|Blob} file
 * @returns {Promise<string>} - data URL (e.g. "data:image/jpeg;base64,...")
 */
export const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
