import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
}

/**
 * Compresses an image file before uploading.
 * @param {File} imageFile - The image file to compress.
 * @param {Partial<CompressionOptions>} options - Compression options.
 * @returns {Promise<File>} - The compressed image file.
 */
export const compressImage = async (
  imageFile: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> => {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1, // Max size in MB
    maxWidthOrHeight: 1920, // Max width or height
    useWebWorker: true,
  };

  const compressionOptions = {
    ...defaultOptions,
    ...options,
  };

  console.log(`Original image size: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    const compressedFile = await imageCompression(imageFile, compressionOptions);
    console.log(`Compressed image size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return imageFile;
  }
}; 