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
 * Sanitizes text for PDF rendering while preserving Unicode math symbols
 * jsPDF CAN render Unicode math symbols (π, θ, √, ², ≤, ≥) with Helvetica font
 * This function removes problematic characters like emojis while keeping math symbols
 */
export function sanitizeForPDF(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // First, remove or replace emoji characters that cause corruption in PDF
  // These emojis render as garbled text like "Ø=Ü¡" in jsPDF
  const emojiReplacements: [RegExp, string][] = [
    // Common emojis used in worksheets - replace with text or simple symbols
    [/📋/g, ''],          // clipboard - remove
    [/💡/g, '->'],        // lightbulb -> arrow for hints
    [/✨/g, '*'],         // sparkles
    [/📝/g, ''],          // memo/pencil
    [/🎉/g, ''],          // party popper
    [/✓/g, 'v'],          // checkmark
    [/✗/g, 'x'],          // x mark
    [/★/g, '*'],          // star
    [/☆/g, '*'],          // white star
    [/•/g, '-'],          // bullet
    [/○/g, 'o'],          // circle
    [/●/g, '*'],          // filled circle
    [/□/g, '[ ]'],        // empty square
    [/■/g, '[x]'],        // filled square
    [/▢/g, '[ ]'],        // white square
    [/△/g, 'triangle '],  // triangle
    [/▲/g, 'triangle '],  // filled triangle
    [/◯/g, 'O'],          // large circle
    // Remove any other emoji characters (Unicode emoji ranges)
    [/[\u{1F300}-\u{1F9FF}]/gu, ''],  // Miscellaneous Symbols and Pictographs, Emoticons, etc.
    [/[\u{2600}-\u{26FF}]/gu, ''],    // Miscellaneous Symbols
    [/[\u{2700}-\u{27BF}]/gu, ''],    // Dingbats
    [/[\u{FE00}-\u{FE0F}]/gu, ''],    // Variation Selectors
    [/[\u{1F000}-\u{1F02F}]/gu, ''],  // Mahjong Tiles
    [/[\u{1F0A0}-\u{1F0FF}]/gu, ''],  // Playing Cards
  ];
  
  for (const [pattern, replacement] of emojiReplacements) {
    result = result.replace(pattern, replacement);
  }
  
  // Fix any existing encoding corruption patterns (mojibake)
  // These patterns occur when UTF-8 text is incorrectly decoded as Latin-1
  const mojibakePatterns: [RegExp, string][] = [
    // Greek letters mojibake - convert to proper Unicode symbols
    [/Ï€/g, 'π'],        // π
    [/Î¸/g, 'θ'],        // θ
    [/Î±/g, 'α'],        // α
    [/Î²/g, 'β'],        // β
    [/Î³/g, 'γ'],        // γ
    [/Î"/g, 'Δ'],        // Δ
    [/Î´/g, 'δ'],        // δ
    [/Ïˆ/g, 'ψ'],        // ψ
    [/Ï†/g, 'φ'],        // φ
    [/Î£/g, 'Σ'],        // Σ
    [/Ïƒ/g, 'σ'],        // σ
    [/Î©/g, 'Ω'],        // Ω
    [/Ï‰/g, 'ω'],        // ω
    [/Î»/g, 'λ'],        // λ
    [/Î¼/g, 'μ'],        // μ
    
    // Math operators mojibake - convert to proper Unicode symbols
    [/â‰¤/g, '≤'],       // ≤
    [/â‰¥/g, '≥'],       // ≥
    [/â‰ /g, '≠'],       // ≠
    [/â†'/g, '→'],       // →
    [/âˆš/g, '√'],       // √
    [/âˆž/g, '∞'],       // ∞
    [/Ã—/g, '×'],        // ×
    [/Ã·/g, '÷'],        // ÷
    [/â€"/g, '-'],       // em dash
    [/â€™/g, "'"],       // right single quote
    [/â€œ/g, '"'],       // left double quote
    [/â€/g, '"'],        // right double quote
    
    // Common corrupt patterns that appear as "Ø=Ü" (corrupted emoji)
    [/Ø=Ü[¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿]?/g, ''],  // Corrupted emoji patterns
    [/Ã˜=Ã[^\s]*/g, ''],  // Another corruption pattern
    
    // Common Â prefix corruption (UTF-8 BOM or encoding issue)
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
    
    // Fix ampersand-interleaved text (& between each character)
    // This pattern appears when encoding fails catastrophically
    [/&([a-zA-Z])&([a-zA-Z])&([a-zA-Z])/g, '$1$2$3'],
    
    // Clean up remaining stray Â characters
    [/Â(?=\d)/g, ''],
    [/(\d)Â\s/g, '$1 '],
    [/Â\s+/g, ' '],
    [/\s+Â/g, ' '],
  ];
  
  for (const [pattern, replacement] of mojibakePatterns) {
    result = result.replace(pattern, replacement);
  }
  
  // IMPORTANT: Keep Unicode math symbols that jsPDF can render correctly!
  // These include: π, θ, √, ², ³, ≤, ≥, ±, °, ∞, α, β, γ, δ, etc.
  // Only convert arrows and some geometry symbols that may not render well
  const safeReplacements: [RegExp, string][] = [
    // Arrows - convert to ASCII since they may not render consistently
    [/→/g, '->'],
    [/←/g, '<-'],
    [/↔/g, '<->'],
    [/⇒/g, '=>'],
    
    // Some less common geometry symbols
    [/⊥/g, ' perp '],
    [/∥/g, ' || '],
    [/≅/g, ' = '],  // congruent
    [/∠/g, 'angle '],
    
    // Set theory - less commonly needed
    [/∴/g, 'therefore '],
    [/∵/g, 'because '],
    [/∈/g, ' in '],
    [/⊂/g, ' subset '],
    [/∪/g, ' union '],
    [/∩/g, ' intersection '],
    
    // Prime symbols
    [/′/g, "'"],
    [/″/g, "''"],
  ];
  
  for (const [pattern, replacement] of safeReplacements) {
    result = result.replace(pattern, replacement);
  }
  
  // Clean up any double spaces that may have been introduced
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
    
    // Fix ampersand-interleaved text corruption
    // Pattern: &a&n&s&w&e&r -> answer
    [/&([a-zA-Z])(?=&)/g, '$1'],
    [/&([a-zA-Z])$/g, '$1'],
    [/^&([a-zA-Z])/g, '$1'],
    
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
