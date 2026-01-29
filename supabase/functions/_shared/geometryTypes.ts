/**
 * Structured Geometry Type System (Deno/Edge Functions Version)
 * 
 * This is a Deno-compatible version of geometryTypes.ts for use in Supabase Edge Functions.
 * Kept in sync with src/lib/geometryTypes.ts
 * 
 * @module geometryTypes
 * @version 1.0.0
 */

// Note: This file is a duplicate of src/lib/geometryTypes.ts but without TypeScript-specific imports
// that might not work in Deno. Keep these files in sync.

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
  
  // Transformations
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

export interface GeometryVertex {
  label: string;
  x: number;
  y: number;
  z?: number;
  style?: {
    color?: string;
    highlighted?: boolean;
  };
}

export interface GeometryAxes {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  showGrid?: boolean;
  showNumbers?: boolean;
  tickStep?: number;
  xLabel?: string;
  yLabel?: string;
}

export type MeasurementType = 'length' | 'angle' | 'area' | 'perimeter' | 'volume';

export interface GeometryMeasurement {
  type: MeasurementType;
  value: number;
  unit: string;
  label?: string;
  appliesTo?: string[];
}

export interface GeometryCenter {
  x: number;
  y: number;
  label?: string;
}

export interface CircleProperties {
  center: GeometryCenter;
  radius: number;
  chordPoints?: [GeometryVertex, GeometryVertex];
  tangentPoint?: GeometryVertex;
  arcAngles?: {
    start: number;
    end: number;
  };
}

export interface TransformationProperties {
  originalVertices: GeometryVertex[];
  transformedVertices: GeometryVertex[];
  rotationCenter?: GeometryCenter;
  rotationAngle?: number;
  reflectionLine?: {
    point1: GeometryVertex;
    point2: GeometryVertex;
  };
  translationVector?: {
    dx: number;
    dy: number;
  };
  scaleFactor?: number;
  dilationCenter?: GeometryCenter;
}

export interface AngleProperties {
  vertex: GeometryVertex;
  ray1End: GeometryVertex;
  ray2End: GeometryVertex;
  measure?: number;
  label?: string;
}

export interface NumberLineProperties {
  min: number;
  max: number;
  tickInterval?: number;
  highlightedPoints?: Array<{
    value: number;
    label?: string;
    type?: 'open' | 'closed';
  }>;
  shadedRegions?: Array<{
    start: number;
    end: number;
    inclusive?: boolean;
  }>;
}

export interface GeometryMetadata {
  type: GeometryShapeType;
  vertices?: GeometryVertex[];
  axes?: GeometryAxes;
  measurements?: GeometryMeasurement[];
  circle?: CircleProperties;
  transformation?: TransformationProperties;
  angle?: AngleProperties;
  numberLine?: NumberLineProperties;
  metadata?: {
    description?: string;
    nysStandard?: string;
    tags?: string[];
  };
}

export enum GeometryErrorCode {
  // Parsing errors
  INVALID_JSON = 'GEO_P01',
  MISSING_REQUIRED_FIELD = 'GEO_P02',
  INVALID_SHAPE_TYPE = 'GEO_P03',
  INVALID_COORDINATES = 'GEO_P04',
  DUPLICATE_VERTEX_LABELS = 'GEO_P05',
  ALGEBRAIC_COORDINATES = 'GEO_P06',
  COORDINATES_OUT_OF_BOUNDS = 'GEO_P07',
  INSUFFICIENT_VERTICES = 'GEO_P08',
  OVERLAPPING_VERTICES = 'GEO_P09',
  
  // Rendering errors
  RENDERER_NOT_IMPLEMENTED = 'GEO_R01',
  SVG_GENERATION_FAILED = 'GEO_R02',
  INVALID_SVG_OUTPUT = 'GEO_R03',
  RENDERING_TIMEOUT = 'GEO_R04',
  
  // General errors
  UNKNOWN_ERROR = 'GEO_G01',
}

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

export interface GeometryValidationResult {
  isValid: boolean;
  errors: Array<{
    code: GeometryErrorCode;
    message: string;
    field?: string;
  }>;
  warnings: Array<{
    message: string;
    field?: string;
  }>;
}

export type DiagramSource = 
  | 'library'
  | 'geometry_svg'
  | 'coordinate_svg'
  | 'ai'
  | 'fallback'
  | 'none';

export interface QuestionWithDiagram {
  questionNumber: number;
  question: string;
  imageUrl?: string;
  imagePrompt?: string;
  geometry?: GeometryMetadata;
  diagramSource?: DiagramSource;
  diagramValidation?: GeometryValidationResult;
}

// Utility functions
export function isValidGeometryShapeType(value: unknown): value is GeometryShapeType {
  return typeof value === 'string' && Object.values(GeometryShapeType).includes(value as GeometryShapeType);
}

export function isValidDiagramSource(value: unknown): value is DiagramSource {
  const validSources: DiagramSource[] = ['library', 'geometry_svg', 'coordinate_svg', 'ai', 'fallback', 'none'];
  return typeof value === 'string' && validSources.includes(value as DiagramSource);
}

export function hasAlgebraicCoordinates(vertices: GeometryVertex[]): boolean {
  return vertices.some(v => !Number.isFinite(v.x) || !Number.isFinite(v.y));
}

export function areVerticesOverlapping(v1: GeometryVertex, v2: GeometryVertex, threshold = 0.1): boolean {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < threshold;
}
