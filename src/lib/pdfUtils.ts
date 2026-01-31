import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite handles the ?url suffix for static asset import
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker using Vite's ?url import suffix
// This ensures the worker is properly bundled and versioned
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

console.log("[pdfUtils] PDF.js version:", pdfjsLib.version);
console.log("[pdfUtils] Worker source:", pdfWorkerUrl);

/**
 * Convert a PDF file to an array of image data URLs (one per page)
 * @param file - The PDF file to convert
 * @param scale - Rendering scale (default 2 for good quality)
 * @param onProgress - Optional callback for progress updates
 */
export async function pdfToImages(
  file: File, 
  scale: number = 2,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  console.log(`[pdfToImages] Starting conversion for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error("Invalid or empty PDF file");
    }
    
    // Check file size - warn for large files
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 50) {
      console.warn(`[pdfToImages] Large file detected: ${fileSizeMB.toFixed(2)} MB - processing may be slow`);
    }
    
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[pdfToImages] ArrayBuffer created, size: ${arrayBuffer.byteLength} bytes`);

    // Create loading task with robust options
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      // Disable features that can cause worker issues
      disableFontFace: true,
      useSystemFonts: true,
      // Disable autoFetch to prevent CORS issues
      disableAutoFetch: true,
      // Disable streaming to ensure full document loads
      disableStream: true,
    });
    
    let pdf;
    try {
      pdf = await loadingTask.promise;
    } catch (loadError: any) {
      console.error("[pdfToImages] PDF loading failed:", loadError);
      
      // Provide specific error messages for common issues
      if (loadError.message?.includes("Invalid PDF") || loadError.name === "InvalidPDFException") {
        throw new Error("Invalid PDF file - the file may be corrupted or not a valid PDF");
      }
      if (loadError.name === "PasswordException" || loadError.message?.includes("password")) {
        throw new Error("This PDF is password-protected and cannot be processed");
      }
      if (loadError.message?.includes("worker") || loadError.message?.includes("Worker")) {
        throw new Error("PDF processing failed - please refresh the page and try again");
      }
      if (loadError.message?.includes("network") || loadError.message?.includes("fetch")) {
        throw new Error("Network error loading PDF - please check your connection");
      }
      
      throw new Error(`Failed to load PDF: ${loadError?.message || "Unknown error"}`);
    }
    
    console.log(`[pdfToImages] PDF loaded successfully, pages: ${pdf.numPages}`);

    const images: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        onProgress?.(pageNum, pdf.numPages);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Check for very large pages that might cause memory issues
        const pixelCount = viewport.width * viewport.height;
        const adjustedScale = pixelCount > 16000000 ? scale * 0.5 : scale; // Reduce for >16MP
        const finalViewport = adjustedScale !== scale ? page.getViewport({ scale: adjustedScale }) : viewport;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not get canvas context");

        canvas.width = finalViewport.width;
        canvas.height = finalViewport.height;

        await page.render({
          canvasContext: context,
          viewport: finalViewport,
        }).promise;

        // Convert to JPEG for smaller file size
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        images.push(dataUrl);
        
        console.log(`[pdfToImages] Page ${pageNum}/${pdf.numPages} converted (${Math.round(finalViewport.width)}x${Math.round(finalViewport.height)})`);
        
        // Clean up to free memory
        canvas.width = 0;
        canvas.height = 0;
      } catch (pageError: any) {
        console.error(`[pdfToImages] Error on page ${pageNum}:`, pageError);
        // Add a placeholder for failed pages instead of stopping entirely
        images.push("");
      }
    }

    // Filter out empty placeholders
    const validImages = images.filter(img => img.length > 0);
    console.log(`[pdfToImages] Conversion complete: ${validImages.length}/${pdf.numPages} pages`);
    
    if (validImages.length === 0) {
      throw new Error("No pages could be converted from the PDF");
    }

    return validImages;
  } catch (error: any) {
    console.error("[pdfToImages] PDF conversion failed:", error);
    
    // Provide more specific error messages
    if (error.message?.includes("Invalid PDF")) {
      throw new Error("Invalid PDF file - the file may be corrupted or password-protected");
    } else if (error.message?.includes("worker")) {
      throw new Error("PDF processing failed - please try refreshing the page");
    } else if (error.name === "PasswordException") {
      throw new Error("This PDF is password-protected and cannot be processed");
    }
    
    throw new Error(`Failed to convert PDF: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
