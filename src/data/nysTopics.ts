// NYS Regents Standards - JMAP Topics organized by subject
export interface JMAPTopic {
  name: string;
  standard: string;
  url: string;
}

export interface TopicCategory {
  category: string;
  topics: JMAPTopic[];
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  categories: TopicCategory[];
}

export const GEOMETRY_TOPICS: TopicCategory[] = [
  {
    category: 'TOOLS OF GEOMETRY',
    topics: [
      { name: 'Planes', standard: 'G.CO.A.1', url: 'https://www.jmap.org/htmlstandard/G.CO.A.1.htm' },
      { name: 'Solids', standard: 'G.MG.A.1', url: 'https://www.jmap.org/htmlstandard/G.MG.A.1.htm' },
      { name: 'Cross-Sections of Three-Dimensional Objects', standard: 'G.GMD.B.4', url: 'https://www.jmap.org/htmlstandard/G.GMD.B.4.htm' },
      { name: 'Constructions', standard: 'G.CO.D.12', url: 'https://www.jmap.org/htmlstandard/G.CO.D.12.htm' },
      { name: 'Constructions (Advanced)', standard: 'G.CO.D.13', url: 'https://www.jmap.org/htmlstandard/G.CO.D.13.htm' },
    ],
  },
  {
    category: 'LINES AND ANGLES',
    topics: [
      { name: 'Points, Lines, and Planes', standard: 'G.CO.A.1', url: 'https://www.jmap.org/htmlstandard/G.CO.A.1.htm' },
      { name: 'Parallel and Perpendicular Lines', standard: 'G.GPE.B.5', url: 'https://www.jmap.org/htmlstandard/G.GPE.B.5.htm' },
      { name: 'Proofs: Lines and Angles', standard: 'G.CO.C.9', url: 'https://www.jmap.org/htmlstandard/G.CO.C.9.htm' },
      { name: 'Directed Line Segments', standard: 'G.GPE.B.6', url: 'https://www.jmap.org/htmlstandard/G.GPE.B.6.htm' },
    ],
  },
  {
    category: 'TRIANGLES',
    topics: [
      { name: 'Triangle Proofs', standard: 'G.CO.C.10', url: 'https://www.jmap.org/htmlstandard/G.CO.C.10.htm' },
      { name: 'Triangle Congruence', standard: 'G.SRT.B.5', url: 'https://www.jmap.org/htmlstandard/G.SRT.B.5.htm' },
      { name: 'Triangle Similarity', standard: 'G.SRT.A.2', url: 'https://www.jmap.org/htmlstandard/G.SRT.A.2.htm' },
      { name: 'Triangle Similarity Proofs', standard: 'G.SRT.A.3', url: 'https://www.jmap.org/htmlstandard/G.SRT.A.3.htm' },
      { name: 'Special Right Triangles', standard: 'G.SRT.C.8', url: 'https://www.jmap.org/htmlstandard/G.SRT.C.8.htm' },
      { name: 'Triangle Inequality Theorem', standard: 'G.CO.C.10', url: 'https://www.jmap.org/htmlstandard/G.CO.C.10.htm' },
    ],
  },
  {
    category: 'POLYGONS',
    topics: [
      { name: 'Parallelogram Proofs', standard: 'G.CO.C.11', url: 'https://www.jmap.org/htmlstandard/G.CO.C.11.htm' },
      { name: 'Special Quadrilaterals', standard: 'G.CO.C.11', url: 'https://www.jmap.org/htmlstandard/G.CO.C.11.htm' },
      { name: 'Interior and Exterior Angles', standard: 'G.CO.C.10', url: 'https://www.jmap.org/htmlstandard/G.CO.C.10.htm' },
      { name: 'Polygon Similarity', standard: 'G.SRT.A.2', url: 'https://www.jmap.org/htmlstandard/G.SRT.A.2.htm' },
      { name: 'Coordinate Geometry Proofs', standard: 'G.GPE.B.4', url: 'https://www.jmap.org/htmlstandard/G.GPE.B.4.htm' },
    ],
  },
  {
    category: 'CONICS',
    topics: [
      { name: 'Equations of Circles', standard: 'G.GPE.A.1', url: 'https://www.jmap.org/htmlstandard/G.GPE.A.1.htm' },
      { name: 'Chords, Secants, and Tangents', standard: 'G.C.A.2', url: 'https://www.jmap.org/htmlstandard/G.C.A.2.htm' },
      { name: 'Inscribed Angles', standard: 'G.C.A.2', url: 'https://www.jmap.org/htmlstandard/G.C.A.2.htm' },
      { name: 'Arc Length and Sector Area', standard: 'G.C.B.5', url: 'https://www.jmap.org/htmlstandard/G.C.B.5.htm' },
      { name: 'Inscribed and Circumscribed Circles', standard: 'G.C.A.3', url: 'https://www.jmap.org/htmlstandard/G.C.A.3.htm' },
    ],
  },
  {
    category: 'TRANSFORMATIONS',
    topics: [
      { name: 'Rotations', standard: 'G.CO.A.4', url: 'https://www.jmap.org/htmlstandard/G.CO.A.4.htm' },
      { name: 'Reflections', standard: 'G.CO.A.4', url: 'https://www.jmap.org/htmlstandard/G.CO.A.4.htm' },
      { name: 'Translations', standard: 'G.CO.A.4', url: 'https://www.jmap.org/htmlstandard/G.CO.A.4.htm' },
      { name: 'Dilations', standard: 'G.SRT.A.1', url: 'https://www.jmap.org/htmlstandard/G.SRT.A.1.htm' },
      { name: 'Compositions of Transformations', standard: 'G.CO.A.5', url: 'https://www.jmap.org/htmlstandard/G.CO.A.5.htm' },
      { name: 'Symmetry', standard: 'G.CO.A.3', url: 'https://www.jmap.org/htmlstandard/G.CO.A.3.htm' },
    ],
  },
  {
    category: 'TRIGONOMETRY',
    topics: [
      { name: 'Trigonometric Ratios', standard: 'G.SRT.C.6', url: 'https://www.jmap.org/htmlstandard/G.SRT.C.6.htm' },
      { name: 'Cofunctions', standard: 'G.SRT.C.7', url: 'https://www.jmap.org/htmlstandard/G.SRT.C.7.htm' },
      { name: 'Solving for a Side', standard: 'G.SRT.C.8', url: 'https://www.jmap.org/htmlstandard/G.SRT.C.8.htm' },
      { name: 'Solving for an Angle', standard: 'G.SRT.C.8', url: 'https://www.jmap.org/htmlstandard/G.SRT.C.8.htm' },
      { name: 'Law of Sines', standard: 'G.SRT.D.10', url: 'https://www.jmap.org/htmlstandard/G.SRT.D.10.htm' },
      { name: 'Law of Cosines', standard: 'G.SRT.D.10', url: 'https://www.jmap.org/htmlstandard/G.SRT.D.10.htm' },
    ],
  },
  {
    category: 'LOGIC',
    topics: [
      { name: 'Definitions and Biconditionals', standard: 'G.CO.A.1', url: 'https://www.jmap.org/htmlstandard/G.CO.A.1.htm' },
      { name: 'Conditional Statements', standard: 'G.CO.C.9', url: 'https://www.jmap.org/htmlstandard/G.CO.C.9.htm' },
      { name: 'Negations', standard: 'G.CO.C.9', url: 'https://www.jmap.org/htmlstandard/G.CO.C.9.htm' },
      { name: 'Proof Techniques', standard: 'G.CO.C.9', url: 'https://www.jmap.org/htmlstandard/G.CO.C.9.htm' },
    ],
  },
];

export const ALGEBRA1_TOPICS: TopicCategory[] = [
  {
    category: 'EXPRESSIONS AND EQUATIONS',
    topics: [
      { name: 'Polynomials', standard: 'A.SSE.A.1', url: 'https://www.jmap.org/htmlstandard/A.SSE.A.1.htm' },
      { name: 'Factoring Polynomials', standard: 'A.SSE.A.2', url: 'https://www.jmap.org/htmlstandard/A.SSE.A.2.htm' },
      { name: 'Operations with Polynomials', standard: 'A.APR.A.1', url: 'https://www.jmap.org/htmlstandard/A.APR.A.1.htm' },
      { name: 'Solving Linear Equations', standard: 'A.REI.B.3', url: 'https://www.jmap.org/htmlstandard/A.REI.B.3.htm' },
      { name: 'Solving Linear Inequalities', standard: 'A.REI.B.3', url: 'https://www.jmap.org/htmlstandard/A.REI.B.3.htm' },
    ],
  },
  {
    category: 'QUADRATICS',
    topics: [
      { name: 'Solving Quadratics by Factoring', standard: 'A.SSE.B.3', url: 'https://www.jmap.org/htmlstandard/A.SSE.B.3.htm' },
      { name: 'Solving Quadratics by Graphing', standard: 'A.REI.D.11', url: 'https://www.jmap.org/htmlstandard/A.REI.D.11.htm' },
      { name: 'Completing the Square', standard: 'A.SSE.B.3', url: 'https://www.jmap.org/htmlstandard/A.SSE.B.3.htm' },
      { name: 'Quadratic Formula', standard: 'A.REI.B.4', url: 'https://www.jmap.org/htmlstandard/A.REI.B.4.htm' },
      { name: 'Vertex Form', standard: 'F.IF.C.8', url: 'https://www.jmap.org/htmlstandard/F.IF.C.8.htm' },
    ],
  },
  {
    category: 'FUNCTIONS',
    topics: [
      { name: 'Function Notation', standard: 'F.IF.A.1', url: 'https://www.jmap.org/htmlstandard/F.IF.A.1.htm' },
      { name: 'Domain and Range', standard: 'F.IF.A.1', url: 'https://www.jmap.org/htmlstandard/F.IF.A.1.htm' },
      { name: 'Rate of Change', standard: 'F.IF.B.6', url: 'https://www.jmap.org/htmlstandard/F.IF.B.6.htm' },
      { name: 'Graphing Functions', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Transformations of Functions', standard: 'F.BF.B.3', url: 'https://www.jmap.org/htmlstandard/F.BF.B.3.htm' },
    ],
  },
  {
    category: 'LINEAR FUNCTIONS',
    topics: [
      { name: 'Slope', standard: 'F.IF.B.6', url: 'https://www.jmap.org/htmlstandard/F.IF.B.6.htm' },
      { name: 'Writing Linear Equations', standard: 'A.CED.A.2', url: 'https://www.jmap.org/htmlstandard/A.CED.A.2.htm' },
      { name: 'Graphing Linear Equations', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Parallel and Perpendicular Lines', standard: 'G.GPE.B.5', url: 'https://www.jmap.org/htmlstandard/G.GPE.B.5.htm' },
    ],
  },
  {
    category: 'SYSTEMS OF EQUATIONS',
    topics: [
      { name: 'Solving Systems Graphically', standard: 'A.REI.C.6', url: 'https://www.jmap.org/htmlstandard/A.REI.C.6.htm' },
      { name: 'Solving Systems Algebraically', standard: 'A.REI.C.6', url: 'https://www.jmap.org/htmlstandard/A.REI.C.6.htm' },
      { name: 'Systems of Inequalities', standard: 'A.REI.D.12', url: 'https://www.jmap.org/htmlstandard/A.REI.D.12.htm' },
    ],
  },
  {
    category: 'STATISTICS',
    topics: [
      { name: 'Regression', standard: 'S.ID.B.6', url: 'https://www.jmap.org/htmlstandard/S.ID.B.6.htm' },
      { name: 'Correlation Coefficient', standard: 'S.ID.C.8', url: 'https://www.jmap.org/htmlstandard/S.ID.C.8.htm' },
      { name: 'Residuals', standard: 'S.ID.B.6', url: 'https://www.jmap.org/htmlstandard/S.ID.B.6.htm' },
    ],
  },
];

export const ALGEBRA2_TOPICS: TopicCategory[] = [
  {
    category: 'POLYNOMIAL FUNCTIONS',
    topics: [
      { name: 'Operations with Polynomials', standard: 'A.APR.A.1', url: 'https://www.jmap.org/htmlstandard/A.APR.A.1.htm' },
      { name: 'Polynomial Identities', standard: 'A.APR.C.4', url: 'https://www.jmap.org/htmlstandard/A.APR.C.4.htm' },
      { name: 'Zeros of Polynomials', standard: 'A.APR.B.3', url: 'https://www.jmap.org/htmlstandard/A.APR.B.3.htm' },
      { name: 'Remainder and Factor Theorems', standard: 'A.APR.B.2', url: 'https://www.jmap.org/htmlstandard/A.APR.B.2.htm' },
      { name: 'Polynomial Graphs', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
    ],
  },
  {
    category: 'RATIONAL EXPRESSIONS',
    topics: [
      { name: 'Rational Expressions', standard: 'A.APR.D.6', url: 'https://www.jmap.org/htmlstandard/A.APR.D.6.htm' },
      { name: 'Rational Equations', standard: 'A.REI.A.2', url: 'https://www.jmap.org/htmlstandard/A.REI.A.2.htm' },
      { name: 'Direct and Inverse Variation', standard: 'A.CED.A.2', url: 'https://www.jmap.org/htmlstandard/A.CED.A.2.htm' },
    ],
  },
  {
    category: 'RADICALS AND COMPLEX NUMBERS',
    topics: [
      { name: 'Radicals', standard: 'N.RN.A.2', url: 'https://www.jmap.org/htmlstandard/N.RN.A.2.htm' },
      { name: 'Radical Equations', standard: 'A.REI.A.2', url: 'https://www.jmap.org/htmlstandard/A.REI.A.2.htm' },
      { name: 'Complex Numbers', standard: 'N.CN.A.1', url: 'https://www.jmap.org/htmlstandard/N.CN.A.1.htm' },
      { name: 'Operations with Complex Numbers', standard: 'N.CN.A.2', url: 'https://www.jmap.org/htmlstandard/N.CN.A.2.htm' },
    ],
  },
  {
    category: 'EXPONENTIAL AND LOGARITHMIC FUNCTIONS',
    topics: [
      { name: 'Exponential Functions', standard: 'F.LE.A.2', url: 'https://www.jmap.org/htmlstandard/F.LE.A.2.htm' },
      { name: 'Exponential Equations', standard: 'F.LE.A.4', url: 'https://www.jmap.org/htmlstandard/F.LE.A.4.htm' },
      { name: 'Logarithmic Functions', standard: 'F.BF.B.5', url: 'https://www.jmap.org/htmlstandard/F.BF.B.5.htm' },
      { name: 'Properties of Logarithms', standard: 'F.BF.B.5', url: 'https://www.jmap.org/htmlstandard/F.BF.B.5.htm' },
      { name: 'Exponential Growth and Decay', standard: 'F.LE.A.1', url: 'https://www.jmap.org/htmlstandard/F.LE.A.1.htm' },
    ],
  },
  {
    category: 'TRIGONOMETRIC FUNCTIONS',
    topics: [
      { name: 'Unit Circle', standard: 'F.TF.A.2', url: 'https://www.jmap.org/htmlstandard/F.TF.A.2.htm' },
      { name: 'Trigonometric Functions', standard: 'F.TF.A.1', url: 'https://www.jmap.org/htmlstandard/F.TF.A.1.htm' },
      { name: 'Graphing Trigonometric Functions', standard: 'F.TF.B.5', url: 'https://www.jmap.org/htmlstandard/F.TF.B.5.htm' },
      { name: 'Trigonometric Identities', standard: 'F.TF.C.8', url: 'https://www.jmap.org/htmlstandard/F.TF.C.8.htm' },
      { name: 'Solving Trigonometric Equations', standard: 'F.TF.B.7', url: 'https://www.jmap.org/htmlstandard/F.TF.B.7.htm' },
    ],
  },
  {
    category: 'SEQUENCES AND SERIES',
    topics: [
      { name: 'Arithmetic Sequences', standard: 'F.BF.A.2', url: 'https://www.jmap.org/htmlstandard/F.BF.A.2.htm' },
      { name: 'Geometric Sequences', standard: 'F.BF.A.2', url: 'https://www.jmap.org/htmlstandard/F.BF.A.2.htm' },
      { name: 'Series', standard: 'A.SSE.B.4', url: 'https://www.jmap.org/htmlstandard/A.SSE.B.4.htm' },
    ],
  },
  {
    category: 'PROBABILITY AND STATISTICS',
    topics: [
      { name: 'Probability', standard: 'S.CP.A.1', url: 'https://www.jmap.org/htmlstandard/S.CP.A.1.htm' },
      { name: 'Permutations and Combinations', standard: 'S.CP.B.9', url: 'https://www.jmap.org/htmlstandard/S.CP.B.9.htm' },
      { name: 'Normal Distribution', standard: 'S.ID.A.4', url: 'https://www.jmap.org/htmlstandard/S.ID.A.4.htm' },
    ],
  },
];

export const PRECALCULUS_TOPICS: TopicCategory[] = [
  {
    category: 'FUNCTIONS AND THEIR GRAPHS',
    topics: [
      { name: 'Functions and Function Notation', standard: 'F.IF.A.1', url: 'https://www.jmap.org/htmlstandard/F.IF.A.1.htm' },
      { name: 'Domain and Range', standard: 'F.IF.B.5', url: 'https://www.jmap.org/htmlstandard/F.IF.B.5.htm' },
      { name: 'Transformations of Functions', standard: 'F.BF.B.3', url: 'https://www.jmap.org/htmlstandard/F.BF.B.3.htm' },
      { name: 'Inverse Functions', standard: 'F.BF.B.4', url: 'https://www.jmap.org/htmlstandard/F.BF.B.4.htm' },
      { name: 'Composition of Functions', standard: 'F.BF.A.1', url: 'https://www.jmap.org/htmlstandard/F.BF.A.1.htm' },
    ],
  },
  {
    category: 'POLYNOMIAL AND RATIONAL FUNCTIONS',
    topics: [
      { name: 'Polynomial Functions', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Zeros of Polynomial Functions', standard: 'A.APR.B.3', url: 'https://www.jmap.org/htmlstandard/A.APR.B.3.htm' },
      { name: 'Rational Functions', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Asymptotes', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Partial Fractions', standard: 'A.APR.D.6', url: 'https://www.jmap.org/htmlstandard/A.APR.D.6.htm' },
    ],
  },
  {
    category: 'EXPONENTIAL AND LOGARITHMIC FUNCTIONS',
    topics: [
      { name: 'Exponential Functions', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Logarithmic Functions', standard: 'F.BF.B.5', url: 'https://www.jmap.org/htmlstandard/F.BF.B.5.htm' },
      { name: 'Properties of Logarithms', standard: 'F.BF.B.5', url: 'https://www.jmap.org/htmlstandard/F.BF.B.5.htm' },
      { name: 'Exponential and Logarithmic Equations', standard: 'F.LE.A.4', url: 'https://www.jmap.org/htmlstandard/F.LE.A.4.htm' },
    ],
  },
  {
    category: 'TRIGONOMETRY',
    topics: [
      { name: 'Radian and Degree Measure', standard: 'F.TF.A.1', url: 'https://www.jmap.org/htmlstandard/F.TF.A.1.htm' },
      { name: 'Unit Circle', standard: 'F.TF.A.2', url: 'https://www.jmap.org/htmlstandard/F.TF.A.2.htm' },
      { name: 'Trigonometric Functions', standard: 'F.TF.A.2', url: 'https://www.jmap.org/htmlstandard/F.TF.A.2.htm' },
      { name: 'Graphs of Trigonometric Functions', standard: 'F.TF.B.5', url: 'https://www.jmap.org/htmlstandard/F.TF.B.5.htm' },
      { name: 'Inverse Trigonometric Functions', standard: 'F.TF.B.6', url: 'https://www.jmap.org/htmlstandard/F.TF.B.6.htm' },
      { name: 'Trigonometric Identities', standard: 'F.TF.C.8', url: 'https://www.jmap.org/htmlstandard/F.TF.C.8.htm' },
      { name: 'Sum and Difference Formulas', standard: 'F.TF.C.9', url: 'https://www.jmap.org/htmlstandard/F.TF.C.9.htm' },
    ],
  },
  {
    category: 'CONIC SECTIONS',
    topics: [
      { name: 'Circles', standard: 'G.GPE.A.1', url: 'https://www.jmap.org/htmlstandard/G.GPE.A.1.htm' },
      { name: 'Parabolas', standard: 'G.GPE.A.2', url: 'https://www.jmap.org/htmlstandard/G.GPE.A.2.htm' },
      { name: 'Ellipses', standard: 'G.GPE.A.3', url: 'https://www.jmap.org/htmlstandard/G.GPE.A.3.htm' },
      { name: 'Hyperbolas', standard: 'G.GPE.A.3', url: 'https://www.jmap.org/htmlstandard/G.GPE.A.3.htm' },
    ],
  },
  {
    category: 'VECTORS AND PARAMETRIC EQUATIONS',
    topics: [
      { name: 'Vectors in the Plane', standard: 'N.VM.A.1', url: 'https://www.jmap.org/htmlstandard/N.VM.A.1.htm' },
      { name: 'Vector Operations', standard: 'N.VM.B.4', url: 'https://www.jmap.org/htmlstandard/N.VM.B.4.htm' },
      { name: 'Dot Product', standard: 'N.VM.B.5', url: 'https://www.jmap.org/htmlstandard/N.VM.B.5.htm' },
      { name: 'Parametric Equations', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
    ],
  },
  {
    category: 'LIMITS AND INTRODUCTION TO CALCULUS',
    topics: [
      { name: 'Finding Limits Graphically', standard: 'F.IF.C.7', url: 'https://www.jmap.org/htmlstandard/F.IF.C.7.htm' },
      { name: 'Finding Limits Algebraically', standard: 'A.APR.D.6', url: 'https://www.jmap.org/htmlstandard/A.APR.D.6.htm' },
      { name: 'Continuity', standard: 'F.IF.A.1', url: 'https://www.jmap.org/htmlstandard/F.IF.A.1.htm' },
      { name: 'Introduction to Derivatives', standard: 'F.IF.B.6', url: 'https://www.jmap.org/htmlstandard/F.IF.B.6.htm' },
    ],
  },
  {
    category: 'SEQUENCES AND SERIES',
    topics: [
      { name: 'Arithmetic Sequences', standard: 'F.BF.A.2', url: 'https://www.jmap.org/htmlstandard/F.BF.A.2.htm' },
      { name: 'Geometric Sequences', standard: 'F.BF.A.2', url: 'https://www.jmap.org/htmlstandard/F.BF.A.2.htm' },
      { name: 'Infinite Series', standard: 'A.SSE.B.4', url: 'https://www.jmap.org/htmlstandard/A.SSE.B.4.htm' },
      { name: 'Binomial Theorem', standard: 'A.APR.C.5', url: 'https://www.jmap.org/htmlstandard/A.APR.C.5.htm' },
    ],
  },
];

export const NYS_SUBJECTS: Subject[] = [
  {
    id: 'geometry',
    name: 'Geometry',
    shortName: 'GEO',
    categories: GEOMETRY_TOPICS,
  },
  {
    id: 'algebra1',
    name: 'Algebra I',
    shortName: 'ALG1',
    categories: ALGEBRA1_TOPICS,
  },
  {
    id: 'algebra2',
    name: 'Algebra II',
    shortName: 'ALG2',
    categories: ALGEBRA2_TOPICS,
  },
  {
    id: 'precalculus',
    name: 'Precalculus',
    shortName: 'PRE',
    categories: PRECALCULUS_TOPICS,
  },
];

// Helper to get all topics across all subjects
export function getAllTopics(): { subject: string; category: string; topic: JMAPTopic }[] {
  const allTopics: { subject: string; category: string; topic: JMAPTopic }[] = [];
  
  NYS_SUBJECTS.forEach(subject => {
    subject.categories.forEach(category => {
      category.topics.forEach(topic => {
        allTopics.push({
          subject: subject.name,
          category: category.category,
          topic,
        });
      });
    });
  });
  
  return allTopics;
}

// Helper to search topics
export function searchTopics(query: string): { subject: string; category: string; topic: JMAPTopic }[] {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  return getAllTopics().filter(item => 
    item.topic.name.toLowerCase().includes(lowerQuery) ||
    item.topic.standard.toLowerCase().includes(lowerQuery) ||
    item.category.toLowerCase().includes(lowerQuery) ||
    item.subject.toLowerCase().includes(lowerQuery)
  );
}
