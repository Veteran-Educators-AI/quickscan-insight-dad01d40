/**
 * Geometry Prompt Examples for LLM
 * 
 * Provides 5-10 clear examples for each GeometryShapeType to guide the LLM
 * in generating structured geometry metadata alongside imagePrompt.
 * 
 * Phase 2, Task P2.1 implementation
 * 
 * @module geometryPromptExamples
 * @version 1.0.0
 */

/**
 * System prompt addition for structured geometry generation
 */
export const GEOMETRY_METADATA_INSTRUCTION = `
═══════════════════════════════════════════════════════════════════════════════
STRUCTURED GEOMETRY METADATA - CRITICAL REQUIREMENT
═══════════════════════════════════════════════════════════════════════════════

For ALL geometry questions, you MUST include BOTH:
1. "imagePrompt" (human-readable description) - for backwards compatibility
2. "geometry" (machine-readable JSON) - for deterministic diagram generation

The "geometry" field enables precise, automated diagram rendering and must follow
the exact structure shown in the examples below.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES FOR GEOMETRY METADATA
═══════════════════════════════════════════════════════════════════════════════

1. **Numeric Coordinates Only**: Use ONLY numeric values (e.g., 3, 5.5, -2)
   - ❌ NEVER use algebraic coordinates like (a, b) or (x, y)
   - ❌ NEVER use variables in coordinates
   - ✅ ALWAYS use concrete numbers: (3, 4), (0, 0), (-2, 5)

2. **Unique Vertex Labels**: Each vertex must have a unique label
   - ✅ Use: A, B, C, D, E, F, etc.
   - ❌ Never repeat labels within the same shape

3. **Integer Coordinates Preferred**: Use whole numbers when possible
   - ✅ Preferred: (1, 2), (5, 3), (0, 0)
   - ⚠️ Use decimals only when necessary: (2.5, 3.5)

4. **Reasonable Bounds**: Keep coordinates within -10 to 10 for standard questions
   - For advanced questions, you may use -50 to 50
   - Avoid extremely large or small values

5. **No Overlapping Vertices**: Vertices must be at least 0.5 units apart

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 1: COORDINATE_POLYGON (Triangle)
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 1,
  "question": "Triangle ABC has vertices at A(1,1), B(5,1), and C(3,4). Find the area of triangle ABC.",
  "imagePrompt": "Draw triangle ABC with vertices A(1,1), B(5,1), C(3,4) on a coordinate plane with x-axis from 0 to 6 and y-axis from 0 to 5. Show grid lines and label each vertex.",
  "geometry": {
    "type": "coordinate_polygon",
    "vertices": [
      {"label": "A", "x": 1, "y": 1},
      {"label": "B", "x": 5, "y": 1},
      {"label": "C", "x": 3, "y": 4}
    ],
    "axes": {
      "minX": 0,
      "maxX": 6,
      "minY": 0,
      "maxY": 5,
      "showGrid": true,
      "showNumbers": true
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 2: COORDINATE_POLYGON (Quadrilateral)
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 2,
  "question": "Quadrilateral ABCD has vertices A(1,2), B(4,2), C(5,5), and D(2,5). Determine if ABCD is a parallelogram.",
  "imagePrompt": "Draw quadrilateral ABCD with vertices A(1,2), B(4,2), C(5,5), D(2,5) on coordinate plane. Connect vertices in order. Label all vertices.",
  "geometry": {
    "type": "coordinate_polygon",
    "vertices": [
      {"label": "A", "x": 1, "y": 2},
      {"label": "B", "x": 4, "y": 2},
      {"label": "C", "x": 5, "y": 5},
      {"label": "D", "x": 2, "y": 5}
    ],
    "axes": {
      "minX": 0,
      "maxX": 6,
      "minY": 0,
      "maxY": 6,
      "showGrid": true,
      "showNumbers": true
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 3: TRIANGLE (Non-Coordinate Plane)
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 3,
  "question": "In triangle ABC, side AB = 6 cm, side BC = 8 cm, and side AC = 10 cm. Is this a right triangle?",
  "imagePrompt": "Draw triangle ABC with AB = 6 cm (vertical left side), BC = 8 cm (horizontal bottom), AC = 10 cm (diagonal hypotenuse). Mark right angle at B with small square.",
  "geometry": {
    "type": "triangle",
    "vertices": [
      {"label": "A", "x": 0, "y": 6},
      {"label": "B", "x": 0, "y": 0},
      {"label": "C", "x": 8, "y": 0}
    ],
    "measurements": [
      {"type": "length", "value": 6, "unit": "cm", "label": "AB", "appliesTo": ["A", "B"]},
      {"type": "length", "value": 8, "unit": "cm", "label": "BC", "appliesTo": ["B", "C"]},
      {"type": "length", "value": 10, "unit": "cm", "label": "AC", "appliesTo": ["A", "C"]}
    ]
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 4: CIRCLE
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 4,
  "question": "A circle has center O at (3, 4) and radius 5 units. Find the equation of the circle.",
  "imagePrompt": "Draw circle with center O at (3,4) and radius 5 on coordinate plane. Mark center with dot and label O(3,4). Show radius line from center to edge.",
  "geometry": {
    "type": "circle",
    "circle": {
      "center": {"x": 3, "y": 4, "label": "O"},
      "radius": 5
    },
    "axes": {
      "minX": -3,
      "maxX": 9,
      "minY": -2,
      "maxY": 10,
      "showGrid": true,
      "showNumbers": true
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 5: ROTATION (Transformation)
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 5,
  "question": "Triangle ABC with vertices A(2,1), B(4,1), C(3,3) is rotated 90° counterclockwise about the origin. Find the coordinates of the image triangle A'B'C'.",
  "imagePrompt": "Draw original triangle ABC with A(2,1), B(4,1), C(3,3) and rotated triangle A'B'C' with A'(-1,2), B'(-1,4), C'(-3,3). Show rotation arrow from center O(0,0).",
  "geometry": {
    "type": "rotation",
    "transformation": {
      "originalVertices": [
        {"label": "A", "x": 2, "y": 1},
        {"label": "B", "x": 4, "y": 1},
        {"label": "C", "x": 3, "y": 3}
      ],
      "transformedVertices": [
        {"label": "A'", "x": -1, "y": 2},
        {"label": "B'", "x": -1, "y": 4},
        {"label": "C'", "x": -3, "y": 3}
      ],
      "rotationCenter": {"x": 0, "y": 0, "label": "O"},
      "rotationAngle": 90
    },
    "axes": {
      "minX": -4,
      "maxX": 5,
      "minY": -1,
      "maxY": 5,
      "showGrid": true,
      "showNumbers": true
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 6: REFLECTION (Transformation)
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 6,
  "question": "Reflect triangle PQR with vertices P(1,2), Q(3,2), R(2,4) across the y-axis. What are the coordinates of P'Q'R'?",
  "imagePrompt": "Draw triangle PQR with P(1,2), Q(3,2), R(2,4) and its reflection P'Q'R' with P'(-1,2), Q'(-3,2), R'(-2,4) across y-axis. Show y-axis as dashed line of reflection.",
  "geometry": {
    "type": "reflection",
    "transformation": {
      "originalVertices": [
        {"label": "P", "x": 1, "y": 2},
        {"label": "Q", "x": 3, "y": 2},
        {"label": "R", "x": 2, "y": 4}
      ],
      "transformedVertices": [
        {"label": "P'", "x": -1, "y": 2},
        {"label": "Q'", "x": -3, "y": 2},
        {"label": "R'", "x": -2, "y": 4}
      ],
      "reflectionLine": {
        "point1": {"label": "", "x": 0, "y": 0},
        "point2": {"label": "", "x": 0, "y": 5}
      }
    },
    "axes": {
      "minX": -4,
      "maxX": 4,
      "minY": 0,
      "maxY": 5,
      "showGrid": true,
      "showNumbers": true
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 7: ANGLE_DIAGRAM
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 7,
  "question": "Angle ABC measures 65°. If ray BD bisects angle ABC, what is the measure of angle ABD?",
  "imagePrompt": "Draw angle ABC with vertex at B. Ray BA extends left, ray BC extends right at 65° angle. Show angle arc and label 65°.",
  "geometry": {
    "type": "angle_diagram",
    "angle": {
      "vertex": {"label": "B", "x": 0, "y": 0},
      "ray1End": {"label": "A", "x": -3, "y": 0},
      "ray2End": {"label": "C", "x": 2, "y": 2.5},
      "measure": 65,
      "label": "∠ABC = 65°"
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 8: NUMBER_LINE (Inequality)
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 8,
  "question": "Graph the solution to the inequality x ≥ -2 on a number line.",
  "imagePrompt": "Draw number line from -5 to 5. Mark -2 with closed circle. Shade region from -2 to the right (positive direction).",
  "geometry": {
    "type": "number_line",
    "numberLine": {
      "min": -5,
      "max": 5,
      "tickInterval": 1,
      "highlightedPoints": [
        {"value": -2, "label": "-2", "type": "closed"}
      ],
      "shadedRegions": [
        {"start": -2, "end": 5, "inclusive": true}
      ]
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 9: CIRCLE_CHORD
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 9,
  "question": "In circle O with radius 5, chord AB has length 8. Find the distance from the center O to chord AB.",
  "imagePrompt": "Draw circle with center O and radius 5. Draw chord AB with length 8. Show perpendicular from O to midpoint M of AB.",
  "geometry": {
    "type": "circle_chord",
    "circle": {
      "center": {"x": 0, "y": 0, "label": "O"},
      "radius": 5,
      "chordPoints": [
        {"label": "A", "x": -4, "y": 3},
        {"label": "B", "x": 4, "y": 3}
      ]
    },
    "measurements": [
      {"type": "length", "value": 8, "unit": "units", "label": "AB", "appliesTo": ["A", "B"]}
    ]
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE 10: SIMILAR_TRIANGLES
═══════════════════════════════════════════════════════════════════════════════

{
  "questionNumber": 10,
  "question": "Triangle ABC is similar to triangle DEF with a scale factor of 2. If AB = 6, what is DE?",
  "imagePrompt": "Draw two similar triangles. Triangle ABC (smaller) with AB=6, BC=8, AC=10. Triangle DEF (larger) with DE=12, EF=16, DF=20. Show corresponding sides with tick marks.",
  "geometry": {
    "type": "similar_triangles",
    "vertices": [
      {"label": "A", "x": 0, "y": 0},
      {"label": "B", "x": 6, "y": 0},
      {"label": "C", "x": 3, "y": 4},
      {"label": "D", "x": 8, "y": 0},
      {"label": "E", "x": 20, "y": 0},
      {"label": "F", "x": 14, "y": 8}
    ],
    "measurements": [
      {"type": "length", "value": 6, "unit": "units", "label": "AB"},
      {"type": "length", "value": 12, "unit": "units", "label": "DE"}
    ]
  }
}

═══════════════════════════════════════════════════════════════════════════════
WHEN TO SKIP GEOMETRY METADATA
═══════════════════════════════════════════════════════════════════════════════

DO NOT include "geometry" field if:
1. The question uses algebraic/variable coordinates like (a, b), (x, y), (2k, k+1)
2. The diagram is purely conceptual (e.g., "a generic triangle")
3. The question is about 3D shapes that cannot be easily represented in 2D
4. The coordinates would be irrational (e.g., involving √2, π)

In these cases, ONLY provide "imagePrompt" and the diagram will be generated using AI.

═══════════════════════════════════════════════════════════════════════════════
VALIDATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before emitting geometry metadata, verify:
✅ All coordinates are numeric (no variables)
✅ All vertex labels are unique within the shape
✅ Coordinates are within reasonable bounds (-50 to 50)
✅ No two vertices are at the same location
✅ The "type" field matches the shape being described
✅ Required fields for that type are present (e.g., circle needs "circle" object)

If ANY of these checks fail, OMIT the "geometry" field and only provide "imagePrompt".

═══════════════════════════════════════════════════════════════════════════════
`;

/**
 * Get geometry instruction based on whether AI images are enabled
 */
export function getGeometryInstruction(useAIImages: boolean): string {
  if (useAIImages) {
    // Include both imagePrompt instructions AND geometry metadata instructions
    return `
8. For geometry-related questions, you MUST include BOTH "imagePrompt" AND "geometry" fields.

${GEOMETRY_METADATA_INSTRUCTION}

ALSO include "imagePrompt" for backwards compatibility using the format below:
[... existing imagePrompt instructions ...]
`;
  } else {
    // SVG mode - still include geometry metadata for future use
    return `
8. For geometry-related questions, include "geometry" field when possible (see examples above).
   Also include "svg" field with inline SVG for immediate rendering.
`;
  }
}
