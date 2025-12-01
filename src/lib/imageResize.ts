import sharp from 'sharp';

export interface ResizeConfig {
  width: number;
  height: number;
}

// Available presets based on image orientation
export const RESIZE_PRESETS = {
  square: { width: 1024, height: 1024 },      // 1:1 ratio
  portrait: { width: 896, height: 1152 },     // ~0.78 ratio (taller than wide)
  landscape: { width: 1152, height: 896 },    // ~1.29 ratio (wider than tall)
};

/**
 * Determines the best preset based on the image's aspect ratio
 */
function getBestPreset(width: number, height: number): ResizeConfig {
  const ratio = width / height;

  // Portrait: ratio < 0.9 (taller than wide)
  // Landscape: ratio > 1.1 (wider than tall)
  // Square: 0.9 <= ratio <= 1.1
  if (ratio < 0.9) {
    return RESIZE_PRESETS.portrait;
  } else if (ratio > 1.1) {
    return RESIZE_PRESETS.landscape;
  } else {
    return RESIZE_PRESETS.square;
  }
}

/**
 * Resizes an image buffer to fit within the best matching preset dimensions
 * while maintaining the original aspect ratio.
 * Only resizes if the image is larger than the target dimensions.
 *
 * @param imageBuffer - The original image buffer
 * @returns The resized image buffer and metadata
 */
export async function resizeImage(
  imageBuffer: Buffer
): Promise<{ buffer: Buffer; width: number; height: number; resized: boolean; preset: string }> {
  // Get original image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Get the best preset based on aspect ratio
  const preset = getBestPreset(originalWidth, originalHeight);
  const presetName = originalWidth / originalHeight < 0.9 ? '896x1152' :
                     originalWidth / originalHeight > 1.1 ? '1152x896' : '1024x1024';

  // Check if resizing is needed (image is larger than target)
  if (originalWidth <= preset.width && originalHeight <= preset.height) {
    return {
      buffer: imageBuffer,
      width: originalWidth,
      height: originalHeight,
      resized: false,
      preset: presetName,
    };
  }

  // Calculate the scaling factor to fit within the target dimensions while keeping aspect ratio
  const widthRatio = preset.width / originalWidth;
  const heightRatio = preset.height / originalHeight;
  const scaleFactor = Math.min(widthRatio, heightRatio);

  const newWidth = Math.round(originalWidth * scaleFactor);
  const newHeight = Math.round(originalHeight * scaleFactor);

  // Resize the image
  const resizedBuffer = await sharp(imageBuffer)
    .resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();

  return {
    buffer: resizedBuffer,
    width: newWidth,
    height: newHeight,
    resized: true,
    preset: presetName,
  };
}

/**
 * Downloads an image from a URL and returns it as a buffer
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Gets the content type from a URL or filename
 */
export function getContentTypeFromUrl(url: string): string {
  const ext = url.toLowerCase().split('.').pop()?.split('?')[0];
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}
