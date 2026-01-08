/**
 * Math Text Renderer Utility
 * Converts plain text math notation to properly formatted Unicode symbols
 * for a fluid, textbook-like appearance.
 */

// Symbol mapping for common math notation
const mathSymbols: Record<string, string> = {
  // Greek letters
  'pi': 'π',
  'PI': 'π',
  'Pi': 'π',
  'theta': 'θ',
  'Theta': 'θ',
  'alpha': 'α',
  'beta': 'β',
  'gamma': 'γ',
  'delta': 'δ',
  'Delta': 'Δ',
  'sigma': 'σ',
  'Sigma': 'Σ',
  'omega': 'ω',
  'Omega': 'Ω',
  'phi': 'φ',
  'Phi': 'Φ',
  'lambda': 'λ',
  'mu': 'μ',
  'rho': 'ρ',
  'tau': 'τ',
  
  // Operations and relations
  'sqrt': '√',
  '<=': '≤',
  '>=': '≥',
  '!=': '≠',
  '+-': '±',
  'approx': '≈',
  'infinity': '∞',
  'inf': '∞',
  
  // Geometry
  'angle': '∠',
  'degrees': '°',
  'deg': '°',
  'perp': '⊥',
  'parallel': '∥',
  'congruent': '≅',
  'similar': '~',
  'triangle': '△',
  'circle': '○',
  'square': '□',
  
  // Arrows
  '->': '→',
  '<-': '←',
  '<->': '↔',
  '=>': '⇒',
  
  // Other math symbols
  'therefore': '∴',
  'because': '∵',
  'element': '∈',
  'subset': '⊂',
  'union': '∪',
  'intersection': '∩',
  'times': '×',
  'div': '÷',
  'cdot': '·',
  'bullet': '•',
  'prime': '′',
  'dprime': '″',
};

// Superscript digits for exponents
const superscripts: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'n': 'ⁿ',
  'x': 'ˣ',
  'y': 'ʸ',
};

// Subscript digits
const subscripts: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'i': 'ᵢ',
  'n': 'ₙ',
  'x': 'ₓ',
};

// Fractions
const fractions: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/6': '⅙',
  '5/6': '⅚',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
};

/**
 * Converts plain text exponents (like x^2 or x^n) to superscript Unicode
 */
function convertExponents(text: string): string {
  // Pattern: something^{content} or something^content (single char or digit sequence)
  return text.replace(/\^{([^}]+)}|\^(\d+|[a-z])/gi, (match, braced, simple) => {
    const content = braced || simple;
    return content.split('').map((char: string) => superscripts[char] || char).join('');
  });
}

/**
 * Converts plain text subscripts (like x_1 or a_n) to subscript Unicode
 */
function convertSubscripts(text: string): string {
  // Pattern: something_{content} or something_content (single char or digit sequence)
  return text.replace(/_{([^}]+)}|_(\d+|[a-z])/gi, (match, braced, simple) => {
    const content = braced || simple;
    return content.split('').map((char: string) => subscripts[char] || char).join('');
  });
}

/**
 * Converts common fractions to Unicode fraction characters
 */
function convertFractions(text: string): string {
  let result = text;
  for (const [fraction, symbol] of Object.entries(fractions)) {
    result = result.replace(new RegExp(fraction.replace('/', '\\/'), 'g'), symbol);
  }
  return result;
}

/**
 * Converts math symbols (pi, sqrt, etc.) to Unicode
 */
function convertSymbols(text: string): string {
  let result = text;
  
  // Sort by length (longer first) to avoid partial replacements
  const sortedSymbols = Object.entries(mathSymbols)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [word, symbol] of sortedSymbols) {
    // Use word boundaries for word-like symbols, exact match for operators
    if (/^[a-zA-Z]+$/.test(word)) {
      result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), symbol);
    } else {
      result = result.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), symbol);
    }
  }
  
  return result;
}

/**
 * Main function to render math text with proper Unicode symbols
 * Transforms plain text math notation into beautifully formatted text
 */
export function renderMathText(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Apply transformations in order
  result = convertSymbols(result);
  result = convertExponents(result);
  result = convertSubscripts(result);
  result = convertFractions(result);
  
  return result;
}

/**
 * Formats a math expression for display (wraps in styling)
 */
export function formatMathExpression(expression: string): string {
  return renderMathText(expression);
}

/**
 * Splits text into regular text and math expressions
 * Math expressions are wrapped in $ signs (LaTeX-style)
 */
export function parseMathText(text: string): Array<{ type: 'text' | 'math'; content: string }> {
  const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
  const regex = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the math expression
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Add the math expression
    parts.push({ type: 'math', content: renderMathText(match[1]) });
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  return parts;
}

export { mathSymbols, superscripts, subscripts, fractions };
