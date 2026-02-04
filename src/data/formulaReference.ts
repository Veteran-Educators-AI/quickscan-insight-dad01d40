// Formula Reference Sheet Data organized by topic/category
export interface FormulaEntry {
  name: string;
  formula: string;
  description?: string;
}

export interface FormulaCategory {
  category: string;
  formulas: FormulaEntry[];
}

// Map topic names and categories to relevant formulas
export const FORMULA_REFERENCE: Record<string, FormulaCategory> = {
  // Geometry
  'TRIANGLES': {
    category: 'Triangle Formulas',
    formulas: [
      { name: 'Area of Triangle', formula: 'A = ½bh', description: 'base × height ÷ 2' },
      { name: 'Pythagorean Theorem', formula: 'a² + b² = c²', description: 'For right triangles' },
      { name: 'Sum of Angles', formula: '∠A + ∠B + ∠C = 180°' },
      { name: 'Law of Sines', formula: 'a/sin(A) = b/sin(B) = c/sin(C)' },
      { name: 'Law of Cosines', formula: 'c² = a² + b² - 2ab·cos(C)' },
    ],
  },
  'TRIGONOMETRY': {
    category: 'Trigonometric Formulas',
    formulas: [
      { name: 'Sine', formula: 'sin(θ) = opposite/hypotenuse' },
      { name: 'Cosine', formula: 'cos(θ) = adjacent/hypotenuse' },
      { name: 'Tangent', formula: 'tan(θ) = opposite/adjacent = sin(θ)/cos(θ)' },
      { name: 'Pythagorean Identity', formula: 'sin²(θ) + cos²(θ) = 1' },
      { name: 'Law of Sines', formula: 'a/sin(A) = b/sin(B) = c/sin(C)' },
      { name: 'Law of Cosines', formula: 'c² = a² + b² - 2ab·cos(C)' },
      { name: 'Area with Sine', formula: 'A = ½ab·sin(C)' },
    ],
  },
  'CONICS': {
    category: 'Circle & Conic Formulas',
    formulas: [
      { name: 'Circle Equation (Standard)', formula: '(x - h)² + (y - k)² = r²', description: 'Center (h, k), radius r' },
      { name: 'Circumference', formula: 'C = 2πr = πd' },
      { name: 'Area of Circle', formula: 'A = πr²' },
      { name: 'Arc Length', formula: 's = rθ', description: 'θ in radians' },
      { name: 'Sector Area', formula: 'A = ½r²θ', description: 'θ in radians' },
    ],
  },
  'POLYGONS': {
    category: 'Polygon Formulas',
    formulas: [
      { name: 'Sum of Interior Angles', formula: 'S = (n - 2) × 180°', description: 'n = number of sides' },
      { name: 'Each Interior Angle (Regular)', formula: '∠ = (n - 2) × 180° / n' },
      { name: 'Each Exterior Angle (Regular)', formula: '∠ = 360° / n' },
      { name: 'Area of Rectangle', formula: 'A = lw' },
      { name: 'Area of Parallelogram', formula: 'A = bh' },
      { name: 'Area of Trapezoid', formula: 'A = ½(b₁ + b₂)h' },
    ],
  },
  'TRANSFORMATIONS': {
    category: 'Transformation Rules',
    formulas: [
      { name: 'Translation', formula: '(x, y) → (x + a, y + b)' },
      { name: 'Reflection over x-axis', formula: '(x, y) → (x, -y)' },
      { name: 'Reflection over y-axis', formula: '(x, y) → (-x, y)' },
      { name: 'Reflection over y = x', formula: '(x, y) → (y, x)' },
      { name: 'Rotation 90° CCW', formula: '(x, y) → (-y, x)' },
      { name: 'Rotation 180°', formula: '(x, y) → (-x, -y)' },
      { name: 'Rotation 270° CCW', formula: '(x, y) → (y, -x)' },
      { name: 'Dilation', formula: '(x, y) → (kx, ky)', description: 'k = scale factor' },
    ],
  },
  'TOOLS OF GEOMETRY': {
    category: 'Basic Geometry Formulas',
    formulas: [
      { name: 'Distance Formula', formula: 'd = √[(x₂ - x₁)² + (y₂ - y₁)²]' },
      { name: 'Midpoint Formula', formula: 'M = ((x₁ + x₂)/2, (y₁ + y₂)/2)' },
      { name: 'Slope', formula: 'm = (y₂ - y₁)/(x₂ - x₁)' },
    ],
  },
  'LINES AND ANGLES': {
    category: 'Lines & Angles Formulas',
    formulas: [
      { name: 'Slope-Intercept Form', formula: 'y = mx + b' },
      { name: 'Point-Slope Form', formula: 'y - y₁ = m(x - x₁)' },
      { name: 'Standard Form', formula: 'Ax + By = C' },
      { name: 'Parallel Lines Slope', formula: 'm₁ = m₂' },
      { name: 'Perpendicular Lines Slope', formula: 'm₁ × m₂ = -1' },
      { name: 'Vertical Angles', formula: '∠1 = ∠2' },
      { name: 'Linear Pair', formula: '∠1 + ∠2 = 180°' },
    ],
  },

  // Algebra 1
  'EXPRESSIONS AND EQUATIONS': {
    category: 'Algebraic Expressions',
    formulas: [
      { name: 'Distributive Property', formula: 'a(b + c) = ab + ac' },
      { name: 'FOIL Method', formula: '(a + b)(c + d) = ac + ad + bc + bd' },
      { name: 'Difference of Squares', formula: 'a² - b² = (a + b)(a - b)' },
      { name: 'Perfect Square Trinomial', formula: 'a² ± 2ab + b² = (a ± b)²' },
    ],
  },
  'QUADRATICS': {
    category: 'Quadratic Formulas',
    formulas: [
      { name: 'Standard Form', formula: 'f(x) = ax² + bx + c' },
      { name: 'Vertex Form', formula: 'f(x) = a(x - h)² + k', description: 'Vertex at (h, k)' },
      { name: 'Quadratic Formula', formula: 'x = (-b ± √(b² - 4ac)) / 2a' },
      { name: 'Discriminant', formula: 'D = b² - 4ac' },
      { name: 'Axis of Symmetry', formula: 'x = -b / 2a' },
      { name: 'Sum of Roots', formula: 'r₁ + r₂ = -b/a' },
      { name: 'Product of Roots', formula: 'r₁ × r₂ = c/a' },
    ],
  },
  'FUNCTIONS': {
    category: 'Function Formulas',
    formulas: [
      { name: 'Function Notation', formula: 'f(x) = y' },
      { name: 'Average Rate of Change', formula: '[f(b) - f(a)] / (b - a)' },
      { name: 'Composition', formula: '(f ∘ g)(x) = f(g(x))' },
      { name: 'Inverse Function', formula: 'f(f⁻¹(x)) = x' },
    ],
  },
  'LINEAR FUNCTIONS': {
    category: 'Linear Function Formulas',
    formulas: [
      { name: 'Slope Formula', formula: 'm = (y₂ - y₁)/(x₂ - x₁)' },
      { name: 'Slope-Intercept Form', formula: 'y = mx + b' },
      { name: 'Point-Slope Form', formula: 'y - y₁ = m(x - x₁)' },
      { name: 'Standard Form', formula: 'Ax + By = C' },
    ],
  },
  'SYSTEMS OF EQUATIONS': {
    category: 'Systems Formulas',
    formulas: [
      { name: 'Substitution Method', formula: 'Solve one equation for a variable, substitute into other' },
      { name: 'Elimination Method', formula: 'Add/subtract equations to eliminate a variable' },
      { name: 'Solution Types', formula: 'One solution (intersect), No solution (parallel), Infinite (same line)' },
    ],
  },
  'STATISTICS': {
    category: 'Statistics Formulas',
    formulas: [
      { name: 'Mean', formula: 'x̄ = Σxᵢ / n' },
      { name: 'Standard Deviation', formula: 'σ = √[Σ(xᵢ - x̄)² / n]' },
      { name: 'Linear Regression', formula: 'ŷ = ax + b' },
      { name: 'Correlation Coefficient', formula: 'r = Σ(xᵢ - x̄)(yᵢ - ȳ) / √[Σ(xᵢ - x̄)²Σ(yᵢ - ȳ)²]' },
    ],
  },

  // Algebra 2
  'POLYNOMIAL FUNCTIONS': {
    category: 'Polynomial Formulas',
    formulas: [
      { name: 'Degree n Polynomial', formula: 'f(x) = aₙxⁿ + aₙ₋₁xⁿ⁻¹ + ... + a₁x + a₀' },
      { name: 'Remainder Theorem', formula: 'f(a) = remainder when f(x) ÷ (x - a)' },
      { name: 'Factor Theorem', formula: '(x - a) is a factor ⟺ f(a) = 0' },
      { name: 'Sum of Cubes', formula: 'a³ + b³ = (a + b)(a² - ab + b²)' },
      { name: 'Difference of Cubes', formula: 'a³ - b³ = (a - b)(a² + ab + b²)' },
    ],
  },
  'RATIONAL EXPRESSIONS': {
    category: 'Rational Expression Formulas',
    formulas: [
      { name: 'Multiplication', formula: '(a/b) × (c/d) = ac/bd' },
      { name: 'Division', formula: '(a/b) ÷ (c/d) = ad/bc' },
      { name: 'Addition (common denom)', formula: '(a/c) + (b/c) = (a + b)/c' },
      { name: 'Direct Variation', formula: 'y = kx' },
      { name: 'Inverse Variation', formula: 'y = k/x' },
    ],
  },
  'RADICALS AND COMPLEX NUMBERS': {
    category: 'Radical & Complex Number Formulas',
    formulas: [
      { name: 'Radical Product Rule', formula: '√a × √b = √(ab)' },
      { name: 'Radical Quotient Rule', formula: '√a / √b = √(a/b)' },
      { name: 'Rational Exponent', formula: 'a^(m/n) = ⁿ√(aᵐ)' },
      { name: 'Imaginary Unit', formula: 'i = √(-1), i² = -1' },
      { name: 'Complex Number Form', formula: 'a + bi' },
      { name: 'Complex Conjugate', formula: '(a + bi)(a - bi) = a² + b²' },
    ],
  },
  'EXPONENTIAL AND LOGARITHMIC FUNCTIONS': {
    category: 'Exponential & Logarithmic Formulas',
    formulas: [
      { name: 'Exponential Function', formula: 'f(x) = abˣ' },
      { name: 'Exponential Growth/Decay', formula: 'A = A₀eᵏᵗ or A = A₀(1 ± r)ᵗ' },
      { name: 'Compound Interest', formula: 'A = P(1 + r/n)ⁿᵗ' },
      { name: 'Continuous Interest', formula: 'A = Peʳᵗ' },
      { name: 'Log Definition', formula: 'logₐ(b) = c ⟺ aᶜ = b' },
      { name: 'Product Rule (Log)', formula: 'log(ab) = log(a) + log(b)' },
      { name: 'Quotient Rule (Log)', formula: 'log(a/b) = log(a) - log(b)' },
      { name: 'Power Rule (Log)', formula: 'log(aⁿ) = n·log(a)' },
      { name: 'Change of Base', formula: 'logₐ(b) = log(b)/log(a)' },
    ],
  },
  'TRIGONOMETRIC FUNCTIONS': {
    category: 'Trigonometric Function Formulas',
    formulas: [
      { name: 'Unit Circle Definition', formula: 'cos(θ) = x, sin(θ) = y' },
      { name: 'Pythagorean Identity', formula: 'sin²(θ) + cos²(θ) = 1' },
      { name: 'Tangent Identity', formula: 'tan(θ) = sin(θ)/cos(θ)' },
      { name: 'Reciprocal Identities', formula: 'csc = 1/sin, sec = 1/cos, cot = 1/tan' },
      { name: 'Period of Sine/Cosine', formula: 'T = 2π/|B| for y = A·sin(Bx)' },
      { name: 'Amplitude', formula: '|A| for y = A·sin(Bx)' },
    ],
  },
  'SEQUENCES AND SERIES': {
    category: 'Sequence & Series Formulas',
    formulas: [
      { name: 'Arithmetic Sequence', formula: 'aₙ = a₁ + (n - 1)d' },
      { name: 'Arithmetic Sum', formula: 'Sₙ = n(a₁ + aₙ)/2' },
      { name: 'Geometric Sequence', formula: 'aₙ = a₁ × rⁿ⁻¹' },
      { name: 'Geometric Sum (Finite)', formula: 'Sₙ = a₁(1 - rⁿ)/(1 - r)' },
      { name: 'Geometric Sum (Infinite)', formula: 'S = a₁/(1 - r), |r| < 1' },
    ],
  },
  'PROBABILITY AND STATISTICS': {
    category: 'Probability Formulas',
    formulas: [
      { name: 'Basic Probability', formula: 'P(A) = favorable outcomes / total outcomes' },
      { name: 'Complement Rule', formula: 'P(A\') = 1 - P(A)' },
      { name: 'Addition Rule', formula: 'P(A or B) = P(A) + P(B) - P(A and B)' },
      { name: 'Multiplication Rule', formula: 'P(A and B) = P(A) × P(B|A)' },
      { name: 'Permutation', formula: 'P(n, r) = n! / (n - r)!' },
      { name: 'Combination', formula: 'C(n, r) = n! / [r!(n - r)!]' },
      { name: 'Binomial Probability', formula: 'P(X = k) = C(n,k) × pᵏ × (1-p)ⁿ⁻ᵏ' },
    ],
  },

  // Financial Math - Investment Bonds
  'INVESTMENT BONDS': {
    category: 'Bond Investment Formulas',
    formulas: [
      { name: 'Annual Coupon Payment', formula: 'Coupon = Face Value × Coupon Rate', description: 'Annual interest payment from bond' },
      { name: 'Semiannual Coupon Payment', formula: 'Payment = (Face Value × Coupon Rate) / 2', description: 'Payment received every 6 months' },
      { name: 'Total Coupon Payments', formula: 'Total = Coupon × Years × Payments per Year', description: 'All interest payments over bond life' },
      { name: 'Current Yield', formula: 'Current Yield = Annual Coupon / Purchase Price', description: 'Annual return based on current price' },
      { name: 'Total Return (Gain)', formula: 'Gain = (Face Value - Purchase Price) + Total Coupons', description: 'Total profit from bond investment' },
      { name: 'ROI Percentage', formula: 'ROI = (Total Gain / Purchase Price) × 100%', description: 'Return as percentage of investment' },
      { name: 'Yield to Maturity (Approx)', formula: 'YTM ≈ (Coupon + (Face - Price)/n) / ((Face + Price)/2)', description: 'Annualized total return if held to maturity' },
      { name: 'Bond Present Value', formula: 'PV = C × [1 - (1+r)⁻ⁿ]/r + F/(1+r)ⁿ', description: 'C=coupon, r=rate, n=periods, F=face value' },
      { name: 'Premium Bond', formula: 'Price > Face Value when Coupon Rate > Market Rate' },
      { name: 'Discount Bond', formula: 'Price < Face Value when Coupon Rate < Market Rate' },
    ],
  },
  'INVESTMENTS': {
    category: 'General Investment Formulas',
    formulas: [
      { name: 'Simple Interest', formula: 'I = P × r × t', description: 'P=principal, r=rate, t=time' },
      { name: 'Compound Interest', formula: 'A = P(1 + r/n)^(nt)', description: 'n=compounds per year' },
      { name: 'Continuous Compounding', formula: 'A = Pe^(rt)', description: 'Maximum compounding' },
      { name: 'Rule of 72', formula: 'Years to Double ≈ 72 / Interest Rate' },
      { name: 'Future Value', formula: 'FV = PV × (1 + r)^n' },
      { name: 'Present Value', formula: 'PV = FV / (1 + r)^n' },
      { name: 'Annuity Payment', formula: 'PMT = PV × r / [1 - (1+r)^(-n)]' },
    ],
  },

  // Precalculus
  'CONIC SECTIONS': {
    category: 'Conic Section Formulas',
    formulas: [
      { name: 'Circle', formula: '(x - h)² + (y - k)² = r²' },
      { name: 'Parabola (Vertical)', formula: '(x - h)² = 4p(y - k)' },
      { name: 'Parabola (Horizontal)', formula: '(y - k)² = 4p(x - h)' },
      { name: 'Ellipse', formula: '(x - h)²/a² + (y - k)²/b² = 1' },
      { name: 'Hyperbola', formula: '(x - h)²/a² - (y - k)²/b² = 1' },
    ],
  },
  'VECTORS AND PARAMETRIC EQUATIONS': {
    category: 'Vector Formulas',
    formulas: [
      { name: 'Vector Magnitude', formula: '|v| = √(x² + y²)' },
      { name: 'Unit Vector', formula: 'û = v/|v|' },
      { name: 'Dot Product', formula: 'u · v = u₁v₁ + u₂v₂ = |u||v|cos(θ)' },
      { name: 'Vector Addition', formula: 'u + v = (u₁ + v₁, u₂ + v₂)' },
      { name: 'Scalar Multiplication', formula: 'kv = (kv₁, kv₂)' },
    ],
  },
  'LIMITS AND INTRODUCTION TO CALCULUS': {
    category: 'Limit Formulas',
    formulas: [
      { name: 'Limit Definition', formula: 'lim(x→a) f(x) = L' },
      { name: 'Derivative Definition', formula: 'f\'(x) = lim(h→0) [f(x+h) - f(x)]/h' },
      { name: 'Power Rule', formula: 'd/dx[xⁿ] = nxⁿ⁻¹' },
      { name: 'Constant Rule', formula: 'd/dx[c] = 0' },
    ],
  },
};

// Helper function to get formulas for selected topics
export function getFormulasForTopics(topics: { category: string; topicName: string }[]): FormulaCategory[] {
  const formulaMap = new Map<string, FormulaCategory>();

  topics.forEach(topic => {
    // Try to match by category first
    if (FORMULA_REFERENCE[topic.category]) {
      formulaMap.set(topic.category, FORMULA_REFERENCE[topic.category]);
    }

    // Also try to find by topic name keywords
    Object.entries(FORMULA_REFERENCE).forEach(([key, value]) => {
      const topicLower = topic.topicName.toLowerCase();
      const categoryLower = topic.category.toLowerCase();
      const keyLower = key.toLowerCase();

      if (
        topicLower.includes(keyLower) ||
        categoryLower.includes(keyLower) ||
        keyLower.includes(topicLower.split(' ')[0])
      ) {
        formulaMap.set(key, value);
      }
    });
  });

  return Array.from(formulaMap.values());
}
