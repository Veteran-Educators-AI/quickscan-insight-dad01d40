/**
 * Image preprocessing utilities for enhancing scanned student work
 * Uses Canvas API for client-side processing with no external dependencies
 */

export interface PreprocessingSettings {
  contrast: number;      // -100 to 100, default 0
  brightness: number;    // -100 to 100, default 0
  sharpness: number;     // 0 to 100, default 0
  noiseReduction: number; // 0 to 100, default 0
  autoEnhance: boolean;  // Apply automatic optimization
}

export const defaultSettings: PreprocessingSettings = {
  contrast: 0,
  brightness: 0,
  sharpness: 0,
  noiseReduction: 0,
  autoEnhance: true,
};

/**
 * Analyze image to determine optimal enhancement settings
 */
function analyzeImage(imageData: ImageData): PreprocessingSettings {
  const data = imageData.data;
  const histogram = new Array(256).fill(0);
  let totalBrightness = 0;
  let pixelCount = 0;
  
  // Build histogram and calculate average brightness
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
    totalBrightness += gray;
    pixelCount++;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  
  // Find histogram range (5th and 95th percentile)
  let cumulative = 0;
  let low = 0, high = 255;
  const threshold5 = pixelCount * 0.05;
  const threshold95 = pixelCount * 0.95;
  
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative <= threshold5) low = i;
    if (cumulative <= threshold95) high = i;
  }
  
  const dynamicRange = high - low;
  
  // Calculate recommended settings based on analysis
  let contrastBoost = 0;
  let brightnessAdjust = 0;
  
  // If image has low dynamic range, boost contrast
  if (dynamicRange < 180) {
    contrastBoost = Math.min(50, Math.round((180 - dynamicRange) / 2));
  }
  
  // Adjust brightness if too dark or too light
  if (avgBrightness < 110) {
    brightnessAdjust = Math.min(30, Math.round((128 - avgBrightness) / 3));
  } else if (avgBrightness > 180) {
    brightnessAdjust = Math.max(-20, Math.round((128 - avgBrightness) / 4));
  }
  
  return {
    contrast: contrastBoost,
    brightness: brightnessAdjust,
    sharpness: 25, // Mild sharpening helps handwriting
    noiseReduction: 15, // Light noise reduction
    autoEnhance: true,
  };
}

/**
 * Apply contrast and brightness adjustments
 */
function applyContrastBrightness(
  imageData: ImageData,
  contrast: number,
  brightness: number
): void {
  const data = imageData.data;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let value = data[i + c];
      // Apply contrast
      value = contrastFactor * (value - 128) + 128;
      // Apply brightness
      value += brightness * 2.55;
      // Clamp
      data[i + c] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }
}

/**
 * Apply unsharp mask for sharpening
 * This enhances edges without amplifying noise too much
 */
function applySharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
): void {
  if (amount <= 0) return;
  
  const strength = amount / 100;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);
  
  // Simple 3x3 Laplacian kernel for edge detection
  const kernel = [
    0, -1, 0,
    -1, 5 + strength * 2, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kidx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += original[kidx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        data[idx + c] = Math.max(0, Math.min(255, Math.round(sum)));
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply noise reduction using a median filter
 */
function applyNoiseReduction(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
): void {
  if (amount <= 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);
  
  // Use a 3x3 box blur with strength based on amount
  const iterations = Math.ceil(amount / 30);
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          const values: number[] = [];
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              values.push(original[((y + ky) * width + (x + kx)) * 4 + c]);
            }
          }
          // Median of 9 values
          values.sort((a, b) => a - b);
          data[idx + c] = values[4];
        }
      }
    }
    // Update original for next iteration
    if (iter < iterations - 1) {
      original.set(data);
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Main preprocessing function
 * Takes an image blob and returns a processed blob
 */
export async function preprocessImage(
  imageBlob: Blob,
  settings: PreprocessingSettings = defaultSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data for analysis and contrast/brightness
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Determine settings (auto-enhance or use provided)
      let finalSettings = settings;
      if (settings.autoEnhance) {
        const autoSettings = analyzeImage(imageData);
        finalSettings = {
          contrast: Math.max(settings.contrast, autoSettings.contrast),
          brightness: settings.brightness || autoSettings.brightness,
          sharpness: settings.sharpness || autoSettings.sharpness,
          noiseReduction: settings.noiseReduction || autoSettings.noiseReduction,
          autoEnhance: true,
        };
      }
      
      // Apply contrast and brightness
      if (finalSettings.contrast !== 0 || finalSettings.brightness !== 0) {
        applyContrastBrightness(imageData, finalSettings.contrast, finalSettings.brightness);
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Apply noise reduction first (before sharpening)
      applyNoiseReduction(ctx, canvas.width, canvas.height, finalSettings.noiseReduction);
      
      // Apply sharpening
      applySharpening(ctx, canvas.width, canvas.height, finalSettings.sharpness);
      
      // Convert back to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.92
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageBlob);
  });
}

/**
 * Create a preview of preprocessing without full processing
 * Returns a data URL for quick display
 */
export async function createPreview(
  imageBlob: Blob,
  settings: PreprocessingSettings,
  maxSize: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Scale down for faster preview
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      let imageData = ctx.getImageData(0, 0, width, height);
      
      // Apply adjustments
      if (settings.contrast !== 0 || settings.brightness !== 0) {
        applyContrastBrightness(imageData, settings.contrast, settings.brightness);
        ctx.putImageData(imageData, 0, 0);
      }
      
      if (settings.noiseReduction > 0) {
        applyNoiseReduction(ctx, width, height, settings.noiseReduction);
      }
      
      if (settings.sharpness > 0) {
        applySharpening(ctx, width, height, settings.sharpness);
      }
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageBlob);
  });
}

/**
 * Batch preprocess multiple images
 */
export async function preprocessBatch(
  images: { blob: Blob; name: string }[],
  settings: PreprocessingSettings = defaultSettings,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; name: string }[]> {
  const results: { blob: Blob; name: string }[] = [];
  
  for (let i = 0; i < images.length; i++) {
    const processed = await preprocessImage(images[i].blob, settings);
    results.push({ blob: processed, name: images[i].name });
    onProgress?.(i + 1, images.length);
  }
  
  return results;
}
