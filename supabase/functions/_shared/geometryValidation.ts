/**
 * Geometry Validation Module (Deno/Edge Functions Version)
 * 
 * Deno-compatible version of geometryValidation.ts for Supabase Edge Functions
 * 
 * @module geometryValidation
 * @version 1.0.0
 */

import {
  GeometryMetadata,
  GeometryVertex,
  GeometryShapeType,
  GeometryValidationResult,
  GeometryErrorCode,
  GeometryParseError,
  hasAlgebraicCoordinates,
  areVerticesOverlapping,
  isValidGeometryShapeType,
} from './geometryTypes.ts';

// Validation constants
export const DEFAULT_COORDINATE_BOUNDS = { min: -10, max: 10 };
export const EXTENDED_COORDINATE_BOUNDS = { min: -50, max: 50 };
export const MIN_VERTEX_DISTANCE = 0.1;

// Shape validation rules
const SHAPE_VALIDATION_RULES: Record<string, {
  requiredVertices?: number;
  minVertices?: number;
  maxVertices?: number;
  requiredFields?: string[];
}> = {
  'triangle': { requiredVertices: 3, requiredFields: ['vertices'] },
  'quadrilateral': { requiredVertices: 4, requiredFields: ['vertices'] },
  'coordinate_polygon': { minVertices: 2, requiredFields: ['vertices', 'axes'] },
  'circle': { requiredFields: ['circle'] },
  'circle_chord': { requiredFields: ['circle'] },
  'circle_tangent': { requiredFields: ['circle'] },
  'number_line': { requiredFields: ['numberLine'] },
  'rotation': { requiredFields: ['transformation'] },
  'reflection': { requiredFields: ['transformation'] },
  'translation': { requiredFields: ['transformation'] },
  'dilation': { requiredFields: ['transformation'] },
  'angle_diagram': { requiredFields: ['angle'] },
};

/**
 * Main validation function
 */
export function validateGeometryMetadata(
  geometry: GeometryMetadata,
  options: {
    useExtendedBounds?: boolean;
    strictMode?: boolean;
  } = {}
): GeometryValidationResult {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  // Validate shape type
  if (!geometry.type) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Geometry type is required',
      field: 'type',
    });
    return { isValid: false, errors, warnings };
  }

  if (!isValidGeometryShapeType(geometry.type)) {
    errors.push({
      code: GeometryErrorCode.INVALID_SHAPE_TYPE,
      message: `Invalid geometry type: ${geometry.type}`,
      field: 'type',
    });
    return { isValid: false, errors, warnings };
  }

  // Validate required fields
  const validationRules = SHAPE_VALIDATION_RULES[geometry.type] || {};
  if (validationRules.requiredFields) {
    for (const field of validationRules.requiredFields) {
      if (!(geometry as any)[field]) {
        errors.push({
          code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
          message: `Required field '${field}' is missing for ${geometry.type}`,
          field: field,
        });
      }
    }
  }

  // Validate vertices
  if (geometry.vertices) {
    const vertexErrors = validateVertices(geometry.vertices, geometry.type, validationRules, options);
    errors.push(...vertexErrors.errors);
    warnings.push(...vertexErrors.warnings);
  }

  // Validate axes
  if (geometry.axes) {
    const axesErrors = validateAxes(geometry.axes);
    errors.push(...axesErrors.errors);
    warnings.push(...axesErrors.warnings);
  }

  // Validate circle
  if (geometry.circle) {
    const circleErrors = validateCircleProperties(geometry.circle, options);
    errors.push(...circleErrors.errors);
    warnings.push(...circleErrors.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateVertices(
  vertices: GeometryVertex[],
  shapeType: GeometryShapeType,
  validationRules: any,
  options: { useExtendedBounds?: boolean; strictMode?: boolean }
): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  // Check vertex count
  if (validationRules.requiredVertices !== undefined) {
    if (vertices.length !== validationRules.requiredVertices) {
      errors.push({
        code: GeometryErrorCode.INSUFFICIENT_VERTICES,
        message: `${shapeType} requires exactly ${validationRules.requiredVertices} vertices, got ${vertices.length}`,
        field: 'vertices',
      });
    }
  } else if (validationRules.minVertices !== undefined) {
    if (vertices.length < validationRules.minVertices) {
      errors.push({
        code: GeometryErrorCode.INSUFFICIENT_VERTICES,
        message: `${shapeType} requires at least ${validationRules.minVertices} vertices, got ${vertices.length}`,
        field: 'vertices',
      });
    }
  }

  // Check for algebraic coordinates
  if (hasAlgebraicCoordinates(vertices)) {
    errors.push({
      code: GeometryErrorCode.ALGEBRAIC_COORDINATES,
      message: 'Vertices contain algebraic/non-numeric coordinates',
      field: 'vertices',
    });
    return { errors, warnings };
  }

  const bounds = options.useExtendedBounds ? EXTENDED_COORDINATE_BOUNDS : DEFAULT_COORDINATE_BOUNDS;
  const seenLabels = new Set<string>();

  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];

    // Check label
    if (!vertex.label || vertex.label.trim() === '') {
      errors.push({
        code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
        message: `Vertex at index ${i} is missing a label`,
        field: `vertices[${i}].label`,
      });
    } else {
      if (seenLabels.has(vertex.label)) {
        errors.push({
          code: GeometryErrorCode.DUPLICATE_VERTEX_LABELS,
          message: `Duplicate vertex label: '${vertex.label}'`,
          field: `vertices[${i}].label`,
        });
      }
      seenLabels.add(vertex.label);
    }

    // Check coordinates
    if (!Number.isFinite(vertex.x)) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: `Vertex '${vertex.label}' has invalid x-coordinate: ${vertex.x}`,
        field: `vertices[${i}].x`,
      });
    }

    if (!Number.isFinite(vertex.y)) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: `Vertex '${vertex.label}' has invalid y-coordinate: ${vertex.y}`,
        field: `vertices[${i}].y`,
      });
    }

    // Check bounds
    if (Number.isFinite(vertex.x) && (vertex.x < bounds.min || vertex.x > bounds.max)) {
      if (options.strictMode) {
        errors.push({
          code: GeometryErrorCode.COORDINATES_OUT_OF_BOUNDS,
          message: `Vertex '${vertex.label}' x-coordinate ${vertex.x} is out of bounds [${bounds.min}, ${bounds.max}]`,
          field: `vertices[${i}].x`,
        });
      } else {
        warnings.push({
          message: `Vertex '${vertex.label}' x-coordinate ${vertex.x} is outside typical range`,
          field: `vertices[${i}].x`,
        });
      }
    }

    if (Number.isFinite(vertex.y) && (vertex.y < bounds.min || vertex.y > bounds.max)) {
      if (options.strictMode) {
        errors.push({
          code: GeometryErrorCode.COORDINATES_OUT_OF_BOUNDS,
          message: `Vertex '${vertex.label}' y-coordinate ${vertex.y} is out of bounds [${bounds.min}, ${bounds.max}]`,
          field: `vertices[${i}].y`,
        });
      } else {
        warnings.push({
          message: `Vertex '${vertex.label}' y-coordinate ${vertex.y} is outside typical range`,
          field: `vertices[${i}].y`,
        });
      }
    }

    // Check overlapping
    for (let j = i + 1; j < vertices.length; j++) {
      const otherVertex = vertices[j];
      if (
        Number.isFinite(vertex.x) && Number.isFinite(vertex.y) &&
        Number.isFinite(otherVertex.x) && Number.isFinite(otherVertex.y) &&
        areVerticesOverlapping(vertex, otherVertex, MIN_VERTEX_DISTANCE)
      ) {
        errors.push({
          code: GeometryErrorCode.OVERLAPPING_VERTICES,
          message: `Vertices '${vertex.label}' and '${otherVertex.label}' are too close`,
          field: 'vertices',
        });
      }
    }
  }

  return { errors, warnings };
}

function validateAxes(axes: any): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!axes) return { errors, warnings };

  if (!Number.isFinite(axes.minX)) {
    errors.push({ code: GeometryErrorCode.INVALID_COORDINATES, message: 'axes.minX must be finite', field: 'axes.minX' });
  }
  if (!Number.isFinite(axes.maxX)) {
    errors.push({ code: GeometryErrorCode.INVALID_COORDINATES, message: 'axes.maxX must be finite', field: 'axes.maxX' });
  }
  if (!Number.isFinite(axes.minY)) {
    errors.push({ code: GeometryErrorCode.INVALID_COORDINATES, message: 'axes.minY must be finite', field: 'axes.minY' });
  }
  if (!Number.isFinite(axes.maxY)) {
    errors.push({ code: GeometryErrorCode.INVALID_COORDINATES, message: 'axes.maxY must be finite', field: 'axes.maxY' });
  }

  if (Number.isFinite(axes.minX) && Number.isFinite(axes.maxX) && axes.minX >= axes.maxX) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: `axes.minX must be less than axes.maxX`,
      field: 'axes',
    });
  }

  if (Number.isFinite(axes.minY) && Number.isFinite(axes.maxY) && axes.minY >= axes.maxY) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: `axes.minY must be less than axes.maxY`,
      field: 'axes',
    });
  }

  return { errors, warnings };
}

function validateCircleProperties(circle: any, options: any): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!circle) return { errors, warnings };

  if (!circle.center) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Circle center is required',
      field: 'circle.center',
    });
  } else {
    if (!Number.isFinite(circle.center.x)) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Circle center x must be finite',
        field: 'circle.center.x',
      });
    }
    if (!Number.isFinite(circle.center.y)) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Circle center y must be finite',
        field: 'circle.center.y',
      });
    }
  }

  if (!Number.isFinite(circle.radius) || circle.radius <= 0) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'Circle radius must be positive',
      field: 'circle.radius',
    });
  }

  return { errors, warnings };
}

/**
 * Quick validation check
 */
export function isValidGeometry(geometry: GeometryMetadata, options?: any): boolean {
  const result = validateGeometryMetadata(geometry, options);
  return result.isValid;
}

/**
 * Validate and throw on error
 */
export function validateOrThrow(geometry: GeometryMetadata, options?: any): void {
  const result = validateGeometryMetadata(geometry, options);
  if (!result.isValid) {
    const firstError = result.errors[0];
    throw new GeometryParseError(firstError.code, firstError.message, {
      field: firstError.field,
      allErrors: result.errors,
      warnings: result.warnings,
    });
  }
}
