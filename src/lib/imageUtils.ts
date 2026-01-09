/**
 * Resizes an image to a maximum width while maintaining aspect ratio.
 * Optimizes for OCR processing by reducing file size.
 */
export async function resizeImage(file: File | Blob, maxWidth = 1200): Promise<Blob> {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  
  await img.decode();
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Calculate new dimensions
  let width = img.width;
  let height = img.height;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  
  // Clean up object URL
  URL.revokeObjectURL(img.src);
  
  // Convert to a smaller Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/jpeg',
      0.8
    );
  });
}

/**
 * Converts a Blob to a base64 data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
