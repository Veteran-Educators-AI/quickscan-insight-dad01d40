import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker - use the worker from public directory
// This avoids Vite bundling issues with dynamic imports
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * Convert a PDF file to an array of image data URLs (one per page)
 */
export async function pdfToImages(file: File, scale: number = 2): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const images: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not get canvas context");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert to JPEG for smaller file size
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      images.push(dataUrl);
    }

    return images;
  } catch (error: any) {
    throw new Error(`Failed to convert PDF: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
