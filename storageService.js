import { 
  ref, 
  uploadBytes, 
  uploadString,
  getDownloadURL, 
  deleteObject,
  listAll 
} from 'firebase/storage';
import { storage } from '../config/firebase.config';

/**
 * Storage Service
 * Firebase Storage operations for images and files
 */
export const storageService = {
  /**
   * Upload image file
   * @param {File} file - Image file
   * @param {string} path - Storage path (e.g., 'lab-images/user123')
   * @param {function} onProgress - Progress callback (0-100)
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadImage(file, path, onProgress) {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name}`;
      const fullPath = `${path}/${filename}`;
      const storageRef = ref(storage, fullPath);

      // Upload with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        url,
        path: fullPath,
        filename,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: getStorageErrorMessage(error.code),
      };
    }
  },

  /**
   * Upload base64 image string
   * @param {string} base64Data - Base64 encoded image (with or without data URL prefix)
   * @param {string} path - Storage path
   * @param {string} filename - Filename to use
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadBase64(base64Data, path, filename = null) {
    try {
      // Handle data URL format
      let dataUrl = base64Data;
      if (!base64Data.startsWith('data:')) {
        dataUrl = `data:image/jpeg;base64,${base64Data}`;
      }

      const timestamp = Date.now();
      const name = filename || `${timestamp}.jpg`;
      const fullPath = `${path}/${name}`;
      const storageRef = ref(storage, fullPath);

      const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
      const url = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        url,
        path: fullPath,
      };
    } catch (error) {
      console.error('Base64 upload error:', error);
      return {
        success: false,
        error: getStorageErrorMessage(error.code),
      };
    }
  },

  /**
   * Get download URL for a file
   * @param {string} path - Storage path
   * @returns {Promise<string>}
   */
  async getUrl(path) {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Get URL error:', error);
      throw error;
    }
  },

  /**
   * Delete file from storage
   * @param {string} path - Storage path
   * @returns {Promise<void>}
   */
  async deleteFile(path) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: getStorageErrorMessage(error.code),
      };
    }
  },

  /**
   * List files in a directory
   * @param {string} path - Directory path
   * @returns {Promise<Array>}
   */
  async listFiles(path) {
    try {
      const storageRef = ref(storage, path);
      const result = await listAll(storageRef);
      
      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            url,
          };
        })
      );

      return files;
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  },

  /**
   * Compress image before upload (client-side)
   * @param {File} file - Image file
   * @param {object} options - { maxWidth, maxHeight, quality }
   * @returns {Promise<Blob>}
   */
  async compressImage(file, options = {}) {
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Convert file to base64
   * @param {File} file 
   * @returns {Promise<string>}
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Validate image file
   * @param {File} file 
   * @param {object} options - { maxSizeMB, allowedTypes }
   * @returns {{valid: boolean, error?: string}}
   */
  validateImage(file, options = {}) {
    const { 
      maxSizeMB = 10, 
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] 
    } = options;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Use: ${allowedTypes.join(', ')}`,
      };
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  },
};

/**
 * Map Firebase storage error codes to user-friendly messages
 * @param {string} errorCode 
 * @returns {string}
 */
function getStorageErrorMessage(errorCode) {
  const errorMessages = {
    'storage/unauthorized': 'You do not have permission to upload files.',
    'storage/canceled': 'Upload was cancelled.',
    'storage/unknown': 'An unknown error occurred.',
    'storage/object-not-found': 'File not found.',
    'storage/bucket-not-found': 'Storage bucket not configured.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'storage/unauthenticated': 'Please sign in to upload files.',
    'storage/retry-limit-exceeded': 'Upload failed. Please try again.',
    'storage/invalid-checksum': 'File upload corrupted. Please try again.',
    'storage/server-file-wrong-size': 'Upload failed. Please try again.',
  };
  
  return errorMessages[errorCode] || 'Upload failed. Please try again.';
}

export default storageService;
