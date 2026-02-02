/**
 * SVG Validation Utilities (Phase 9 - P9.6)
 * 
 * Pre-generation validation to catch rendering errors before teachers see them.
 * This is CRITICAL for the "can't make mistakes" requirement.
 */

export interface SVGValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates an SVG string for common issues
 * P9.6: Pre-generation validation (CRITICAL)
 * 
 * Checks:
 * 1. Valid XML structure
 * 2. Non-zero dimensions
 * 3. Contains expected elements (polygon, circle, path, line, etc.)
 * 4. Minimum content length
 * 5. No script tags (security)
 */
export function validateSVG(svgData: string): SVGValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Minimum length (empty or trivial SVGs)
  if (!svgData || svgData.trim().length < 100) {
    errors.push("SVG content too short (< 100 chars)");
    return { isValid: false, errors, warnings };
  }

  // Check 2: Must start with <svg and end with </svg>
  const trimmed = svgData.trim();
  if (!trimmed.startsWith("<svg")) {
    errors.push("SVG must start with <svg tag");
  }
  if (!trimmed.endsWith("</svg>")) {
    errors.push("SVG must end with </svg> tag");
  }

  // Check 3: Must have viewBox or width/height
  const hasViewBox = /viewBox\s*=\s*["'][^"']+["']/.test(svgData);
  const hasWidth = /width\s*=\s*["']?\d+/.test(svgData);
  const hasHeight = /height\s*=\s*["']?\d+/.test(svgData);
  
  if (!hasViewBox && !(hasWidth && hasHeight)) {
    errors.push("SVG missing viewBox or width/height attributes");
  }

  // Check 4: Must contain at least one shape element
  const shapeElements = [
    /<polygon\s/,
    /<circle\s/,
    /<ellipse\s/,
    /<path\s/,
    /<line\s/,
    /<rect\s/,
    /<polyline\s/,
  ];
  
  const hasShape = shapeElements.some(regex => regex.test(svgData));
  if (!hasShape) {
    errors.push("SVG contains no shape elements (polygon, circle, path, line, rect)");
  }

  // Check 5: Security - no script tags
  if (/<script/i.test(svgData)) {
    errors.push("SVG contains <script> tag (security violation)");
  }

  // Check 6: Security - no javascript: URLs
  if (/javascript:/i.test(svgData)) {
    errors.push("SVG contains javascript: URL (security violation)");
  }

  // Check 7: Warn if viewBox has zero dimensions
  const viewBoxMatch = svgData.match(/viewBox\s*=\s*["']([^"']+)["']/);
  if (viewBoxMatch) {
    const [, , , width, height] = viewBoxMatch[1].split(/\s+/).map(Number);
    if (width === 0 || height === 0) {
      warnings.push("ViewBox has zero width or height");
    }
  }

  // Check 8: Warn if no text elements (labels might be missing)
  if (!/<text\s/.test(svgData)) {
    warnings.push("SVG contains no text elements (labels may be missing)");
  }

  // Check 9: Basic XML validity - matching tags
  try {
    const openTags = (svgData.match(/<(\w+)[\s>]/g) || []).length;
    const closeTags = (svgData.match(/<\/(\w+)>/g) || []).length;
    const selfClosing = (svgData.match(/\/>/g) || []).length;
    
    // Open tags should roughly equal close tags + self-closing
    // Allow some tolerance for attributes
    if (Math.abs(openTags - (closeTags + selfClosing)) > 5) {
      warnings.push("Possible XML structure issue (unmatched tags)");
    }
  } catch (e) {
    warnings.push("Could not validate XML structure");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a data URL containing an SVG
 * Extracts the SVG content and validates it
 */
export function validateSVGDataURL(dataUrl: string): SVGValidationResult {
  if (!dataUrl || !dataUrl.startsWith("data:image/svg+xml")) {
    return {
      isValid: false,
      errors: ["Not a valid SVG data URL"],
      warnings: [],
    };
  }

  try {
    // Extract SVG content from data URL
    let svgContent: string;
    
    if (dataUrl.includes("base64,")) {
      // Base64 encoded
      const base64 = dataUrl.split("base64,")[1];
      svgContent = atob(base64);
    } else {
      // URL encoded
      svgContent = decodeURIComponent(dataUrl.split(",")[1]);
    }

    return validateSVG(svgContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      errors: [`Failed to decode SVG data URL: ${errorMessage}`],
      warnings: [],
    };
  }
}

/**
 * Sanitizes an SVG by removing potentially dangerous elements
 * This is a lightweight sanitization - for production, consider using DOMPurify
 */
export function sanitizeSVG(svgData: string): string {
  let sanitized = svgData;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:[^"']*/gi, "");

  return sanitized;
}
