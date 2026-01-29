/**
 * Geometry Validation Module
 * 
 * Provides comprehensive validation for GeometryMetadata to catch errors
 * at generation time, not render time. Implements all validation rules
 * from Phase 1, Task P1.4.
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
  SHAPE_VALIDATION_RULES,
  hasAlgebraicCoordinates,
  areVerticesOverlapping,
  isValidGeometryShapeType,
} from './geometryTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default coordinate bounds for standard Regents questions
 */
export const DEFAULT_COORDINATE_BOUNDS = {
  min: -10,
  max: 10,
};

/**
 * Extended coordinate bounds for advanced questions
 */
export const EXTENDED_COORDINATE_BOUNDS = {
  min: -50,
  max: 50,
};

/**
 * Minimum distance between vertices to avoid overlapping
 */
export const MIN_VERTEX_DISTANCE = 0.1;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates GeometryMetadata according to all Phase 1 rules
 * 
 * Validation rules:
 * 1. Coordinates must be numeric and within reasonable bounds
 * 2. No duplicate vertex labels within same shape
 * 3. Correct number of vertices for shape type (triangle=3, quad=4, etc.)
 * 4. No algebraic coordinates like (a, b) - must be numeric
 * 5. No overlapping vertices (distance > 0.1 units)
 * 6. Required fields present for shape type
 * 
 * @param geometry - The geometry metadata to validate
 * @param options - Validation options
 * @returns Validation result with errors and warnings
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 1: Validate shape type
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (!geometry.type) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Geometry type is required',
      field: 'type',
    });
    // Cannot continue validation without type
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 2: Validate required fields for shape type
  // ─────────────────────────────────────────────────────────────────────────────
  
  const validationRules = SHAPE_VALIDATION_RULES[geometry.type];
  if (validationRules.requiredFields) {
    for (const field of validationRules.requiredFields) {
      if (!geometry[field]) {
        errors.push({
          code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
          message: `Required field '${field}' is missing for ${geometry.type}`,
          field: field as string,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 3: Validate vertices (if present)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (geometry.vertices) {
    const vertexErrors = validateVertices(
      geometry.vertices,
      geometry.type,
      validationRules,
      options
    );
    errors.push(...vertexErrors.errors);
    warnings.push(...vertexErrors.warnings);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 4: Validate axes (if present)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (geometry.axes) {
    const axesErrors = validateAxes(geometry.axes);
    errors.push(...axesErrors.errors);
    warnings.push(...axesErrors.warnings);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 5: Validate circle properties (if present)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (geometry.circle) {
    const circleErrors = validateCircleProperties(geometry.circle, options);
    errors.push(...circleErrors.errors);
    warnings.push(...circleErrors.warnings);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 6: Validate transformation properties (if present)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (geometry.transformation) {
    const transformErrors = validateTransformationProperties(
      geometry.transformation,
      geometry.type,
      options
    );
    errors.push(...transformErrors.errors);
    warnings.push(...transformErrors.warnings);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 7: Validate angle properties (if present)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (geometry.angle) {
    const angleErrors = validateAngleProperties(geometry.angle, options);
    errors.push(...angleErrors.errors);
    warnings.push(...angleErrors.warnings);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rule 8: Validate number line properties (if present)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (geometry.numberLine) {
    const numberLineErrors = validateNumberLineProperties(geometry.numberLine);
    errors.push(...numberLineErrors.errors);
    warnings.push(...numberLineErrors.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERTEX VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateVertices(
  vertices: GeometryVertex[],
  shapeType: GeometryShapeType,
  validationRules: typeof SHAPE_VALIDATION_RULES[GeometryShapeType],
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

  if (validationRules.maxVertices !== undefined) {
    if (vertices.length > validationRules.maxVertices) {
      warnings.push({
        message: `${shapeType} has more vertices than expected (${vertices.length} > ${validationRules.maxVertices})`,
        field: 'vertices',
      });
    }
  }

  // Check for algebraic coordinates
  if (hasAlgebraicCoordinates(vertices)) {
    errors.push({
      code: GeometryErrorCode.ALGEBRAIC_COORDINATES,
      message: 'Vertices contain algebraic/non-numeric coordinates. Structured geometry requires numeric coordinates only.',
      field: 'vertices',
    });
    // Cannot continue validation if coordinates are not numeric
    return { errors, warnings };
  }

  // Determine coordinate bounds
  const bounds = options.useExtendedBounds
    ? EXTENDED_COORDINATE_BOUNDS
    : DEFAULT_COORDINATE_BOUNDS;

  // Validate each vertex
  const seenLabels = new Set<string>();
  
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];

    // Check for valid label
    if (!vertex.label || vertex.label.trim() === '') {
      errors.push({
        code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
        message: `Vertex at index ${i} is missing a label`,
        field: `vertices[${i}].label`,
      });
    } else {
      // Check for duplicate labels
      if (seenLabels.has(vertex.label)) {
        errors.push({
          code: GeometryErrorCode.DUPLICATE_VERTEX_LABELS,
          message: `Duplicate vertex label: '${vertex.label}'`,
          field: `vertices[${i}].label`,
        });
      }
      seenLabels.add(vertex.label);
    }

    // Check coordinate validity
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

    // Check coordinate bounds
    if (Number.isFinite(vertex.x) && (vertex.x < bounds.min || vertex.x > bounds.max)) {
      if (options.strictMode) {
        errors.push({
          code: GeometryErrorCode.COORDINATES_OUT_OF_BOUNDS,
          message: `Vertex '${vertex.label}' x-coordinate ${vertex.x} is out of bounds [${bounds.min}, ${bounds.max}]`,
          field: `vertices[${i}].x`,
        });
      } else {
        warnings.push({
          message: `Vertex '${vertex.label}' x-coordinate ${vertex.x} is outside typical range [${bounds.min}, ${bounds.max}]`,
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
          message: `Vertex '${vertex.label}' y-coordinate ${vertex.y} is outside typical range [${bounds.min}, ${bounds.max}]`,
          field: `vertices[${i}].y`,
        });
      }
    }

    // Check for overlapping vertices
    for (let j = i + 1; j < vertices.length; j++) {
      const otherVertex = vertices[j];
      if (
        Number.isFinite(vertex.x) &&
        Number.isFinite(vertex.y) &&
        Number.isFinite(otherVertex.x) &&
        Number.isFinite(otherVertex.y) &&
        areVerticesOverlapping(vertex, otherVertex, MIN_VERTEX_DISTANCE)
      ) {
        errors.push({
          code: GeometryErrorCode.OVERLAPPING_VERTICES,
          message: `Vertices '${vertex.label}' and '${otherVertex.label}' are too close (overlapping)`,
          field: 'vertices',
        });
      }
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXES VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateAxes(
  axes: GeometryMetadata['axes']
): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!axes) return { errors, warnings };

  // Validate min/max values
  if (!Number.isFinite(axes.minX)) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'axes.minX must be a finite number',
      field: 'axes.minX',
    });
  }

  if (!Number.isFinite(axes.maxX)) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'axes.maxX must be a finite number',
      field: 'axes.maxX',
    });
  }

  if (!Number.isFinite(axes.minY)) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'axes.minY must be a finite number',
      field: 'axes.minY',
    });
  }

  if (!Number.isFinite(axes.maxY)) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'axes.maxY must be a finite number',
      field: 'axes.maxY',
    });
  }

  // Check logical consistency
  if (Number.isFinite(axes.minX) && Number.isFinite(axes.maxX) && axes.minX >= axes.maxX) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: `axes.minX (${axes.minX}) must be less than axes.maxX (${axes.maxX})`,
      field: 'axes',
    });
  }

  if (Number.isFinite(axes.minY) && Number.isFinite(axes.maxY) && axes.minY >= axes.maxY) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: `axes.minY (${axes.minY}) must be less than axes.maxY (${axes.maxY})`,
      field: 'axes',
    });
  }

  // Validate tick step if present
  if (axes.tickStep !== undefined) {
    if (!Number.isFinite(axes.tickStep) || axes.tickStep <= 0) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'axes.tickStep must be a positive number',
        field: 'axes.tickStep',
      });
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCLE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateCircleProperties(
  circle: GeometryMetadata['circle'],
  options: { useExtendedBounds?: boolean }
): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!circle) return { errors, warnings };

  // Validate center
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
        message: 'Circle center x-coordinate must be a finite number',
        field: 'circle.center.x',
      });
    }

    if (!Number.isFinite(circle.center.y)) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Circle center y-coordinate must be a finite number',
        field: 'circle.center.y',
      });
    }
  }

  // Validate radius
  if (!Number.isFinite(circle.radius) || circle.radius <= 0) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'Circle radius must be a positive number',
      field: 'circle.radius',
    });
  }

  // Validate arc angles if present
  if (circle.arcAngles) {
    if (!Number.isFinite(circle.arcAngles.start) || circle.arcAngles.start < 0 || circle.arcAngles.start > 360) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Arc start angle must be between 0 and 360 degrees',
        field: 'circle.arcAngles.start',
      });
    }

    if (!Number.isFinite(circle.arcAngles.end) || circle.arcAngles.end < 0 || circle.arcAngles.end > 360) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Arc end angle must be between 0 and 360 degrees',
        field: 'circle.arcAngles.end',
      });
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORMATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateTransformationProperties(
  transformation: GeometryMetadata['transformation'],
  shapeType: GeometryShapeType,
  options: { useExtendedBounds?: boolean; strictMode?: boolean }
): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!transformation) return { errors, warnings };

  // Validate original and transformed vertices
  if (!transformation.originalVertices || transformation.originalVertices.length === 0) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Transformation requires original vertices',
      field: 'transformation.originalVertices',
    });
  }

  if (!transformation.transformedVertices || transformation.transformedVertices.length === 0) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Transformation requires transformed vertices',
      field: 'transformation.transformedVertices',
    });
  }

  // Vertex counts should match
  if (
    transformation.originalVertices &&
    transformation.transformedVertices &&
    transformation.originalVertices.length !== transformation.transformedVertices.length
  ) {
    errors.push({
      code: GeometryErrorCode.INSUFFICIENT_VERTICES,
      message: 'Original and transformed vertices must have the same count',
      field: 'transformation',
    });
  }

  // Validate type-specific properties
  if (shapeType === GeometryShapeType.ROTATION) {
    if (!transformation.rotationCenter) {
      errors.push({
        code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Rotation requires a rotation center',
        field: 'transformation.rotationCenter',
      });
    }

    if (transformation.rotationAngle === undefined) {
      warnings.push({
        message: 'Rotation angle not specified',
        field: 'transformation.rotationAngle',
      });
    } else if (!Number.isFinite(transformation.rotationAngle)) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Rotation angle must be a finite number',
        field: 'transformation.rotationAngle',
      });
    }
  }

  if (shapeType === GeometryShapeType.REFLECTION) {
    if (!transformation.reflectionLine) {
      errors.push({
        code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Reflection requires a line of reflection',
        field: 'transformation.reflectionLine',
      });
    }
  }

  if (shapeType === GeometryShapeType.TRANSLATION) {
    if (!transformation.translationVector) {
      errors.push({
        code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Translation requires a translation vector',
        field: 'transformation.translationVector',
      });
    }
  }

  if (shapeType === GeometryShapeType.DILATION) {
    if (transformation.scaleFactor === undefined) {
      errors.push({
        code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Dilation requires a scale factor',
        field: 'transformation.scaleFactor',
      });
    } else if (!Number.isFinite(transformation.scaleFactor) || transformation.scaleFactor <= 0) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Scale factor must be a positive number',
        field: 'transformation.scaleFactor',
      });
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANGLE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateAngleProperties(
  angle: GeometryMetadata['angle'],
  options: { useExtendedBounds?: boolean }
): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!angle) return { errors, warnings };

  // Validate required vertices
  if (!angle.vertex) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Angle requires a vertex',
      field: 'angle.vertex',
    });
  }

  if (!angle.ray1End) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Angle requires ray1End',
      field: 'angle.ray1End',
    });
  }

  if (!angle.ray2End) {
    errors.push({
      code: GeometryErrorCode.MISSING_REQUIRED_FIELD,
      message: 'Angle requires ray2End',
      field: 'angle.ray2End',
    });
  }

  // Validate angle measure if present
  if (angle.measure !== undefined) {
    if (!Number.isFinite(angle.measure) || angle.measure < 0 || angle.measure > 360) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Angle measure must be between 0 and 360 degrees',
        field: 'angle.measure',
      });
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER LINE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateNumberLineProperties(
  numberLine: GeometryMetadata['numberLine']
): Pick<GeometryValidationResult, 'errors' | 'warnings'> {
  const errors: GeometryValidationResult['errors'] = [];
  const warnings: GeometryValidationResult['warnings'] = [];

  if (!numberLine) return { errors, warnings };

  // Validate min/max
  if (!Number.isFinite(numberLine.min)) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'Number line min must be a finite number',
      field: 'numberLine.min',
    });
  }

  if (!Number.isFinite(numberLine.max)) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: 'Number line max must be a finite number',
      field: 'numberLine.max',
    });
  }

  if (Number.isFinite(numberLine.min) && Number.isFinite(numberLine.max) && numberLine.min >= numberLine.max) {
    errors.push({
      code: GeometryErrorCode.INVALID_COORDINATES,
      message: `Number line min (${numberLine.min}) must be less than max (${numberLine.max})`,
      field: 'numberLine',
    });
  }

  // Validate tick interval if present
  if (numberLine.tickInterval !== undefined) {
    if (!Number.isFinite(numberLine.tickInterval) || numberLine.tickInterval <= 0) {
      errors.push({
        code: GeometryErrorCode.INVALID_COORDINATES,
        message: 'Tick interval must be a positive number',
        field: 'numberLine.tickInterval',
      });
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Throws a GeometryParseError if validation fails
 * Useful for fail-fast validation in critical paths
 */
export function validateOrThrow(
  geometry: GeometryMetadata,
  options?: Parameters<typeof validateGeometryMetadata>[1]
): void {
  const result = validateGeometryMetadata(geometry, options);
  
  if (!result.isValid) {
    const firstError = result.errors[0];
    throw new GeometryParseError(
      firstError.code,
      firstError.message,
      {
        field: firstError.field,
        allErrors: result.errors,
        warnings: result.warnings,
      }
    );
  }
}

/**
 * Quick validation check - returns true if valid, false otherwise
 */
export function isValidGeometry(
  geometry: GeometryMetadata,
  options?: Parameters<typeof validateGeometryMetadata>[1]
): boolean {
  const result = validateGeometryMetadata(geometry, options);
  return result.isValid;
}
