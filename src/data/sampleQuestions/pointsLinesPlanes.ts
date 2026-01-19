// Sample Questions for Points, Lines, and Planes (G.CO.A.1)
// These are reference examples for the worksheet generation system

export interface SampleQuestion {
  questionNumber: number;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'challenging';
  topic: string;
  standard: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  bloomVerb: string;
  hint?: string;
  answer?: string;
  svg?: string;
  advancementLevel?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export const POINTS_LINES_PLANES_QUESTIONS: SampleQuestion[] = [
  {
    questionNumber: 1,
    question: "A surveyor is mapping out a new park. She establishes three distinct points, A, B, and C, that do not all lie on the same line. Explain why these three points determine exactly one plane. Then describe what would happen if the points were collinear.",
    difficulty: "medium",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "understand",
    bloomVerb: "explain",
    hint: "Remember the postulate about three non-collinear points. What makes points 'non-collinear'?",
    answer: "Three non-collinear points determine exactly one plane because you need at least three points not on the same line to define a flat surface. If points A, B, and C were collinear (all on the same line), infinitely many planes could contain those points, so no unique plane would be determined.",
    advancementLevel: "C",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Plane representation -->
      <polygon points="20,150 100,40 180,150 100,180" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>
      <!-- Point A -->
      <circle cx="60" cy="120" r="4" fill="#1f2937"/>
      <text x="50" y="135" font-size="14" font-weight="bold" fill="#1f2937">A</text>
      <!-- Point B -->
      <circle cx="140" cy="120" r="4" fill="#1f2937"/>
      <text x="145" y="135" font-size="14" font-weight="bold" fill="#1f2937">B</text>
      <!-- Point C -->
      <circle cx="100" cy="80" r="4" fill="#1f2937"/>
      <text x="105" y="75" font-size="14" font-weight="bold" fill="#1f2937">C</text>
      <!-- Dashed lines connecting points -->
      <line x1="60" y1="120" x2="140" y2="120" stroke="#4b5563" stroke-width="1" stroke-dasharray="4,2"/>
      <line x1="60" y1="120" x2="100" y2="80" stroke="#4b5563" stroke-width="1" stroke-dasharray="4,2"/>
      <line x1="140" y1="120" x2="100" y2="80" stroke="#4b5563" stroke-width="1" stroke-dasharray="4,2"/>
    </svg>`
  },
  {
    questionNumber: 2,
    question: "Point M lies on line segment PQ. If PM = 3x + 2 and MQ = 5x - 4, and PQ = 30, find the value of x and determine the lengths PM and MQ.",
    difficulty: "medium",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "apply",
    bloomVerb: "calculate",
    hint: "Use the Segment Addition Postulate: PM + MQ = PQ. Set up an equation and solve for x.",
    answer: "PM + MQ = PQ → (3x + 2) + (5x - 4) = 30 → 8x - 2 = 30 → 8x = 32 → x = 4. Therefore, PM = 3(4) + 2 = 14 and MQ = 5(4) - 4 = 16. Check: 14 + 16 = 30 ✓",
    advancementLevel: "C",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Main line -->
      <line x1="20" y1="100" x2="180" y2="100" stroke="#1f2937" stroke-width="2"/>
      <!-- Point P -->
      <circle cx="20" cy="100" r="4" fill="#1f2937"/>
      <text x="15" y="125" font-size="14" font-weight="bold" fill="#1f2937">P</text>
      <!-- Point M -->
      <circle cx="100" cy="100" r="4" fill="#1f2937"/>
      <text x="95" y="125" font-size="14" font-weight="bold" fill="#1f2937">M</text>
      <!-- Point Q -->
      <circle cx="180" cy="100" r="4" fill="#1f2937"/>
      <text x="175" y="125" font-size="14" font-weight="bold" fill="#1f2937">Q</text>
      <!-- Length labels -->
      <text x="45" y="85" font-size="12" fill="#4b5563">3x + 2</text>
      <text x="125" y="85" font-size="12" fill="#4b5563">5x - 4</text>
      <!-- Tick marks -->
      <line x1="20" y1="95" x2="20" y2="105" stroke="#1f2937" stroke-width="2"/>
      <line x1="100" y1="95" x2="100" y2="105" stroke="#1f2937" stroke-width="2"/>
      <line x1="180" y1="95" x2="180" y2="105" stroke="#1f2937" stroke-width="2"/>
    </svg>`
  },
  {
    questionNumber: 3,
    question: "Identify whether the following statement is true or false: 'Two distinct lines in space must either be parallel, intersecting, or skew.' Justify your answer with an example of each case.",
    difficulty: "medium",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "evaluate",
    bloomVerb: "justify",
    hint: "Consider all possible relationships between two lines. Can they be coplanar or non-coplanar?",
    answer: "TRUE. Two distinct lines in space have exactly three possible relationships: (1) Parallel - lines in the same plane that never intersect (like opposite edges of a rectangular room's ceiling), (2) Intersecting - lines that share exactly one point (like the edges meeting at a corner), (3) Skew - lines that are not coplanar, so they neither intersect nor are parallel (like the top edge of a front wall and a side edge of the back wall).",
    advancementLevel: "B",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D box representation -->
      <polygon points="40,140 100,100 160,140 100,180" fill="none" stroke="#1f2937" stroke-width="1"/>
      <line x1="40" y1="140" x2="40" y2="80" stroke="#1f2937" stroke-width="1"/>
      <line x1="100" y1="100" x2="100" y2="40" stroke="#1f2937" stroke-width="1"/>
      <line x1="160" y1="140" x2="160" y2="80" stroke="#1f2937" stroke-width="1"/>
      <line x1="40" y1="80" x2="100" y2="40" stroke="#1f2937" stroke-width="1"/>
      <line x1="100" y1="40" x2="160" y2="80" stroke="#1f2937" stroke-width="1"/>
      <line x1="40" y1="80" x2="100" y2="120" stroke="#1f2937" stroke-width="1" stroke-dasharray="4,2"/>
      <line x1="100" y1="120" x2="160" y2="80" stroke="#1f2937" stroke-width="1" stroke-dasharray="4,2"/>
      <!-- Parallel lines highlighted -->
      <line x1="40" y1="80" x2="100" y2="40" stroke="#ef4444" stroke-width="3"/>
      <line x1="100" y1="180" x2="160" y2="140" stroke="#ef4444" stroke-width="3"/>
      <text x="20" y="60" font-size="10" fill="#ef4444">∥</text>
      <!-- Labels -->
      <text x="70" y="195" font-size="10" fill="#1f2937">Parallel, Intersecting, Skew</text>
    </svg>`
  },
  {
    questionNumber: 4,
    question: "Name the intersection of plane ABC and plane DEF if the planes share line segment EF. What geometric term describes the relationship between these two planes?",
    difficulty: "easy",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "remember",
    bloomVerb: "identify",
    hint: "When two planes intersect, what type of geometric figure is formed?",
    answer: "The intersection of plane ABC and plane DEF is line EF. When two planes intersect, they always intersect in a line. These planes are called intersecting planes.",
    advancementLevel: "D",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- First plane (ABC) -->
      <polygon points="20,100 80,50 160,80 100,130" fill="#bfdbfe" fill-opacity="0.5" stroke="#1f2937" stroke-width="1"/>
      <!-- Second plane (DEF) -->
      <polygon points="60,150 120,100 180,130 120,180" fill="#fecaca" fill-opacity="0.5" stroke="#1f2937" stroke-width="1"/>
      <!-- Intersection line EF -->
      <line x1="80" y1="120" x2="140" y2="105" stroke="#1f2937" stroke-width="3"/>
      <!-- Point E -->
      <circle cx="80" cy="120" r="3" fill="#1f2937"/>
      <text x="70" y="135" font-size="12" font-weight="bold" fill="#1f2937">E</text>
      <!-- Point F -->
      <circle cx="140" cy="105" r="3" fill="#1f2937"/>
      <text x="145" y="100" font-size="12" font-weight="bold" fill="#1f2937">F</text>
      <!-- Plane labels -->
      <text x="50" y="70" font-size="11" fill="#1e40af">Plane ABC</text>
      <text x="120" y="170" font-size="11" fill="#dc2626">Plane DEF</text>
    </svg>`
  },
  {
    questionNumber: 5,
    question: "An architect is designing a building with a flat roof. She needs to verify that the roof surface is a true plane. Using your knowledge of points, lines, and planes, describe a method she could use to check that the roof lies in a single plane.",
    difficulty: "hard",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "create",
    bloomVerb: "design",
    hint: "Think about how many points determine a plane and how you could test whether additional points lie on that plane.",
    answer: "Method: (1) Select three non-collinear points on the roof corners - these define the reference plane. (2) Use a straightedge (or laser level) to create lines connecting these points. (3) For any fourth point on the roof, check if it lies on the plane by verifying that a line from this point to any two original points lies flat on the established surface. (4) Alternatively, use a string pulled taut between the three reference points - if the roof is planar, there should be no gaps between the string and the surface when checked at multiple locations.",
    advancementLevel: "A",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Building base -->
      <polygon points="40,180 40,100 100,70 160,100 160,180 100,150" fill="#f3f4f6" stroke="#1f2937" stroke-width="1.5"/>
      <!-- Roof plane -->
      <polygon points="30,100 100,55 170,100 100,130" fill="#d1d5db" stroke="#1f2937" stroke-width="2"/>
      <!-- Reference points on roof -->
      <circle cx="45" cy="98" r="4" fill="#ef4444"/>
      <text x="30" y="95" font-size="10" fill="#ef4444">P₁</text>
      <circle cx="155" cy="98" r="4" fill="#ef4444"/>
      <text x="158" y="95" font-size="10" fill="#ef4444">P₂</text>
      <circle cx="100" cy="65" r="4" fill="#ef4444"/>
      <text x="105" y="60" font-size="10" fill="#ef4444">P₃</text>
      <!-- Test point -->
      <circle cx="100" cy="95" r="3" fill="#22c55e"/>
      <text x="85" y="108" font-size="9" fill="#22c55e">Test</text>
      <!-- Dashed verification lines -->
      <line x1="45" y1="98" x2="155" y2="98" stroke="#6b7280" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="45" y1="98" x2="100" y2="65" stroke="#6b7280" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="155" y1="98" x2="100" y2="65" stroke="#6b7280" stroke-width="1" stroke-dasharray="3,2"/>
    </svg>`
  },
  {
    questionNumber: 6,
    question: "Points A, B, C, and D are coplanar. Points A, B, and C are collinear. Must point D also be collinear with A, B, and C? Explain your reasoning.",
    difficulty: "medium",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "analyze",
    bloomVerb: "analyze",
    hint: "Think about the difference between coplanar (same plane) and collinear (same line). Can a point be in a plane but not on a specific line in that plane?",
    answer: "No, point D does not have to be collinear with A, B, and C. Being coplanar means all four points lie in the same plane, but a plane contains infinitely many lines. Point D could be anywhere in the plane, including off the line containing A, B, and C. For example, if A, B, C form a horizontal line on a table, point D could be anywhere else on the table surface without being on that line.",
    advancementLevel: "B",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Plane -->
      <polygon points="20,160 80,60 180,80 120,180" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>
      <!-- Line through A, B, C -->
      <line x1="40" y1="130" x2="150" y2="100" stroke="#1f2937" stroke-width="2"/>
      <!-- Point A -->
      <circle cx="50" cy="127" r="4" fill="#1f2937"/>
      <text x="40" y="145" font-size="12" font-weight="bold" fill="#1f2937">A</text>
      <!-- Point B -->
      <circle cx="90" cy="116" r="4" fill="#1f2937"/>
      <text x="85" y="135" font-size="12" font-weight="bold" fill="#1f2937">B</text>
      <!-- Point C -->
      <circle cx="130" cy="105" r="4" fill="#1f2937"/>
      <text x="135" y="115" font-size="12" font-weight="bold" fill="#1f2937">C</text>
      <!-- Point D (not on line) -->
      <circle cx="100" cy="80" r="4" fill="#ef4444"/>
      <text x="105" y="75" font-size="12" font-weight="bold" fill="#ef4444">D</text>
      <!-- Annotation -->
      <text x="90" y="170" font-size="10" fill="#6b7280">D is coplanar but not collinear</text>
    </svg>`
  },
  {
    questionNumber: 7,
    question: "State the postulate that justifies each statement: (a) Points X and Y determine exactly one line. (b) Line m contains at least two points.",
    difficulty: "easy",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "remember",
    bloomVerb: "state",
    hint: "These are fundamental postulates about points and lines. What do we assume to be true about the relationship between points and lines?",
    answer: "(a) Two Points Postulate (or Line Postulate): Through any two distinct points, there exists exactly one line. (b) Existence Postulate for Lines: Every line contains at least two distinct points.",
    advancementLevel: "E",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Part (a) - Two points determine a line -->
      <line x1="20" y1="60" x2="180" y2="60" stroke="#1f2937" stroke-width="2"/>
      <circle cx="60" cy="60" r="5" fill="#1f2937"/>
      <text x="55" y="50" font-size="14" font-weight="bold" fill="#1f2937">X</text>
      <circle cx="140" cy="60" r="5" fill="#1f2937"/>
      <text x="135" y="50" font-size="14" font-weight="bold" fill="#1f2937">Y</text>
      <text x="85" y="85" font-size="11" fill="#6b7280">(a)</text>
      <!-- Part (b) - Line contains points -->
      <line x1="20" y1="140" x2="180" y2="140" stroke="#1f2937" stroke-width="2"/>
      <circle cx="70" cy="140" r="5" fill="#1f2937"/>
      <circle cx="130" cy="140" r="5" fill="#1f2937"/>
      <text x="95" y="155" font-size="12" fill="#1f2937">m</text>
      <text x="85" y="175" font-size="11" fill="#6b7280">(b)</text>
      <!-- Arrows on lines -->
      <polygon points="180,60 170,55 170,65" fill="#1f2937"/>
      <polygon points="20,60 30,55 30,65" fill="#1f2937"/>
      <polygon points="180,140 170,135 170,145" fill="#1f2937"/>
      <polygon points="20,140 30,135 30,145" fill="#1f2937"/>
    </svg>`
  },
  {
    questionNumber: 8,
    question: "In the figure, lines p and q intersect at point R. If ∠1 and ∠2 are vertical angles, and m∠1 = 4x + 15 and m∠2 = 6x - 5, find the measure of both angles.",
    difficulty: "medium",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "apply",
    bloomVerb: "solve",
    hint: "Vertical angles are congruent (equal in measure). Set up an equation using this property.",
    answer: "Since vertical angles are congruent: m∠1 = m∠2 → 4x + 15 = 6x - 5 → 20 = 2x → x = 10. Therefore, m∠1 = 4(10) + 15 = 55° and m∠2 = 6(10) - 5 = 55°. Both vertical angles measure 55°.",
    advancementLevel: "C",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Line p -->
      <line x1="20" y1="160" x2="180" y2="40" stroke="#1f2937" stroke-width="2"/>
      <text x="175" y="35" font-size="12" fill="#1f2937">p</text>
      <!-- Line q -->
      <line x1="20" y1="40" x2="180" y2="160" stroke="#1f2937" stroke-width="2"/>
      <text x="175" y="165" font-size="12" fill="#1f2937">q</text>
      <!-- Point R (intersection) -->
      <circle cx="100" cy="100" r="4" fill="#1f2937"/>
      <text x="105" y="95" font-size="14" font-weight="bold" fill="#1f2937">R</text>
      <!-- Angle 1 arc -->
      <path d="M 115 85 A 20 20 0 0 1 115 115" fill="none" stroke="#ef4444" stroke-width="2"/>
      <text x="125" y="105" font-size="12" fill="#ef4444">1</text>
      <!-- Angle 2 arc -->
      <path d="M 85 115 A 20 20 0 0 1 85 85" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <text x="65" y="105" font-size="12" fill="#3b82f6">2</text>
      <!-- Labels for expressions -->
      <text x="130" y="75" font-size="10" fill="#ef4444">4x + 15</text>
      <text x="30" y="130" font-size="10" fill="#3b82f6">6x - 5</text>
    </svg>`
  },
  {
    questionNumber: 9,
    question: "A line segment has endpoints at coordinates (2, 3) and (8, 11). Find the coordinates of the midpoint M of this segment.",
    difficulty: "easy",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "apply",
    bloomVerb: "calculate",
    hint: "Use the midpoint formula: M = ((x₁ + x₂)/2, (y₁ + y₂)/2)",
    answer: "Using the midpoint formula: M = ((2 + 8)/2, (3 + 11)/2) = (10/2, 14/2) = (5, 7). The midpoint is at coordinates (5, 7).",
    advancementLevel: "D",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Coordinate grid -->
      <line x1="20" y1="180" x2="180" y2="180" stroke="#9ca3af" stroke-width="1"/>
      <line x1="20" y1="180" x2="20" y2="20" stroke="#9ca3af" stroke-width="1"/>
      <!-- Grid lines -->
      <line x1="40" y1="180" x2="40" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="60" y1="180" x2="60" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="80" y1="180" x2="80" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="100" y1="180" x2="100" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="120" y1="180" x2="120" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="140" y1="180" x2="140" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="160" y1="180" x2="160" y2="20" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="160" x2="180" y2="160" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="140" x2="180" y2="140" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="120" x2="180" y2="120" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="100" x2="180" y2="100" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="80" x2="180" y2="80" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="60" x2="180" y2="60" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="20" y1="40" x2="180" y2="40" stroke="#e5e7eb" stroke-width="0.5"/>
      <!-- Axis labels -->
      <text x="185" y="183" font-size="10" fill="#6b7280">x</text>
      <text x="15" y="15" font-size="10" fill="#6b7280">y</text>
      <!-- Line segment -->
      <line x1="40" y1="150" x2="140" y2="50" stroke="#1f2937" stroke-width="2"/>
      <!-- Point (2,3) -->
      <circle cx="40" cy="150" r="5" fill="#1f2937"/>
      <text x="30" y="168" font-size="10" fill="#1f2937">(2,3)</text>
      <!-- Point (8,11) -->
      <circle cx="140" cy="50" r="5" fill="#1f2937"/>
      <text x="145" y="50" font-size="10" fill="#1f2937">(8,11)</text>
      <!-- Midpoint M -->
      <circle cx="90" cy="100" r="5" fill="#ef4444"/>
      <text x="95" y="95" font-size="10" fill="#ef4444">M(5,7)</text>
    </svg>`
  },
  {
    questionNumber: 10,
    question: "Compare and contrast the concepts of 'collinear points' and 'coplanar points'. Give an example of points that are coplanar but not collinear.",
    difficulty: "easy",
    topic: "Points, Lines, and Planes",
    standard: "G.CO.A.1",
    bloomLevel: "understand",
    bloomVerb: "compare",
    hint: "Think about what 'linear' (line) and 'planar' (plane) mean. One is a subset of the other.",
    answer: "Collinear points: Points that lie on the same straight line. Coplanar points: Points that lie on the same flat plane. All collinear points are automatically coplanar (a line lies within a plane), but coplanar points are not necessarily collinear. Example: The four corners of a rectangle are coplanar (all in the same flat surface) but not all collinear (they don't all lie on the same line - only two at a time can be collinear).",
    advancementLevel: "D",
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Plane -->
      <polygon points="20,150 100,50 180,150 100,190" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>
      <!-- Rectangle vertices (coplanar but not all collinear) -->
      <circle cx="60" cy="120" r="4" fill="#ef4444"/>
      <circle cx="140" cy="120" r="4" fill="#ef4444"/>
      <circle cx="140" cy="150" r="4" fill="#ef4444"/>
      <circle cx="60" cy="150" r="4" fill="#ef4444"/>
      <!-- Rectangle edges -->
      <rect x="60" y="120" width="80" height="30" fill="none" stroke="#ef4444" stroke-width="2"/>
      <!-- Labels -->
      <text x="50" y="115" font-size="10" fill="#1f2937">A</text>
      <text x="145" y="115" font-size="10" fill="#1f2937">B</text>
      <text x="145" y="165" font-size="10" fill="#1f2937">C</text>
      <text x="50" y="165" font-size="10" fill="#1f2937">D</text>
      <!-- Annotation -->
      <text x="55" y="100" font-size="9" fill="#6b7280">A, B, C, D: Coplanar</text>
      <text x="55" y="185" font-size="9" fill="#6b7280">But not all collinear</text>
    </svg>`
  }
];

// Export helper functions
export function getQuestionsByDifficulty(difficulty: SampleQuestion['difficulty']): SampleQuestion[] {
  return POINTS_LINES_PLANES_QUESTIONS.filter(q => q.difficulty === difficulty);
}

export function getQuestionsByBloomLevel(level: SampleQuestion['bloomLevel']): SampleQuestion[] {
  return POINTS_LINES_PLANES_QUESTIONS.filter(q => q.bloomLevel === level);
}

export function getQuestionsByAdvancementLevel(level: SampleQuestion['advancementLevel']): SampleQuestion[] {
  return POINTS_LINES_PLANES_QUESTIONS.filter(q => q.advancementLevel === level);
}

export default POINTS_LINES_PLANES_QUESTIONS;
