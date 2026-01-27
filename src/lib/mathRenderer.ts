/**
 * Math Text Renderer Utility
 * Converts plain text math notation and LaTeX to properly formatted Unicode symbols
 * for a fluid, textbook-like appearance.
 */

// LaTeX command to Unicode mappings
const latexCommands: Record<string, string> = {
  // Greek letters (LaTeX)
  '\\pi': 'π',
  '\\theta': 'θ',
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\Delta': 'Δ',
  '\\sigma': 'σ',
  '\\Sigma': 'Σ',
  '\\omega': 'ω',
  '\\Omega': 'Ω',
  '\\phi': 'φ',
  '\\Phi': 'Φ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\rho': 'ρ',
  '\\tau': 'τ',
  '\\epsilon': 'ε',
  '\\infty': '∞',
  
  // Relations (LaTeX)
  '\\neq': '≠',
  '\\ne': '≠',
  '\\leq': '≤',
  '\\le': '≤',
  '\\geq': '≥',
  '\\ge': '≥',
  '\\approx': '≈',
  '\\sim': '~',
  '\\equiv': '≡',
  '\\cong': '≅',
  '\\pm': '±',
  '\\mp': '∓',
  '\\times': '×',
  '\\div': '÷',
  '\\cdot': '·',
  '\\ast': '*',
  
  // Arrows (LaTeX)
  '\\rightarrow': '→',
  '\\to': '→',
  '\\leftarrow': '←',
  '\\leftrightarrow': '↔',
  '\\Rightarrow': '⇒',
  '\\Leftarrow': '⇐',
  '\\Leftrightarrow': '⇔',
  
  // Geometry (LaTeX)
  '\\angle': '∠',
  '\\perp': '⊥',
  '\\parallel': '∥',
  '\\triangle': '△',
  '\\circ': '°',
  
  // Set theory (LaTeX)
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\subseteq': '⊆',
  '\\supset': '⊃',
  '\\cup': '∪',
  '\\cap': '∩',
  '\\emptyset': '∅',
  '\\forall': '∀',
  '\\exists': '∃',
  
  // Calculus (LaTeX)
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\int': '∫',
  '\\sum': 'Σ',
  '\\prod': '∏',
  '\\sqrt': '√',
  
  // Misc (LaTeX)
  '\\therefore': '∴',
  '\\because': '∵',
  '\\ldots': '…',
  '\\cdots': '⋯',
  '\\prime': '′',
  '\\degree': '°',
  '\\%': '%',
  '\\ ': ' ',
  '\\,': ' ',
  '\\;': ' ',
  '\\quad': '  ',
  '\\qquad': '    ',
};

// Symbol mapping for common math notation (plain text)
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
  // 'circle' removed - keep as word to avoid "○" → "o" corruption in PDF sanitization
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

// Subscript digits - now includes 'y' for coordinate notation
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
  'y': 'ᵧ',
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
 * Converts LaTeX commands to Unicode symbols
 * Handles common LaTeX like \neq, \geq, \frac{}{}, etc.
 */
function convertLatex(text: string): string {
  let result = text;
  
  // Remove $ delimiters from inline math
  result = result.replace(/\$([^$]+)\$/g, '$1');
  
  // Handle \frac{numerator}{denominator} -> numerator/denominator or (numerator)/(denominator)
  result = result.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (match, num, denom) => {
    // For simple single-char fractions, try Unicode
    const fracKey = `${num}/${denom}`;
    if (fractions[fracKey]) {
      return fractions[fracKey];
    }
    // For complex fractions, use parentheses format
    const cleanNum = num.length > 1 ? `(${num})` : num;
    const cleanDenom = denom.length > 1 ? `(${denom})` : denom;
    return `${cleanNum}/${cleanDenom}`;
  });
  
  // Handle nested fracs (second pass for nested structures)
  result = result.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (match, num, denom) => {
    const cleanNum = num.length > 1 ? `(${num})` : num;
    const cleanDenom = denom.length > 1 ? `(${denom})` : denom;
    return `${cleanNum}/${cleanDenom}`;
  });
  
  // Handle \sqrt{content} -> √(content) or √content
  result = result.replace(/\\sqrt\{([^{}]+)\}/g, (match, content) => {
    return content.length > 1 ? `√(${content})` : `√${content}`;
  });
  
  // Handle \text{content} - just extract the content
  result = result.replace(/\\text\{([^{}]+)\}/g, '$1');
  
  // Handle \left and \right (just remove them, keep the brackets)
  result = result.replace(/\\left\s*/g, '');
  result = result.replace(/\\right\s*/g, '');
  
  // Handle \{ and \} -> { and }
  result = result.replace(/\\\{/g, '{');
  result = result.replace(/\\\}/g, '}');
  
  // Sort LaTeX commands by length (longest first) to avoid partial replacements
  const sortedLatex = Object.entries(latexCommands)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [cmd, symbol] of sortedLatex) {
    // Escape special regex characters in the command
    const escaped = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), symbol);
  }
  
  // Clean up any remaining backslashes before common words (like \sin, \cos, \tan, \log, \ln)
  result = result.replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|exp)\b/g, '$1');
  
  // Remove any remaining single backslashes that might be left over
  result = result.replace(/\\([a-zA-Z]+)/g, '$1');
  
  return result;
}

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
  
  // Handle sqrt followed by a number or expression (sqrt3 -> √3, sqrt(3) -> √(3))
  result = result.replace(/\bsqrt\s*\(/gi, '√(');
  result = result.replace(/\bsqrt\s*(\d+)/gi, '√$1');
  result = result.replace(/\bsqrt\b/gi, '√');
  
  // Handle theta in all contexts (including after trig functions like "cos theta", "sin theta")
  result = result.replace(/\btheta\b/gi, 'θ');
  
  // Handle pi in all contexts - including 2pi, npi patterns
  result = result.replace(/(\d+)\s*pi\b/gi, '$1π');  // 2pi -> 2π
  result = result.replace(/\bn\s*pi\b/gi, 'nπ');     // npi -> nπ
  result = result.replace(/\bpi\b/gi, 'π');          // standalone pi
  
  // Sort by length (longer first) to avoid partial replacements
  const sortedSymbols = Object.entries(mathSymbols)
    .filter(([word]) => !['pi', 'theta', 'sqrt'].includes(word.toLowerCase())) // Skip already handled
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [word, symbol] of sortedSymbols) {
    // Use word boundaries for word-like symbols, exact match for operators
    if (/^[a-zA-Z]+$/.test(word)) {
      result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), symbol);
    } else {
      result = result.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), symbol);
    }
  }
  
  // Handle comparison operators that might have spaces around them
  result = result.replace(/\s*<=\s*/g, ' ≤ ');
  result = result.replace(/\s*>=\s*/g, ' ≥ ');
  result = result.replace(/\s*!=\s*/g, ' ≠ ');
  
  // Handle exponents in context like sin^2, cos^2, tan^2
  result = result.replace(/(sin|cos|tan|cot|sec|csc)\^2/gi, '$1²');
  result = result.replace(/(sin|cos|tan|cot|sec|csc)\^3/gi, '$1³');
  
  return result;
}

/**
 * Keywords that indicate a money/currency context
 */
const moneyContextKeywords = [
  'cost', 'costs', 'price', 'prices', 'priced',
  'profit', 'profits', 'revenue', 'revenues',
  'earn', 'earns', 'earned', 'earning', 'earnings',
  'spend', 'spends', 'spent', 'spending',
  'pay', 'pays', 'paid', 'paying', 'payment',
  'save', 'saves', 'saved', 'saving', 'savings',
  'charge', 'charges', 'charged', 'charging',
  'sell', 'sells', 'sold', 'selling',
  'buy', 'buys', 'bought', 'buying',
  'money', 'dollar', 'dollars', 'cent', 'cents',
  'budget', 'budgets', 'budgeted',
  'fee', 'fees', 'tax', 'taxes',
  'discount', 'discounts', 'discounted',
  'tip', 'tips', 'tipped', 'tipping',
  'salary', 'salaries', 'wage', 'wages',
  'income', 'expense', 'expenses',
  'balance', 'deposit', 'deposits', 'withdrawal', 'withdrawals',
  'account', 'bank', 'loan', 'loans',
  'interest', 'principal', 'amount owed', 'total cost',
  'per item', 'each item', 'unit price', 'sale price',
  'regular price', 'original price', 'final price',
  'markup', 'markdown', 'wholesale', 'retail',
];

/**
 * Formats currency values in text when money context is detected
 * Converts bare decimal numbers like "4.00" to "$4.00" and adds "dollars" for clarity
 */
export function formatCurrency(text: string): string {
  if (!text) return '';
  
  // Check if text contains money-related keywords
  const lowerText = text.toLowerCase();
  const hasMoneyContext = moneyContextKeywords.some(keyword => lowerText.includes(keyword));
  
  if (!hasMoneyContext) {
    return text;
  }
  
  let result = text;
  
  // Pattern 1: Numbers with exactly 2 decimal places that don't already have $ (e.g., "4.00", "12.50", "100.99")
  // Exclude measurements, percentages, and other non-currency decimals
  result = result.replace(/(?<!\$)(?<!\d)\b(\d{1,})\.(00|[0-9]{2})\b(?!\s*(?:dollars?|cents?|%|degrees?|°|cm|m|ft|in|kg|lb|g|oz|ml|L|hours?|minutes?|seconds?|years?|months?|days?|miles?|km))(?!\d)/gi, (match, whole, cents) => {
    return `$${whole}.${cents}`;
  });
  
  // Pattern 2: Whole numbers followed by "dollars" or "cents" - add $ sign if missing
  result = result.replace(/(?<!\$)\b(\d+)\s+(dollars?)\b/gi, '$$$1 $2');
  result = result.replace(/(?<!\$)\b(\d+)\s+(cents?)\b/gi, '$1 $2'); // cents stay as is
  
  // Pattern 3: Numbers in context phrases like "costs 5" or "price of 10" 
  // Add $ and format properly
  result = result.replace(/\b(costs?|priced? at|charges?|pays?|earns?|spends?|saves?|sells? for|bought for|sold for|worth)\s+(?<!\$)(\d+(?:\.\d{2})?)\b(?!\s*(?:dollars?|cents?|%))/gi, 
    (match, verb, amount) => {
      const formattedAmount = amount.includes('.') ? amount : `${amount}.00`;
      return `${verb} $${formattedAmount}`;
    }
  );
  
  // Pattern 4: "of X" patterns like "profit of 25" -> "profit of $25.00"
  result = result.replace(/\b(profit|revenue|income|savings?|balance|total|discount|fee|tax|tip|cost|price|amount|loss)\s+of\s+(?<!\$)(\d+(?:\.\d{2})?)\b(?!\s*(?:dollars?|cents?|%))/gi,
    (match, noun, amount) => {
      const formattedAmount = amount.includes('.') ? amount : `${amount}.00`;
      return `${noun} of $${formattedAmount}`;
    }
  );
  
  // Pattern 5: Standalone currency amounts at end of sentence or before punctuation
  // e.g., "The answer is 25.50." -> "The answer is $25.50."
  result = result.replace(/\b(?:is|was|equals?|=|totals?|makes?)\s+(?<!\$)(\d+\.\d{2})(?=\s*[.,;:?!]|\s*$)/gi,
    (match, amount) => {
      return match.replace(amount, `$${amount}`);
    }
  );
  
  // Pattern 6: Add "dollars" after standalone $ amounts that don't have it
  // Only add if the amount is followed by a period, comma, or end of sentence
  // and doesn't already have "dollars" or "cents" after it
  result = result.replace(/(\$\d+\.\d{2})(?=\s*[.,;:?!]|\s*$)(?!\s*(?:dollars?|cents?|each|per|for))/gi,
    (match) => `${match} dollars`
  );
  
  // Cleanup: Remove double dollar signs if any were introduced
  result = result.replace(/\$\$/g, '$');
  
  return result;
}

/**
 * Main function to render math text with proper Unicode symbols
 * Transforms plain text math notation and LaTeX into beautifully formatted text
 */
export function renderMathText(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Apply transformations in order - LaTeX first, then plain text
  result = convertLatex(result);
  result = convertSymbols(result);
  result = convertExponents(result);
  result = convertSubscripts(result);
  result = convertFractions(result);
  
  // Apply currency formatting for money contexts
  result = formatCurrency(result);
  
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

/**
 * Sanitizes text for PDF rendering by converting ALL Unicode math symbols to ASCII equivalents.
 * jsPDF's default Helvetica font has LIMITED Unicode support, so we convert everything to
 * ASCII text that renders reliably across all systems.
 * 
 * This ensures math problems display correctly without "Â [ ]" corruption or missing symbols.
 */
export function sanitizeForPDF(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // CRITICAL FIX: First check for and fix ampersand-interleaved text pattern
  if (result.includes('&') && /&[a-zA-Z]&/.test(result)) {
    result = result.replace(/&([a-zA-Z])(?=&|$|\s)/g, '$1');
    result = result.replace(/^&([a-zA-Z])/g, '$1');
    result = result.replace(/&+/g, ' ');
    result = result.replace(/\s+/g, ' ').trim();
  }
  
  // First, remove or replace emoji characters that cause corruption in PDF
  const emojiReplacements: [RegExp, string][] = [
    [/📋/g, ''],
    [/💡/g, '->'],
    [/✨/g, '*'],
    [/📝/g, ''],
    [/🎉/g, ''],
    [/✓/g, 'v'],
    [/✗/g, 'x'],
    [/★/g, '*'],
    [/☆/g, '*'],
    [/•/g, '-'],
    [/○/g, 'circle'],
    [/●/g, '*'],
    [/□/g, '[ ]'],
    [/■/g, '[x]'],
    [/▢/g, '[ ]'],
    [/△/g, 'triangle'],
    [/▲/g, 'triangle'],
    [/◯/g, 'O'],
    [/[\u{1F300}-\u{1F9FF}]/gu, ''],
    [/[\u{2600}-\u{26FF}]/gu, ''],
    [/[\u{2700}-\u{27BF}]/gu, ''],
    [/[\u{FE00}-\u{FE0F}]/gu, ''],
    [/[\u{1F000}-\u{1F02F}]/gu, ''],
    [/[\u{1F0A0}-\u{1F0FF}]/gu, ''],
  ];
  
  for (const [pattern, replacement] of emojiReplacements) {
    result = result.replace(pattern, replacement);
  }
  
  // CRITICAL: Fix common PDF corruption patterns - Â followed by symbols/quotes
  // These patterns appear when Unicode is incorrectly encoded
  const pdfCorruptionPatterns: [RegExp, string][] = [
    // "Â "H" pattern -> pi (pi symbol that got corrupted)
    [/Â\s*"H/gi, 'pi'],
    [/Â\s*"\s*H/gi, 'pi'],
    [/Â\s*"\s*\[\s*\]/gi, 'pi'],
    [/Â\s*\[\s*\]/gi, 'pi'],
    
    // Handle the pattern "Â [ ]" which should be pi
    [/Ã\s*\[\s*\]/g, 'pi'],
    [/Â\s*(?:\[\s*\]|□|�)/g, 'pi'],
    
    // Common pi corruption when followed by units
    [/Ã\s+(?=inches|cm|meters|units|square|cubic)/gi, 'pi '],
    [/Â\s+(?=inches|cm|meters|units|square|cubic)/gi, 'pi '],
    
    // Standalone Â before pi or numbers - likely corrupted pi
    [/Â\s*π/g, 'pi'],
    [/Âπ/g, 'pi'],
    [/πÂ/g, 'pi'],
    
    // Fix corrupted degree, superscripts, fractions with Â prefix
    [/Â°/g, ' degrees'],
    [/°Â/g, ' degrees'],
    [/Â²/g, '^2'],
    [/Â³/g, '^3'],
    [/Â¹/g, '^1'],
    [/Â½/g, '1/2'],
    [/Â¼/g, '1/4'],
    [/Â¾/g, '3/4'],
    [/Â±/g, '+/-'],
    [/Â·/g, '*'],
    
    // Greek letters mojibake - convert to text
    [/Ï€/g, 'pi'],
    [/Î¸/g, 'theta'],
    [/Î±/g, 'alpha'],
    [/Î²/g, 'beta'],
    [/Î³/g, 'gamma'],
    [/Î"/g, 'Delta'],
    [/Î´/g, 'delta'],
    [/Ïˆ/g, 'psi'],
    [/Ï†/g, 'phi'],
    [/Î£/g, 'Sigma'],
    [/Ïƒ/g, 'sigma'],
    [/Î©/g, 'Omega'],
    [/Ï‰/g, 'omega'],
    [/Î»/g, 'lambda'],
    [/Î¼/g, 'mu'],
    
    // Math operators mojibake - convert to ASCII
    [/â‰¤/g, '<='],
    [/â‰¥/g, '>='],
    [/â‰ /g, '!='],
    [/â†'/g, '->'],
    [/âˆš/g, 'sqrt'],
    [/âˆž/g, 'infinity'],
    [/Ã—/g, 'x'],
    [/Ã·/g, '/'],
    [/â€"/g, '-'],
    [/â€™/g, "'"],
    [/â€œ/g, '"'],
    [/â€/g, '"'],
    
    // Corrupted emoji patterns
    [/Ø=Ü[¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿]?/g, ''],
    [/Ã˜=Ã[^\s]*/g, ''],
    
    // Clean up remaining stray Â and Ã characters
    [/Â(?=\d)/g, ''],
    [/(\d)Â\s/g, '$1 '],
    [/Â\s+/g, ' '],
    [/\s+Â/g, ' '],
    [/Â(?![a-zA-Z0-9])/g, ''],
    [/Ã(?![a-zA-Z0-9])/g, ''],
  ];
  
  for (const [pattern, replacement] of pdfCorruptionPatterns) {
    result = result.replace(pattern, replacement);
  }
  
  // Convert ALL Unicode math symbols to ASCII equivalents for reliable PDF rendering
  // Order matters: longer patterns first to avoid partial replacements
  const unicodeToAscii: [RegExp, string][] = [
    // Greek letters - convert to spelled-out names
    [/π/g, 'pi'],
    [/θ/g, 'theta'],
    [/α/g, 'alpha'],
    [/β/g, 'beta'],
    [/γ/g, 'gamma'],
    [/δ/g, 'delta'],
    [/Δ/g, 'Delta'],
    [/ε/g, 'epsilon'],
    [/σ/g, 'sigma'],
    [/Σ/g, 'Sigma'],
    [/ω/g, 'omega'],
    [/Ω/g, 'Omega'],
    [/φ/g, 'phi'],
    [/Φ/g, 'Phi'],
    [/ψ/g, 'psi'],
    [/λ/g, 'lambda'],
    [/μ/g, 'mu'],
    [/ρ/g, 'rho'],
    [/τ/g, 'tau'],
    
    // Math operators and relations
    [/≤/g, '<='],
    [/≥/g, '>='],
    [/≠/g, '!='],
    [/≈/g, '~='],
    [/≡/g, '==='],
    [/±/g, '+/-'],
    [/∓/g, '-/+'],
    [/×/g, 'x'],
    [/÷/g, '/'],
    [/·/g, '*'],
    [/√/g, 'sqrt'],
    [/∞/g, 'infinity'],
    
    // Arrows
    [/→/g, '->'],
    [/←/g, '<-'],
    [/↔/g, '<->'],
    [/⇒/g, '=>'],
    [/⇐/g, '<='],
    [/⇔/g, '<=>'],
    
    // Geometry symbols
    [/∠/g, 'angle'],
    [/⊥/g, 'perp'],
    [/∥/g, '||'],
    [/≅/g, '~='],
    [/°/g, ' degrees'],
    
    // Set theory
    [/∈/g, 'in'],
    [/∉/g, 'not in'],
    [/⊂/g, 'subset'],
    [/⊆/g, 'subset='],
    [/⊃/g, 'superset'],
    [/∪/g, 'union'],
    [/∩/g, 'intersection'],
    [/∅/g, 'empty set'],
    [/∀/g, 'for all'],
    [/∃/g, 'exists'],
    
    // Calculus
    [/∂/g, 'd'],
    [/∇/g, 'nabla'],
    [/∫/g, 'integral'],
    [/∏/g, 'product'],
    
    // Logic and misc
    [/∴/g, 'therefore'],
    [/∵/g, 'because'],
    [/…/g, '...'],
    [/⋯/g, '...'],
    [/′/g, "'"],
    [/″/g, "''"],
    
    // Superscript numbers - convert to ^n format
    [/⁰/g, '^0'],
    [/¹/g, '^1'],
    [/²/g, '^2'],
    [/³/g, '^3'],
    [/⁴/g, '^4'],
    [/⁵/g, '^5'],
    [/⁶/g, '^6'],
    [/⁷/g, '^7'],
    [/⁸/g, '^8'],
    [/⁹/g, '^9'],
    [/⁺/g, '^+'],
    [/⁻/g, '^-'],
    [/⁼/g, '^='],
    [/⁽/g, '^('],
    [/⁾/g, '^)'],
    [/ⁿ/g, '^n'],
    [/ˣ/g, '^x'],
    [/ʸ/g, '^y'],
    
    // Subscript numbers - convert to _n format
    [/₀/g, '_0'],
    [/₁/g, '_1'],
    [/₂/g, '_2'],
    [/₃/g, '_3'],
    [/₄/g, '_4'],
    [/₅/g, '_5'],
    [/₆/g, '_6'],
    [/₇/g, '_7'],
    [/₈/g, '_8'],
    [/₉/g, '_9'],
    [/₊/g, '_+'],
    [/₋/g, '_-'],
    [/₌/g, '_='],
    [/₍/g, '_('],
    [/₎/g, '_)'],
    [/ₐ/g, '_a'],
    [/ₑ/g, '_e'],
    [/ᵢ/g, '_i'],
    [/ₙ/g, '_n'],
    [/ₓ/g, '_x'],
    [/ᵧ/g, '_y'],
    
    // Unicode fractions - convert to a/b format
    [/½/g, '1/2'],
    [/⅓/g, '1/3'],
    [/⅔/g, '2/3'],
    [/¼/g, '1/4'],
    [/¾/g, '3/4'],
    [/⅕/g, '1/5'],
    [/⅖/g, '2/5'],
    [/⅗/g, '3/5'],
    [/⅘/g, '4/5'],
    [/⅙/g, '1/6'],
    [/⅚/g, '5/6'],
    [/⅛/g, '1/8'],
    [/⅜/g, '3/8'],
    [/⅝/g, '5/8'],
    [/⅞/g, '7/8'],
  ];
  
  for (const [pattern, replacement] of unicodeToAscii) {
    result = result.replace(pattern, replacement);
  }
  
  // Clean up spacing around converted symbols
  // Fix patterns like "2pi" -> "2 pi" and "pipounds" -> "pi pounds"
  result = result.replace(/(\d)(pi|theta|alpha|beta|gamma|delta|sigma|omega|phi|lambda|mu|rho|tau)(?=\s|$|[^a-zA-Z])/gi, '$1 $2');
  result = result.replace(/(pi|theta|alpha|beta|gamma|delta|sigma|omega|phi|lambda|mu|rho|tau)([a-zA-Z])/gi, '$1 $2');
  
  // Fix spacing around "degrees" and other units
  result = result.replace(/(\d)\s*degrees/gi, '$1 degrees');
  result = result.replace(/degrees([a-zA-Z])/gi, 'degrees $1');
  
  // Clean consecutive operators and fix spacing
  result = result.replace(/\^\s*\^/g, '^');
  result = result.replace(/_\s*_/g, '_');
  
  // Final cleanup: Remove any remaining problematic characters
  // Keep only ASCII printable characters (0x20-0x7E)
  result = result.replace(/[^\x20-\x7E]/g, '');
  
  // Clean up multiple spaces and trim
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Fix encoding corruption in text (mojibake patterns)
 * Use this to clean up text that may have encoding issues
 * without converting Unicode symbols to ASCII
 */
export function fixEncodingCorruption(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // CRITICAL FIX: First check for and fix ampersand-interleaved text pattern
  // Pattern like "&l&n& &r&i&g&h&t& &t&r&i&a&n&g&l&e&" should become "In a right triangle"
  // This happens when text is corrupted during encoding
  if (result.includes('&') && /&[a-zA-Z]&/.test(result)) {
    // Remove all ampersands that appear between single characters
    result = result.replace(/&([a-zA-Z])(?=&|$|\s)/g, '$1');
    result = result.replace(/^&([a-zA-Z])/g, '$1');
    // Also handle pattern at word boundaries
    result = result.replace(/&+/g, ' ');
    result = result.replace(/\s+/g, ' ').trim();
  }
  
  // Fix mojibake patterns (UTF-8 decoded as Latin-1)
  const mojibakePatterns: [RegExp, string][] = [
    // Common interval corruption patterns (0 ≤ θ < 2π)
    [/\(0\s*"d"\s*,?\s*<?=?\s*2Å\)/gi, '(0 ≤ θ < 2π)'],
    [/\(0\s*"d"\s*,?\s*<?=?\s*2À\)/gi, '(0 ≤ θ < 2π)'],
    [/\(0\s*"d"\s*,?\s*<?=?\s*2"A"\)/gi, '(0 ≤ θ < 2π)'],
    [/0\s*≤\s*"d"\s*<\s*2"A"/gi, '0 ≤ θ < 2π'],
    [/0\s*≤\s*"d"\s*<\s*2Å/gi, '0 ≤ θ < 2π'],
    [/0\s*≤\s*"d"\s*<\s*2À/gi, '0 ≤ θ < 2π'],
    [/0\s*"d"\s*,?\s*<\s*2Å/gi, '0 ≤ θ < 2π'],
    [/0\s*"d"\s*,?\s*<\s*2À/gi, '0 ≤ θ < 2π'],
    [/0"d"</g, '0 ≤ θ <'],
    [/"d\s*,/g, 'θ ≤'],
    [/"d,/g, 'θ ≤'],

    // Theta corruption patterns
    [/"d"/g, 'θ'],
    [/"d/g, 'θ'],
    [/d"/g, 'θ'],
    [/Ã¸/g, 'θ'],
    [/θ̈/g, 'θ'],
    [/ø/g, 'θ'],

    // Pi corruption patterns
    [/"A\)/g, 'π)'],
    [/\("A/g, '(π'],
    [/2"A/g, '2π'],
    [/"A"/g, 'π'],
    [/"A/g, 'π'],
    [/2Å/g, '2π'],
    [/Å/g, 'π'],
    [/2À/g, '2π'],
    [/À/g, 'π'],
    [/Ã€/g, 'π'],
    [/Ã\s*\[\s*\]/g, 'π'],  // "Ã [ ]" pattern -> π
    [/Â\s*(?:\[\s*\]|□|�)/g, 'π'], // "Â [ ]" or placeholder square -> π
    [/Ã\s+/g, 'π'],          // "Ã " with trailing space -> π
    [/Ã(?=\s*inches|\s*cm|\s*meters|\s*units|\s*square|\s*cubic)/gi, 'π'], // Ã before units -> π
    [/ð/g, 'π'],

    // Subscript corruption patterns (w• -> w₁, w, -> w₂, wƒ -> w₃)
    [/([a-zA-Z])•(?=\s|[=+\-*/),.;:?!]|$)/g, '$1₁'],
    [/([a-zA-Z])â€¢(?=\s|[=+\-*/),.;:?!]|$)/g, '$1₁'],
    [/([a-zA-Z])·(?=\s|[=+\-*/),.;:?!]|$)/g, '$1₁'],
    [/([a-zA-Z])¹(?=\s|[=+\-*/),.;:?!]|$)/g, '$1₁'],
    [/([a-zA-Z]),\s*(?=and|or|\+|-|=|is|the|that|when|if|has|have)/gi, '$1₂ '],
    [/([a-zA-Z]),(?=\s*[=+\-*/)\d])/g, '$1₂'],
    [/([a-zA-Z])²(?=\s+and|\s+or)/gi, '$1₂'],
    [/([a-zA-Z])ƒ(?=\s|[=+\-*/),.;:?!]|$)/g, '$1₃'],
    [/([a-zA-Z])Æ'(?=\s|[=+\-*/),.;:?!]|$)/g, '$1₃'],

    // Greek letters
    [/Ï€/g, 'π'],
    [/Î¸/g, 'θ'],
    [/Î±/g, 'α'],
    [/Î²/g, 'β'],
    [/Î³/g, 'γ'],
    [/Î"/g, 'Δ'],
    [/Î´/g, 'δ'],
    [/Ïˆ/g, 'ψ'],
    [/Ï†/g, 'φ'],
    [/Î£/g, 'Σ'],
    [/Ïƒ/g, 'σ'],
    [/Î©/g, 'Ω'],
    [/Ï‰/g, 'ω'],
    [/Î»/g, 'λ'],
    [/Î¼/g, 'μ'],
    
    // Math operators
    [/â‰¤/g, '≤'],
    [/â‰¥/g, '≥'],
    [/â‰ /g, '≠'],
    [/â†'/g, '→'],
    [/âˆš/g, '√'],
    [/âˆž/g, '∞'],
    [/Ã—/g, '×'],
    [/Ã·/g, '÷'],
    [/âˆ /g, '∠'],
    [/âŠ¥/g, '⊥'],
    [/â‰…/g, '≅'],
    [/âˆ†/g, '△'],
    
    // Common Â prefix patterns
    [/Â\s*π/g, 'π'],
    [/Âπ/g, 'π'],
    [/πÂ/g, 'π'],
    [/Â°/g, '°'],
    [/°Â/g, '°'],
    [/Â²/g, '²'],
    [/Â³/g, '³'],
    [/Â½/g, '½'],
    [/Â¼/g, '¼'],
    [/Â¾/g, '¾'],
    [/Â±/g, '±'],
    [/Â·/g, '·'],
    
    // Fix numbers followed by Â (often corrupted π in "terms of π")
    [/(\d)Â(?=\s|$|\.)/g, '$1π'],
    [/(\d)Â\s*cm/gi, '$1π cm'],
    [/(\d)Â\s*cubic/gi, '$1π cubic'],
    [/(\d)Â\s*square/gi, '$1π square'],
    
    // Clean up remaining stray characters
    [/Â\s+/g, ' '],
    [/\s+Â/g, ' '],
    [/Â(?![a-zA-Z0-9])/g, ''],
  ];
  
  for (const [pattern, replacement] of mojibakePatterns) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

export { mathSymbols, superscripts, subscripts, fractions };

/**
 * Cleans text for print-safe output by removing problematic characters
 * and ensuring proper encoding
 */
export function cleanTextForPrint(text: string): string {
  if (!text) return '';
  
  // First fix any encoding corruption
  let result = fixEncodingCorruption(text);
  
  // Then render math symbols
  result = renderMathText(result);
  
  return result;
}
