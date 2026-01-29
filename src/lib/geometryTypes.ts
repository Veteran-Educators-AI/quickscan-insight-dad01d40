/**
 * Structured Geometry Type System
 * 
 * This module defines TypeScript interfaces for structured geometry metadata,
 * enabling deterministic diagram generation with proper type safety and validation.
 * 
 * @module geometryTypes
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GEOMETRY SHAPE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported geometry shape types for deterministic rendering
 * Organized by category for easier maintenance
 */
export enum GeometryShapeType {
  // Core 2D Shapes
  COORDINATE_POLYGON = 'coordinate_polygon',
  TRIANGLE = 'triangle',
  QUADRILATERAL = 'quadrilateral',
  
  // Circles and Curves
  CIRCLE = 'circle',
  CIRCLE_CHORD = 'circle_chord',
  CIRCLE_TANGENT = 'circle_tangent',
  CIRCLE_SECANT = 'circle_secant',
  ARC = 'arc',
  SEMICIRCLE = 'semicircle',
  
  // Lines and Line Segments
  NUMBER_LINE = 'number_line',
  LINE_SEGMENT = 'line_segment',
  RAY = 'ray',
  LINE = 'line',
  
  // Transformations (Common Regents Topics)
  ROTATION = 'rotation',
  REFLECTION = 'reflection',
  TRANSLATION = 'translation',
  DILATION = 'dilation',
  
  // Angles
  ANGLE_DIAGRAM = 'angle_diagram',
  PARALLEL_TRANSVERSAL = 'parallel_transversal',
  INSCRIBED_ANGLE = 'inscribed_angle',
  VERTICAL_ANGLES = 'vertical_angles',
  
  // Advanced Shapes
  SIMILAR_TRIANGLES = 'similar_triangles',
  CONGRUENT_TRIANGLES = 'congruent_triangles',
  INEQUALITY_GRAPH = 'inequality_graph',
  PARABOLA_VERTEX_FORM = 'parabola_vertex_form',
  ELLIPSE = 'ellipse',
  HYPERBOLA = 'hyperbola',
  
  // 3D Geometry
  PRISM_3D = 'prism_3d',
  PYRAMID_3D = 'pyramid_3d',
  CYLINDER_3D = 'cylinder_3d',
  CONE_3D = 'cone_3d',
  SPHERE_3D = 'sphere_3d',
}

/**
 * Human-readable labels for geometry shape types
 */
export const GEOMETRY_SHAPE_LABELS: Record<GeometryShapeType, string> = {
  [GeometryShapeType.COORDINATE_POLYGON]: 'Polygon on Coordinate Plane',
  [GeometryShapeType.TRIANGLE]: 'Triangle',
  [GeometryShapeType.QUADRILATERAL]: 'Quadrilateral',
  [GeometryShapeType.CIRCLE]: 'Circle',
  [GeometryShapeType.CIRCLE_CHORD]: 'Circle with Chord',
  [GeometryShapeType.CIRCLE_TANGENT]: 'Circle with Tangent',
  [GeometryShapeType.CIRCLE_SECANT]: 'Circle with Secant',
  [GeometryShapeType.ARC]: 'Arc',
  [GeometryShapeType.SEMICIRCLE]: 'Semicircle',
  [GeometryShapeType.NUMBER_LINE]: 'Number Line',
  [GeometryShapeType.LINE_SEGMENT]: 'Line Segment',
  [GeometryShapeType.RAY]: 'Ray',
  [GeometryShapeType.LINE]: 'Line',
  [GeometryShapeType.ROTATION]: 'Rotation Transformation',
  [GeometryShapeType.REFLECTION]: 'Reflection Transformation',
  [GeometryShapeType.TRANSLATION]: 'Translation Transformation',
  [GeometryShapeType.DILATION]: 'Dilation Transformation',
  [GeometryShapeType.ANGLE_DIAGRAM]: 'Angle Diagram',
  [GeometryShapeType.PARALLEL_TRANSVERSAL]: 'Parallel Lines with Transversal',
  [GeometryShapeType.INSCRIBED_ANGLE]: 'Inscribed Angle',
  [GeometryShapeType.VERTICAL_ANGLES]: 'Vertical Angles',
  [GeometryShapeType.SIMILAR_TRIANGLES]: 'Similar Triangles',
  [GeometryShapeType.CONGRUENT_TRIANGLES]: 'Congruent Triangles',
  [GeometryShapeType.INEQUALITY_GRAPH]: 'Inequality Graph',
  [GeometryShapeType.PARABOLA_VERTEX_FORM]: 'Parabola',
  [GeometryShapeType.ELLIPSE]: 'Ellipse',
  [GeometryShapeType.HYPERBOLA]: 'Hyperbola',
  [GeometryShapeType.PRISM_3D]: '3D Prism',
  [GeometryShapeType.PYRAMID_3D]: '3D Pyramid',
  [GeometryShapeType.CYLINDER_3D]: '3D Cylinder',
  [GeometryShapeType.CONE_3D]: '3D Cone',
  [GeometryShapeType.SPHERE_3D]: '3D Sphere',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Represents a single vertex/point in coordinate space
 */
export interface GeometryVertex {
  /** Vertex label (e.g., 'A', 'B', 'C') */
  label: string;
  /** X-coordinate (numeric only, algebraic coordinates should be rejected) */
  x: number;
  /** Y-coordinate (numeric only, algebraic coordinates should be rejected) */
  y: number;
  /** Optional Z-coordinate for 3D geometry */
  z?: number;
  /** Optional styling hints for this specific vertex */
  style?: {
    color?: string;
    highlighted?: boolean;
  };
}

/**
 * Coordinate axes configuration for coordinate plane diagrams
 */
export interface GeometryAxes {
  /** Minimum x-value to display */
  minX: number;
  /** Maximum x-value to display */
  maxX: number;
  /** Minimum y-value to display */
  minY: number;
  /** Maximum y-value to display */
  maxY: number;
  /** Whether to show grid lines */
  showGrid?: boolean;
  /** Whether to show axis numbers/labels */
  showNumbers?: boolean;
  /** Step size for tick marks (default: 1) */
  tickStep?: number;
  /** Axis labels (default: 'x' and 'y') */
  xLabel?: string;
  yLabel?: string;
}

/**
 * Measurement types for geometric properties
 */
export type MeasurementType = 'length' | 'angle' | 'area' | 'perimeter' | 'volume';

/**
 * Represents a measurement or annotation on a geometric figure
 */
export interface GeometryMeasurement {
  /** Type of measurement */
  type: MeasurementType;
  /** Numeric value of the measurement */
  value: number;
  /** Unit of measurement (e.g., 'cm', 'degrees', 'units²') */
  unit: string;
  /** Optional label/description for display */
  label?: string;
  /** Which elements this measurement applies to (vertex labels, side names, etc.) */
  appliesTo?: string[];
}

/**
 * Center point for circles and rotations
 */
export interface GeometryCenter {
  /** X-coordinate of center */
  x: number;
  /** Y-coordinate of center */
  y: number;
  /** Optional label for the center point */
  label?: string;
}

/**
 * Circle-specific properties
 */
export interface CircleProperties {
  /** Center point */
  center: GeometryCenter;
  /** Radius */
  radius: number;
  /** Optional chord endpoints (for CIRCLE_CHORD type) */
  chordPoints?: [GeometryVertex, GeometryVertex];
  /** Optional tangent point (for CIRCLE_TANGENT type) */
  tangentPoint?: GeometryVertex;
  /** Optional arc angles in degrees (for ARC type) */
  arcAngles?: {
    start: number; // 0-360
    end: number;   // 0-360
  };
}

/**
 * Transformation-specific properties
 */
export interface TransformationProperties {
  /** Original shape vertices */
  originalVertices: GeometryVertex[];
  /** Transformed shape vertices */
  transformedVertices: GeometryVertex[];
  /** Center of rotation (for ROTATION) */
  rotationCenter?: GeometryCenter;
  /** Rotation angle in degrees (for ROTATION) */
  rotationAngle?: number;
  /** Line of reflection (for REFLECTION) */
  reflectionLine?: {
    point1: GeometryVertex;
    point2: GeometryVertex;
  };
  /** Translation vector (for TRANSLATION) */
  translationVector?: {
    dx: number;
    dy: number;
  };
  /** Scale factor (for DILATION) */
  scaleFactor?: number;
  /** Center of dilation (for DILATION) */
  dilationCenter?: GeometryCenter;
}

/**
 * Angle-specific properties
 */
export interface AngleProperties {
  /** Vertex where the angle is formed */
  vertex: GeometryVertex;
  /** First ray endpoint */
  ray1End: GeometryVertex;
  /** Second ray endpoint */
  ray2End: GeometryVertex;
  /** Angle measure in degrees */
  measure?: number;
  /** Angle label (e.g., '∠ABC', '45°') */
  label?: string;
}

/**
 * Number line specific properties
 */
export interface NumberLineProperties {
  /** Starting value */
  min: number;
  /** Ending value */
  max: number;
  /** Tick mark interval */
  tickInterval?: number;
  /** Points to highlight on the number line */
  highlightedPoints?: Array<{
    value: number;
    label?: string;
    type?: 'open' | 'closed'; // For inequalities
  }>;
  /** Shaded regions (for inequalities) */
  shadedRegions?: Array<{
    start: number;
    end: number;
    inclusive?: boolean;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GEOMETRY METADATA INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete structured geometry metadata for a question
 * This is the main data structure that replaces text-based imagePrompt parsing
 */
export interface GeometryMetadata {
  /** Type of geometric shape/diagram */
  type: GeometryShapeType;
  
  /** Vertices for polygon-based shapes */
  vertices?: GeometryVertex[];
  
  /** Coordinate axes configuration (for coordinate plane diagrams) */
  axes?: GeometryAxes;
  
  /** Measurements and annotations */
  measurements?: GeometryMeasurement[];
  
  /** Circle-specific properties */
  circle?: CircleProperties;
  
  /** Transformation-specific properties */
  transformation?: TransformationProperties;
  
  /** Angle-specific properties */
  angle?: AngleProperties;
  
  /** Number line specific properties */
  numberLine?: NumberLineProperties;
  
  /** Additional metadata */
  metadata?: {
    /** Human-readable description */
    description?: string;
    /** NYS standard this diagram relates to */
    nysStandard?: string;
    /** Tags for searchability */
    tags?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Error codes for geometry processing
 */
export enum GeometryErrorCode {
  // Parsing errors (P1-P9)
  INVALID_JSON = 'GEO_P01',
  MISSING_REQUIRED_FIELD = 'GEO_P02',
  INVALID_SHAPE_TYPE = 'GEO_P03',
  INVALID_COORDINATES = 'GEO_P04',
  DUPLICATE_VERTEX_LABELS = 'GEO_P05',
  ALGEBRAIC_COORDINATES = 'GEO_P06',
  COORDINATES_OUT_OF_BOUNDS = 'GEO_P07',
  INSUFFICIENT_VERTICES = 'GEO_P08',
  OVERLAPPING_VERTICES = 'GEO_P09',
  
  // Rendering errors (R1-R9)
  RENDERER_NOT_IMPLEMENTED = 'GEO_R01',
  SVG_GENERATION_FAILED = 'GEO_R02',
  INVALID_SVG_OUTPUT = 'GEO_R03',
  RENDERING_TIMEOUT = 'GEO_R04',
  
  // General errors (G1-G9)
  UNKNOWN_ERROR = 'GEO_G01',
}

/**
 * Structured error for geometry parsing failures
 */
export class GeometryParseError extends Error {
  code: GeometryErrorCode;
  details: Record<string, unknown>;
  
  constructor(code: GeometryErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'GeometryParseError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Structured error for geometry rendering failures
 */
export class GeometryRenderError extends Error {
  code: GeometryErrorCode;
  details: Record<string, unknown>;
  
  constructor(code: GeometryErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'GeometryRenderError';
    this.code = code;
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation result for geometry metadata
 */
export interface GeometryValidationResult {
  /** Whether the geometry is valid */
  isValid: boolean;
  /** List of validation errors (empty if valid) */
  errors: Array<{
    code: GeometryErrorCode;
    message: string;
    field?: string;
  }>;
  /** List of warnings (non-blocking issues) */
  warnings: Array<{
    message: string;
    field?: string;
  }>;
}

/**
 * Validation constraints for different shape types
 */
export const SHAPE_VALIDATION_RULES: Record<GeometryShapeType, {
  requiredVertices?: number;
  minVertices?: number;
  maxVertices?: number;
  requiredFields?: Array<keyof GeometryMetadata>;
}> = {
  [GeometryShapeType.TRIANGLE]: {
    requiredVertices: 3,
    requiredFields: ['vertices'],
  },
  [GeometryShapeType.QUADRILATERAL]: {
    requiredVertices: 4,
    requiredFields: ['vertices'],
  },
  [GeometryShapeType.COORDINATE_POLYGON]: {
    minVertices: 2,
    requiredFields: ['vertices', 'axes'],
  },
  [GeometryShapeType.CIRCLE]: {
    requiredFields: ['circle'],
  },
  [GeometryShapeType.CIRCLE_CHORD]: {
    requiredFields: ['circle'],
  },
  [GeometryShapeType.CIRCLE_TANGENT]: {
    requiredFields: ['circle'],
  },
  [GeometryShapeType.CIRCLE_SECANT]: {
    requiredFields: ['circle'],
  },
  [GeometryShapeType.NUMBER_LINE]: {
    requiredFields: ['numberLine'],
  },
  [GeometryShapeType.ROTATION]: {
    requiredFields: ['transformation'],
  },
  [GeometryShapeType.REFLECTION]: {
    requiredFields: ['transformation'],
  },
  [GeometryShapeType.TRANSLATION]: {
    requiredFields: ['transformation'],
  },
  [GeometryShapeType.DILATION]: {
    requiredFields: ['transformation'],
  },
  [GeometryShapeType.ANGLE_DIAGRAM]: {
    requiredFields: ['angle'],
  },
  // Add default rules for remaining types
  [GeometryShapeType.ARC]: {},
  [GeometryShapeType.SEMICIRCLE]: {},
  [GeometryShapeType.LINE_SEGMENT]: {},
  [GeometryShapeType.RAY]: {},
  [GeometryShapeType.LINE]: {},
  [GeometryShapeType.PARALLEL_TRANSVERSAL]: {},
  [GeometryShapeType.INSCRIBED_ANGLE]: {},
  [GeometryShapeType.VERTICAL_ANGLES]: {},
  [GeometryShapeType.SIMILAR_TRIANGLES]: {},
  [GeometryShapeType.CONGRUENT_TRIANGLES]: {},
  [GeometryShapeType.INEQUALITY_GRAPH]: {},
  [GeometryShapeType.PARABOLA_VERTEX_FORM]: {},
  [GeometryShapeType.ELLIPSE]: {},
  [GeometryShapeType.HYPERBOLA]: {},
  [GeometryShapeType.PRISM_3D]: {},
  [GeometryShapeType.PYRAMID_3D]: {},
  [GeometryShapeType.CYLINDER_3D]: {},
  [GeometryShapeType.CONE_3D]: {},
  [GeometryShapeType.SPHERE_3D]: {},
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAM SOURCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Source of diagram generation (for tracking and escalation)
 */
export type DiagramSource = 
  | 'library'           // From Regents Shape Library
  | 'geometry_svg'      // From structured geometry renderer
  | 'coordinate_svg'    // From deterministic coordinate plane SVG
  | 'ai'                // From AI (Nano Banana)
  | 'fallback'          // From hardcoded fallback shapes
  | 'none';             // Generation failed

/**
 * Extended question interface with diagram metadata
 */
export interface QuestionWithDiagram {
  questionNumber: number;
  question: string;
  imageUrl?: string;
  imagePrompt?: string;
  geometry?: GeometryMetadata;
  diagramSource?: DiagramSource;
  diagramValidation?: GeometryValidationResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS AND UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if a value is a valid GeometryShapeType
 */
export function isValidGeometryShapeType(value: unknown): value is GeometryShapeType {
  return typeof value === 'string' && Object.values(GeometryShapeType).includes(value as GeometryShapeType);
}

/**
 * Type guard to check if a value is a valid DiagramSource
 */
export function isValidDiagramSource(value: unknown): value is DiagramSource {
  const validSources: DiagramSource[] = ['library', 'geometry_svg', 'coordinate_svg', 'ai', 'fallback', 'none'];
  return typeof value === 'string' && validSources.includes(value as DiagramSource);
}

/**
 * Check if coordinates appear to be algebraic (contain variables)
 */
export function hasAlgebraicCoordinates(vertices: GeometryVertex[]): boolean {
  return vertices.some(v => {
    // Check if x or y are NaN or Infinity (would happen if parsed from algebraic expression)
    return !Number.isFinite(v.x) || !Number.isFinite(v.y);
  });
}

/**
 * Check if two vertices are too close (overlapping)
 */
export function areVerticesOverlapping(v1: GeometryVertex, v2: GeometryVertex, threshold = 0.1): boolean {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < threshold;
}

/**
 * Get human-readable label for a shape type
 */
export function getShapeTypeLabel(type: GeometryShapeType): string {
  return GEOMETRY_SHAPE_LABELS[type] || type;
}
