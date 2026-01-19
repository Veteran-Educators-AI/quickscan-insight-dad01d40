/**
 * Detects if running on a mobile device
 */
function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Compresses a base64 image to reduce memory usage, especially on mobile devices.
 * Returns the compressed image as a data URL.
 */
export async function compressImage(imageDataUrl: string, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Use lower limits on mobile
      const isMobile = isMobileDevice();
      const effectiveMaxWidth = isMobile ? Math.min(maxWidth, 1000) : maxWidth;
      const effectiveQuality = isMobile ? Math.min(quality, 0.7) : quality;
      
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > effectiveMaxWidth) {
        height = Math.round((height * effectiveMaxWidth) / width);
        width = effectiveMaxWidth;
      }
      
      // Also limit height to prevent very tall images
      const maxHeight = isMobile ? 1400 : 1800;
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', effectiveQuality);
      
      // Clean up canvas to free memory
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 1;
      canvas.height = 1;
      
      resolve(compressedDataUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = imageDataUrl;
  });
}

/**
 * Resizes an image to a maximum width while maintaining aspect ratio.
 * Optimizes for OCR processing by reducing file size.
 */
export async function resizeImage(file: File | Blob, maxWidth = 1200): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.src = objectUrl;
  
  await img.decode();
  
  // Use lower limits on mobile
  const isMobile = isMobileDevice();
  const effectiveMaxWidth = isMobile ? Math.min(maxWidth, 1000) : maxWidth;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Could not get canvas context');
  }
  
  // Calculate new dimensions
  let width = img.width;
  let height = img.height;
  if (width > effectiveMaxWidth) {
    height = Math.round((height * effectiveMaxWidth) / width);
    width = effectiveMaxWidth;
  }
  
  // Also limit height
  const maxHeight = isMobile ? 1400 : 1800;
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  
  // Clean up object URL immediately
  URL.revokeObjectURL(objectUrl);
  
  // Convert to a smaller Blob with appropriate quality
  const quality = isMobile ? 0.7 : 0.8;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Clean up canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 1;
        canvas.height = 1;
        
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/jpeg',
      quality
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

/**
 * Detects document edges and returns corner points for perspective correction.
 * Uses edge detection and contour finding heuristics.
 */
export async function detectDocumentCorners(
  imageDataUrl: string
): Promise<{ topLeft: { x: number; y: number }; topRight: { x: number; y: number }; bottomLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Process at reduced size for performance
      const maxSize = 400;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Convert to grayscale
      const gray: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Apply Sobel edge detection
      const edges: number[] = new Array(width * height).fill(0);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          
          // Sobel X
          const gx = 
            -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
            -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
            -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];
          
          // Sobel Y
          const gy = 
            -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
            gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];
          
          edges[idx] = Math.sqrt(gx * gx + gy * gy);
        }
      }

      // Find edge threshold
      const sortedEdges = [...edges].sort((a, b) => b - a);
      const threshold = sortedEdges[Math.floor(sortedEdges.length * 0.1)] || 50;

      // Find corner candidates by scanning quadrants
      const margin = Math.floor(Math.min(width, height) * 0.05);
      const searchSize = Math.floor(Math.min(width, height) * 0.3);

      const findCornerInRegion = (startX: number, startY: number, endX: number, endY: number): { x: number; y: number } | null => {
        let bestScore = 0;
        let bestPoint: { x: number; y: number } | null = null;
        
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = y * width + x;
            if (edges[idx] > threshold) {
              // Score based on edge strength and proximity to corner
              const cornerDist = Math.sqrt(
                Math.pow(x - (startX + endX) / 2, 2) + 
                Math.pow(y - (startY + endY) / 2, 2)
              );
              const score = edges[idx] / (1 + cornerDist * 0.1);
              if (score > bestScore) {
                bestScore = score;
                bestPoint = { x: x / scale, y: y / scale };
              }
            }
          }
        }
        return bestPoint;
      };

      // Search for corners in each quadrant
      const topLeft = findCornerInRegion(margin, margin, searchSize, searchSize);
      const topRight = findCornerInRegion(width - searchSize, margin, width - margin, searchSize);
      const bottomLeft = findCornerInRegion(margin, height - searchSize, searchSize, height - margin);
      const bottomRight = findCornerInRegion(width - searchSize, height - searchSize, width - margin, height - margin);

      // If we found all corners, return them; otherwise return null
      if (topLeft && topRight && bottomLeft && bottomRight) {
        resolve({ topLeft, topRight, bottomLeft, bottomRight });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

/**
 * Applies perspective correction to an image given four corner points.
 * Returns the corrected image as a data URL.
 */
export async function applyPerspectiveCorrection(
  imageDataUrl: string,
  corners: { topLeft: { x: number; y: number }; topRight: { x: number; y: number }; bottomLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate output dimensions based on detected corners
      const topWidth = Math.sqrt(
        Math.pow(corners.topRight.x - corners.topLeft.x, 2) + 
        Math.pow(corners.topRight.y - corners.topLeft.y, 2)
      );
      const bottomWidth = Math.sqrt(
        Math.pow(corners.bottomRight.x - corners.bottomLeft.x, 2) + 
        Math.pow(corners.bottomRight.y - corners.bottomLeft.y, 2)
      );
      const leftHeight = Math.sqrt(
        Math.pow(corners.bottomLeft.x - corners.topLeft.x, 2) + 
        Math.pow(corners.bottomLeft.y - corners.topLeft.y, 2)
      );
      const rightHeight = Math.sqrt(
        Math.pow(corners.bottomRight.x - corners.topRight.x, 2) + 
        Math.pow(corners.bottomRight.y - corners.topRight.y, 2)
      );

      const outputWidth = Math.round(Math.max(topWidth, bottomWidth));
      const outputHeight = Math.round(Math.max(leftHeight, rightHeight));

      // Create output canvas
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use bilinear interpolation for perspective transform
      const srcPoints = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
      const dstPoints = [
        { x: 0, y: 0 },
        { x: outputWidth, y: 0 },
        { x: outputWidth, y: outputHeight },
        { x: 0, y: outputHeight }
      ];

      // Create temporary canvas for source image
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) {
        reject(new Error('Could not get source canvas context'));
        return;
      }
      srcCtx.drawImage(img, 0, 0);
      const srcImageData = srcCtx.getImageData(0, 0, img.width, img.height);
      const srcData = srcImageData.data;

      // Create output image data
      const outputImageData = ctx.createImageData(outputWidth, outputHeight);
      const outData = outputImageData.data;

      // For each output pixel, find corresponding source pixel using inverse bilinear interpolation
      for (let y = 0; y < outputHeight; y++) {
        for (let x = 0; x < outputWidth; x++) {
          // Normalized coordinates in output
          const u = x / outputWidth;
          const v = y / outputHeight;

          // Bilinear interpolation of source coordinates
          const srcX = 
            (1 - u) * (1 - v) * srcPoints[0].x +
            u * (1 - v) * srcPoints[1].x +
            u * v * srcPoints[2].x +
            (1 - u) * v * srcPoints[3].x;
          const srcY = 
            (1 - u) * (1 - v) * srcPoints[0].y +
            u * (1 - v) * srcPoints[1].y +
            u * v * srcPoints[2].y +
            (1 - u) * v * srcPoints[3].y;

          // Sample source pixel with bounds checking
          const sx = Math.floor(srcX);
          const sy = Math.floor(srcY);
          
          if (sx >= 0 && sx < img.width && sy >= 0 && sy < img.height) {
            const srcIdx = (sy * img.width + sx) * 4;
            const outIdx = (y * outputWidth + x) * 4;
            outData[outIdx] = srcData[srcIdx];
            outData[outIdx + 1] = srcData[srcIdx + 1];
            outData[outIdx + 2] = srcData[srcIdx + 2];
            outData[outIdx + 3] = srcData[srcIdx + 3];
          }
        }
      }

      ctx.putImageData(outputImageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Auto-crops an image by detecting and removing uniform borders.
 * Returns the cropped image as a data URL.
 */
export async function autoCropImage(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Detect content bounds by finding non-background pixels
      // Calculate average edge color as background reference
      let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
      
      // Sample edges
      for (let x = 0; x < width; x++) {
        const topIdx = x * 4;
        const bottomIdx = ((height - 1) * width + x) * 4;
        bgR += data[topIdx] + data[bottomIdx];
        bgG += data[topIdx + 1] + data[bottomIdx + 1];
        bgB += data[topIdx + 2] + data[bottomIdx + 2];
        bgCount += 2;
      }
      for (let y = 0; y < height; y++) {
        const leftIdx = (y * width) * 4;
        const rightIdx = (y * width + width - 1) * 4;
        bgR += data[leftIdx] + data[rightIdx];
        bgG += data[leftIdx + 1] + data[rightIdx + 1];
        bgB += data[leftIdx + 2] + data[rightIdx + 2];
        bgCount += 2;
      }
      
      bgR = Math.round(bgR / bgCount);
      bgG = Math.round(bgG / bgCount);
      bgB = Math.round(bgB / bgCount);

      const colorThreshold = 30; // Tolerance for background detection
      
      const isBackground = (idx: number): boolean => {
        return (
          Math.abs(data[idx] - bgR) < colorThreshold &&
          Math.abs(data[idx + 1] - bgG) < colorThreshold &&
          Math.abs(data[idx + 2] - bgB) < colorThreshold
        );
      };

      // Find content bounds
      let minX = width, maxX = 0, minY = height, maxY = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (!isBackground(idx)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // Add small padding
      const padding = Math.floor(Math.min(width, height) * 0.02);
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(width - 1, maxX + padding);
      maxY = Math.min(height - 1, maxY + padding);

      // Check if cropping is worthwhile (at least 5% reduction on any side)
      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      const significantCrop = 
        minX > width * 0.05 || 
        minY > height * 0.05 || 
        (width - maxX) > width * 0.05 || 
        (height - maxY) > height * 0.05;

      if (!significantCrop || cropWidth < width * 0.5 || cropHeight < height * 0.5) {
        // Not enough to crop or would crop too much
        resolve(imageDataUrl);
        return;
      }

      // Create cropped canvas
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      
      if (!croppedCtx) {
        resolve(imageDataUrl);
        return;
      }

      croppedCtx.drawImage(
        canvas,
        minX, minY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      resolve(croppedCanvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Applies a photocopy-style filter to remove shadows and increase contrast.
 * Makes the image look like a clean scanned document.
 */
export async function applyPhotocopyFilter(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate local adaptive thresholding parameters
      // First pass: convert to grayscale and calculate statistics
      const gray: number[] = [];
      let totalGray = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray.push(g);
        totalGray += g;
      }
      
      const avgGray = totalGray / gray.length;
      
      // Calculate standard deviation
      let variance = 0;
      for (let i = 0; i < gray.length; i++) {
        variance += Math.pow(gray[i] - avgGray, 2);
      }
      const stdDev = Math.sqrt(variance / gray.length);

      // Determine thresholds based on image characteristics
      // Higher threshold for darker images, lower for lighter
      const lowThreshold = Math.max(0, avgGray - stdDev * 1.2);
      const highThreshold = Math.min(255, avgGray + stdDev * 0.8);

      // Second pass: apply contrast enhancement and shadow removal
      for (let i = 0; i < data.length; i += 4) {
        const grayValue = gray[i / 4];
        
        // Apply sigmoid-like curve for contrast enhancement
        let enhanced: number;
        
        if (grayValue < lowThreshold) {
          // Dark areas (likely text/content) - make darker
          enhanced = Math.pow(grayValue / lowThreshold, 1.5) * 60;
        } else if (grayValue > highThreshold) {
          // Light areas (background/shadows) - push to white
          enhanced = 230 + ((grayValue - highThreshold) / (255 - highThreshold)) * 25;
        } else {
          // Mid-tones - stretch contrast
          const normalized = (grayValue - lowThreshold) / (highThreshold - lowThreshold);
          enhanced = 60 + normalized * 170;
        }
        
        enhanced = Math.max(0, Math.min(255, enhanced));
        
        // Apply slight warming for paper-like look
        data[i] = Math.min(255, enhanced + 3);     // R - slightly warmer
        data[i + 1] = Math.min(255, enhanced + 1); // G
        data[i + 2] = enhanced;                     // B
        data[i + 3] = 255;                          // A
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Enhances image for OCR by applying auto-cropping and perspective correction.
 * Returns enhanced image data URL and enhancement info.
 */
export async function enhanceImageForOCR(
  imageDataUrl: string
): Promise<{ enhancedDataUrl: string; wasEnhanced: boolean; enhancements: string[] }> {
  const enhancements: string[] = [];
  let currentImage = imageDataUrl;

  try {
    // Step 1: Detect and apply perspective correction
    const corners = await detectDocumentCorners(currentImage);
    if (corners) {
      // Check if perspective correction is needed (corners are significantly skewed)
      const skewThreshold = 0.05; // 5% of image dimension
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = currentImage;
      });
      
      const width = img.width;
      const height = img.height;
      
      const topSkew = Math.abs(corners.topLeft.y - corners.topRight.y) / height;
      const bottomSkew = Math.abs(corners.bottomLeft.y - corners.bottomRight.y) / height;
      const leftSkew = Math.abs(corners.topLeft.x - corners.bottomLeft.x) / width;
      const rightSkew = Math.abs(corners.topRight.x - corners.bottomRight.x) / width;
      
      if (topSkew > skewThreshold || bottomSkew > skewThreshold || leftSkew > skewThreshold || rightSkew > skewThreshold) {
        currentImage = await applyPerspectiveCorrection(currentImage, corners);
        enhancements.push('perspective');
      }
    }

    // Step 2: Auto-crop
    const croppedImage = await autoCropImage(currentImage);
    if (croppedImage !== currentImage) {
      currentImage = croppedImage;
      enhancements.push('autocrop');
    }

    return {
      enhancedDataUrl: currentImage,
      wasEnhanced: enhancements.length > 0,
      enhancements
    };
  } catch (error) {
    console.error('Image enhancement error:', error);
    return {
      enhancedDataUrl: imageDataUrl,
      wasEnhanced: false,
      enhancements: []
    };
  }
}
