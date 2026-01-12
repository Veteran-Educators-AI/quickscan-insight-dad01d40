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

/**
 * Converts Unicode math symbols to ASCII-safe text for PDF rendering
 * jsPDF's default fonts don't support many Unicode math symbols, causing garbled output
 * This function replaces Unicode symbols with their text representations
 */
export function sanitizeForPDF(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // First, remove or replace emoji characters that cause corruption in PDF
  // These emojis render as garbled text like "Ø=Ü¡" in jsPDF
  const emojiReplacements: [RegExp, string][] = [
    // Common emojis used in worksheets - replace with text or simple symbols
    [/💡/g, '->'],        // lightbulb -> arrow for hints
    [/✨/g, '*'],         // sparkles
    [/📝/g, ''],          // memo/pencil
    [/🎉/g, ''],          // party popper
    [/✓/g, 'v'],          // checkmark
    [/✗/g, 'x'],          // x mark
    [/★/g, '*'],          // star
    [/☆/g, '*'],          // white star
    [/→/g, '->'],         // right arrow
    [/←/g, '<-'],         // left arrow
    [/↔/g, '<->'],        // left-right arrow
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
    // Greek letters mojibake
    [/Ï€/g, 'pi'],        // π
    [/Î¸/g, 'theta'],     // θ
    [/Î±/g, 'alpha'],     // α
    [/Î²/g, 'beta'],      // β
    [/Î³/g, 'gamma'],     // γ
    [/Î"/g, 'Delta'],     // Δ
    [/Î´/g, 'delta'],     // δ
    [/Ïˆ/g, 'psi'],       // ψ
    [/Ï†/g, 'phi'],       // φ
    [/Î£/g, 'Sigma'],     // Σ
    [/Ïƒ/g, 'sigma'],     // σ
    [/Î©/g, 'Omega'],     // Ω
    [/Ï‰/g, 'omega'],     // ω
    [/Î»/g, 'lambda'],    // λ
    [/Î¼/g, 'mu'],        // μ
    
    // Math operators mojibake
    [/â‰¤/g, '<='],       // ≤
    [/â‰¥/g, '>='],       // ≥
    [/â‰ /g, '!='],       // ≠
    [/â†'/g, '->'],       // →
    [/âˆš/g, 'sqrt'],     // √
    [/âˆž/g, 'infinity'], // ∞
    [/Ã—/g, 'x'],         // ×
    [/Ã·/g, '/'],         // ÷
    [/â€"/g, '-'],        // em dash
    [/â€™/g, "'"],        // right single quote
    [/â€œ/g, '"'],        // left double quote
    [/â€/g, '"'],         // right double quote
    
    // Common corrupt patterns that appear as "Ø=Ü" (corrupted emoji)
    [/Ø=Ü[¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿]?/g, ''],  // Corrupted emoji patterns
    [/Ã˜=Ã[^\s]*/g, ''],  // Another corruption pattern
    
    // Common Â prefix corruption (UTF-8 BOM or encoding issue)
    [/Â\s*π/g, 'pi'],
    [/Âπ/g, 'pi'],
    [/πÂ/g, 'pi'],
    [/Â°/g, ' degrees'],
    [/°Â/g, ' degrees'],
    [/Â²/g, '^2'],
    [/Â³/g, '^3'],
    [/Â½/g, '1/2'],
    [/Â¼/g, '1/4'],
    [/Â¾/g, '3/4'],
    [/Â±/g, '+/-'],
    [/Â·/g, '*'],
    
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
  
  // Now convert Unicode math symbols to ASCII-safe representations for PDF
  const pdfSafeReplacements: [RegExp, string][] = [
    // Greek letters - use word representations
    [/π/g, 'pi'],
    [/θ/g, 'theta'],
    [/α/g, 'alpha'],
    [/β/g, 'beta'],
    [/γ/g, 'gamma'],
    [/δ/g, 'delta'],
    [/Δ/g, 'Delta'],
    [/σ/g, 'sigma'],
    [/Σ/g, 'Sigma'],
    [/ω/g, 'omega'],
    [/Ω/g, 'Omega'],
    [/φ/g, 'phi'],
    [/Φ/g, 'Phi'],
    [/λ/g, 'lambda'],
    [/μ/g, 'mu'],
    [/ρ/g, 'rho'],
    [/τ/g, 'tau'],
    [/ψ/g, 'psi'],
    
    // Square root
    [/√/g, 'sqrt'],
    
    // Comparison operators
    [/≤/g, '<='],
    [/≥/g, '>='],
    [/≠/g, '!='],
    [/≈/g, '~='],
    
    // Plus/minus and other operators
    [/±/g, '+/-'],
    [/×/g, 'x'],
    [/÷/g, '/'],
    [/·/g, '*'],
    [/∞/g, 'infinity'],
    
    // Superscript digits - convert back to caret notation
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
    
    // Subscript digits - convert back to underscore notation
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
    
    // Common fractions
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
    
    // Geometry symbols
    [/∠/g, 'angle '],
    [/°/g, ' degrees'],
    [/⊥/g, ' perpendicular '],
    [/∥/g, ' parallel '],
    [/≅/g, ' congruent to '],
    [/~/g, ' similar to '],
    [/△/g, 'triangle '],
    [/○/g, 'circle '],
    [/□/g, 'square '],
    
    // Arrows
    [/→/g, '->'],
    [/←/g, '<-'],
    [/↔/g, '<->'],
    [/⇒/g, '=>'],
    
    // Other math symbols
    [/∴/g, 'therefore'],
    [/∵/g, 'because'],
    [/∈/g, ' in '],
    [/⊂/g, ' subset of '],
    [/∪/g, ' union '],
    [/∩/g, ' intersection '],
    [/′/g, "'"],
    [/″/g, "''"],
    [/•/g, '*'],
  ];
  
  for (const [pattern, replacement] of pdfSafeReplacements) {
    result = result.replace(pattern, replacement);
  }
  
  // Clean up any double spaces that may have been introduced
  result = result.replace(/\s+/g, ' ').trim();
  
  // Clean up spaces before "degrees" when it follows a number
  result = result.replace(/(\d)\s+degrees/g, '$1 degrees');
  
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
