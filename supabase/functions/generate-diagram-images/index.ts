import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HARDCODED FALLBACK SHAPES - Used when AI generation fails
// These are pre-built SVG templates for common geometry shapes
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_SHAPES: Record<string, (params?: any) => string> = {
  // Basic right triangle
  right_triangle: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <g stroke="#e0e0e0" stroke-width="1">
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${30 + i * 24}" y1="30" x2="${30 + i * 24}" y2="270"/>`).join('\n      ')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="30" y1="${270 - i * 24}" x2="270" y2="${270 - i * 24}"/>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2">
      <line x1="25" y1="270" x2="280" y2="270"/>
      <polygon points="280,270 272,266 272,274" fill="#000000"/>
      <line x1="30" y1="275" x2="30" y2="20"/>
      <polygon points="30,20 26,28 34,28" fill="#000000"/>
    </g>
    <g font-family="Arial" font-size="11" fill="#000000">
      <text x="275" y="285" font-style="italic">x</text>
      <text x="20" y="18" font-style="italic">y</text>
      ${Array.from({ length: 11 }, (_, i) => `<text x="${30 + i * 24}" y="285" text-anchor="middle">${i}</text>`).join('\n      ')}
      ${Array.from({ length: 10 }, (_, i) => `<text x="22" y="${270 - (i + 1) * 24 + 4}" text-anchor="end">${i + 1}</text>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2" fill="none">
      <polygon points="54,246 54,150 150,246"/>
    </g>
    <g fill="#000000" font-family="Arial" font-size="12" font-weight="bold">
      <circle cx="54" cy="246" r="4"/>
      <text x="35" y="260">A(1,1)</text>
      <circle cx="54" cy="150" r="4"/>
      <text x="35" y="145">B(1,5)</text>
      <circle cx="150" cy="246" r="4"/>
      <text x="155" y="260">C(5,1)</text>
    </g>
    <polyline points="54,234 66,234 66,246" stroke="#000000" stroke-width="1" fill="none"/>
  </svg>`,

  // Basic triangle (non-right)
  triangle: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <polygon points="150,50 50,250 250,250" stroke="#000000" stroke-width="2" fill="none"/>
    <circle cx="150" cy="50" r="4" fill="#000000"/>
    <circle cx="50" cy="250" r="4" fill="#000000"/>
    <circle cx="250" cy="250" r="4" fill="#000000"/>
    <text x="145" y="40" font-family="Arial" font-size="12" font-weight="bold">A</text>
    <text x="30" y="265" font-family="Arial" font-size="12" font-weight="bold">B</text>
    <text x="255" y="265" font-family="Arial" font-size="12" font-weight="bold">C</text>
  </svg>`,

  // Basic quadrilateral/rectangle  
  rectangle: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <g stroke="#e0e0e0" stroke-width="1">
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${30 + i * 24}" y1="30" x2="${30 + i * 24}" y2="270"/>`).join('\n      ')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="30" y1="${270 - i * 24}" x2="270" y2="${270 - i * 24}"/>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2">
      <line x1="25" y1="270" x2="280" y2="270"/>
      <polygon points="280,270 272,266 272,274" fill="#000000"/>
      <line x1="30" y1="275" x2="30" y2="20"/>
      <polygon points="30,20 26,28 34,28" fill="#000000"/>
    </g>
    <g font-family="Arial" font-size="11" fill="#000000">
      <text x="275" y="285" font-style="italic">x</text>
      <text x="20" y="18" font-style="italic">y</text>
      ${Array.from({ length: 11 }, (_, i) => `<text x="${30 + i * 24}" y="285" text-anchor="middle">${i}</text>`).join('\n      ')}
      ${Array.from({ length: 10 }, (_, i) => `<text x="22" y="${270 - (i + 1) * 24 + 4}" text-anchor="end">${i + 1}</text>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2" fill="none">
      <polygon points="54,222 54,126 198,126 198,222"/>
    </g>
    <g fill="#000000" font-family="Arial" font-size="12" font-weight="bold">
      <circle cx="54" cy="222" r="4"/>
      <text x="35" y="240">A(1,2)</text>
      <circle cx="54" cy="126" r="4"/>
      <text x="35" y="120">B(1,6)</text>
      <circle cx="198" cy="126" r="4"/>
      <text x="200" y="120">C(7,6)</text>
      <circle cx="198" cy="222" r="4"/>
      <text x="200" y="240">D(7,2)</text>
    </g>
  </svg>`,

  // Parallelogram
  parallelogram: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <polygon points="80,200 130,80 220,80 170,200" stroke="#000000" stroke-width="2" fill="none"/>
    <circle cx="80" cy="200" r="4" fill="#000000"/>
    <circle cx="130" cy="80" r="4" fill="#000000"/>
    <circle cx="220" cy="80" r="4" fill="#000000"/>
    <circle cx="170" cy="200" r="4" fill="#000000"/>
    <text x="60" y="215" font-family="Arial" font-size="12" font-weight="bold">A</text>
    <text x="125" y="70" font-family="Arial" font-size="12" font-weight="bold">B</text>
    <text x="225" y="70" font-family="Arial" font-size="12" font-weight="bold">C</text>
    <text x="175" y="215" font-family="Arial" font-size="12" font-weight="bold">D</text>
  </svg>`,

  // Trapezoid
  trapezoid: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <polygon points="60,200 100,80 200,80 240,200" stroke="#000000" stroke-width="2" fill="none"/>
    <circle cx="60" cy="200" r="4" fill="#000000"/>
    <circle cx="100" cy="80" r="4" fill="#000000"/>
    <circle cx="200" cy="80" r="4" fill="#000000"/>
    <circle cx="240" cy="200" r="4" fill="#000000"/>
    <text x="40" y="215" font-family="Arial" font-size="12" font-weight="bold">A</text>
    <text x="95" y="70" font-family="Arial" font-size="12" font-weight="bold">B</text>
    <text x="205" y="70" font-family="Arial" font-size="12" font-weight="bold">C</text>
    <text x="245" y="215" font-family="Arial" font-size="12" font-weight="bold">D</text>
  </svg>`,

  // Circle on coordinate plane
  circle: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <g stroke="#e0e0e0" stroke-width="1">
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${30 + i * 24}" y1="30" x2="${30 + i * 24}" y2="270"/>`).join('\n      ')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="30" y1="${270 - i * 24}" x2="270" y2="${270 - i * 24}"/>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2">
      <line x1="25" y1="270" x2="280" y2="270"/>
      <polygon points="280,270 272,266 272,274" fill="#000000"/>
      <line x1="30" y1="275" x2="30" y2="20"/>
      <polygon points="30,20 26,28 34,28" fill="#000000"/>
    </g>
    <g font-family="Arial" font-size="11" fill="#000000">
      <text x="275" y="285" font-style="italic">x</text>
      <text x="20" y="18" font-style="italic">y</text>
      ${Array.from({ length: 11 }, (_, i) => `<text x="${30 + i * 24}" y="285" text-anchor="middle">${i}</text>`).join('\n      ')}
      ${Array.from({ length: 10 }, (_, i) => `<text x="22" y="${270 - (i + 1) * 24 + 4}" text-anchor="end">${i + 1}</text>`).join('\n      ')}
    </g>
    <circle cx="150" cy="150" r="72" stroke="#000000" stroke-width="2" fill="none"/>
    <g fill="#000000" font-family="Arial" font-size="12" font-weight="bold">
      <circle cx="150" cy="150" r="4"/>
      <text x="160" y="145">C(5,5)</text>
    </g>
    <line x1="150" y1="150" x2="222" y2="150" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,2"/>
    <text x="180" y="145" font-family="Arial" font-size="10">r = 3</text>
  </svg>`,

  // Simple circle (no coordinate plane)
  simple_circle: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <circle cx="150" cy="150" r="100" stroke="#000000" stroke-width="2" fill="none"/>
    <circle cx="150" cy="150" r="4" fill="#000000"/>
    <line x1="150" y1="150" x2="250" y2="150" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,2"/>
    <text x="150" y="140" font-family="Arial" font-size="12" text-anchor="middle" font-weight="bold">O</text>
    <text x="200" y="140" font-family="Arial" font-size="11">r</text>
  </svg>`,

  // Arc / Semicircle
  arc: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <path d="M 50 200 A 100 100 0 0 1 250 200" stroke="#000000" stroke-width="2" fill="none"/>
    <line x1="50" y1="200" x2="250" y2="200" stroke="#000000" stroke-width="2"/>
    <circle cx="50" cy="200" r="4" fill="#000000"/>
    <circle cx="250" cy="200" r="4" fill="#000000"/>
    <circle cx="150" cy="200" r="4" fill="#000000"/>
    <text x="35" y="215" font-family="Arial" font-size="12" font-weight="bold">A</text>
    <text x="255" y="215" font-family="Arial" font-size="12" font-weight="bold">B</text>
    <text x="145" y="215" font-family="Arial" font-size="12" font-weight="bold">O</text>
  </svg>`,

  // Inscribed angle / chord
  chord: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <circle cx="150" cy="150" r="100" stroke="#000000" stroke-width="2" fill="none"/>
    <line x1="75" y1="215" x2="225" y2="215" stroke="#000000" stroke-width="2"/>
    <circle cx="75" cy="215" r="4" fill="#000000"/>
    <circle cx="225" cy="215" r="4" fill="#000000"/>
    <circle cx="150" cy="150" r="4" fill="#000000"/>
    <text x="55" y="230" font-family="Arial" font-size="12" font-weight="bold">A</text>
    <text x="230" y="230" font-family="Arial" font-size="12" font-weight="bold">B</text>
    <text x="155" y="145" font-family="Arial" font-size="12" font-weight="bold">O</text>
  </svg>`,

  // Tangent line
  tangent: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <circle cx="150" cy="150" r="80" stroke="#000000" stroke-width="2" fill="none"/>
    <line x1="230" y1="50" x2="230" y2="250" stroke="#000000" stroke-width="2"/>
    <line x1="150" y1="150" x2="230" y2="150" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,2"/>
    <circle cx="150" cy="150" r="4" fill="#000000"/>
    <circle cx="230" cy="150" r="4" fill="#000000"/>
    <text x="135" y="140" font-family="Arial" font-size="12" font-weight="bold">O</text>
    <text x="235" y="155" font-family="Arial" font-size="12" font-weight="bold">P</text>
    <polyline points="218,150 218,162 230,162" stroke="#000000" stroke-width="1" fill="none"/>
  </svg>`,

  // 3D Rectangular Prism
  prism: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <!-- Front face -->
    <rect x="60" y="100" width="120" height="100" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Back face (offset) -->
    <rect x="100" y="60" width="120" height="100" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Connecting edges -->
    <line x1="60" y1="100" x2="100" y2="60" stroke="#000000" stroke-width="2"/>
    <line x1="180" y1="100" x2="220" y2="60" stroke="#000000" stroke-width="2"/>
    <line x1="60" y1="200" x2="100" y2="160" stroke="#000000" stroke-width="2"/>
    <line x1="180" y1="200" x2="220" y2="160" stroke="#000000" stroke-width="2"/>
    <!-- Labels -->
    <text x="110" y="230" font-family="Arial" font-size="11">length</text>
    <text x="185" y="155" font-family="Arial" font-size="11">height</text>
    <text x="225" y="110" font-family="Arial" font-size="11">width</text>
  </svg>`,

  // Cylinder
  cylinder: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <!-- Top ellipse -->
    <ellipse cx="150" cy="70" rx="70" ry="25" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Bottom ellipse -->
    <ellipse cx="150" cy="230" rx="70" ry="25" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Side lines -->
    <line x1="80" y1="70" x2="80" y2="230" stroke="#000000" stroke-width="2"/>
    <line x1="220" y1="70" x2="220" y2="230" stroke="#000000" stroke-width="2"/>
    <!-- Height label -->
    <line x1="240" y1="70" x2="240" y2="230" stroke="#000000" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="245" y="155" font-family="Arial" font-size="11">h</text>
    <!-- Radius label -->
    <line x1="150" y1="230" x2="220" y2="230" stroke="#000000" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="180" y="245" font-family="Arial" font-size="11">r</text>
  </svg>`,

  // Cone
  cone: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <!-- Apex -->
    <circle cx="150" cy="50" r="4" fill="#000000"/>
    <!-- Base ellipse -->
    <ellipse cx="150" cy="250" rx="80" ry="25" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Slant edges -->
    <line x1="150" y1="50" x2="70" y2="250" stroke="#000000" stroke-width="2"/>
    <line x1="150" y1="50" x2="230" y2="250" stroke="#000000" stroke-width="2"/>
    <!-- Height (dashed) -->
    <line x1="150" y1="50" x2="150" y2="250" stroke="#000000" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="155" y="155" font-family="Arial" font-size="11">h</text>
    <!-- Radius -->
    <line x1="150" y1="250" x2="230" y2="250" stroke="#000000" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="185" y="265" font-family="Arial" font-size="11">r</text>
  </svg>`,

  // Pyramid
  pyramid: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <!-- Apex -->
    <circle cx="150" cy="50" r="4" fill="#000000"/>
    <!-- Base (square) -->
    <polygon points="60,220 150,270 240,220 150,170" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Edges to apex -->
    <line x1="150" y1="50" x2="60" y2="220" stroke="#000000" stroke-width="2"/>
    <line x1="150" y1="50" x2="240" y2="220" stroke="#000000" stroke-width="2"/>
    <line x1="150" y1="50" x2="150" y2="170" stroke="#000000" stroke-width="2"/>
    <line x1="150" y1="50" x2="150" y2="270" stroke="#000000" stroke-width="2" stroke-dasharray="4,2"/>
    <!-- Height (dashed) -->
    <line x1="150" y1="50" x2="150" y2="220" stroke="#000000" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="155" y="140" font-family="Arial" font-size="11">h</text>
  </svg>`,

  // Sphere
  sphere: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <!-- Main circle -->
    <circle cx="150" cy="150" r="100" stroke="#000000" stroke-width="2" fill="none"/>
    <!-- Equator ellipse -->
    <ellipse cx="150" cy="150" rx="100" ry="30" stroke="#000000" stroke-width="1" stroke-dasharray="4,2" fill="none"/>
    <!-- Vertical half-ellipse (front) -->
    <path d="M 150 50 A 30 100 0 0 1 150 250" stroke="#000000" stroke-width="1" stroke-dasharray="4,2" fill="none"/>
    <!-- Center -->
    <circle cx="150" cy="150" r="4" fill="#000000"/>
    <text x="160" y="145" font-family="Arial" font-size="12" font-weight="bold">O</text>
    <!-- Radius -->
    <line x1="150" y1="150" x2="250" y2="150" stroke="#000000" stroke-width="1.5"/>
    <text x="200" y="140" font-family="Arial" font-size="11">r</text>
  </svg>`,

  // Parabola (for Algebra)
  parabola: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <g stroke="#e0e0e0" stroke-width="1">
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${30 + i * 24}" y1="30" x2="${30 + i * 24}" y2="270"/>`).join('\n      ')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="30" y1="${270 - i * 24}" x2="270" y2="${270 - i * 24}"/>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2">
      <line x1="25" y1="270" x2="280" y2="270"/>
      <polygon points="280,270 272,266 272,274" fill="#000000"/>
      <line x1="30" y1="275" x2="30" y2="20"/>
      <polygon points="30,20 26,28 34,28" fill="#000000"/>
    </g>
    <g font-family="Arial" font-size="11" fill="#000000">
      <text x="275" y="285" font-style="italic">x</text>
      <text x="20" y="18" font-style="italic">y</text>
      ${Array.from({ length: 11 }, (_, i) => `<text x="${30 + i * 24}" y="285" text-anchor="middle">${i}</text>`).join('\n      ')}
      ${Array.from({ length: 10 }, (_, i) => `<text x="22" y="${270 - (i + 1) * 24 + 4}" text-anchor="end">${i + 1}</text>`).join('\n      ')}
    </g>
    <path d="M 54 54 Q 150 270 246 54" stroke="#000000" stroke-width="2" fill="none"/>
    <g fill="#000000" font-family="Arial" font-size="12" font-weight="bold">
      <circle cx="150" cy="246" r="4"/>
      <text x="155" y="260">V(5,1)</text>
    </g>
  </svg>`,

  // Linear function graph
  linear: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <g stroke="#e0e0e0" stroke-width="1">
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${30 + i * 24}" y1="30" x2="${30 + i * 24}" y2="270"/>`).join('\n      ')}
      ${Array.from({ length: 11 }, (_, i) => `<line x1="30" y1="${270 - i * 24}" x2="270" y2="${270 - i * 24}"/>`).join('\n      ')}
    </g>
    <g stroke="#000000" stroke-width="2">
      <line x1="25" y1="270" x2="280" y2="270"/>
      <polygon points="280,270 272,266 272,274" fill="#000000"/>
      <line x1="30" y1="275" x2="30" y2="20"/>
      <polygon points="30,20 26,28 34,28" fill="#000000"/>
    </g>
    <g font-family="Arial" font-size="11" fill="#000000">
      <text x="275" y="285" font-style="italic">x</text>
      <text x="20" y="18" font-style="italic">y</text>
      ${Array.from({ length: 11 }, (_, i) => `<text x="${30 + i * 24}" y="285" text-anchor="middle">${i}</text>`).join('\n      ')}
      ${Array.from({ length: 10 }, (_, i) => `<text x="22" y="${270 - (i + 1) * 24 + 4}" text-anchor="end">${i + 1}</text>`).join('\n      ')}
    </g>
    <line x1="30" y1="246" x2="270" y2="54" stroke="#000000" stroke-width="2"/>
    <g fill="#000000" font-family="Arial" font-size="12" font-weight="bold">
      <circle cx="30" cy="246" r="4"/>
      <text x="40" y="250">(0,1)</text>
      <circle cx="150" cy="150" r="4"/>
      <text x="155" y="145">(5,5)</text>
    </g>
  </svg>`,

  // Force diagram (Physics)
  force_diagram: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <rect x="100" y="120" width="100" height="60" stroke="#000000" stroke-width="2" fill="none" rx="2"/>
    <text x="150" y="155" font-family="Arial" font-size="14" text-anchor="middle">m</text>
    <line x1="150" y1="120" x2="150" y2="50" stroke="#000000" stroke-width="2"/>
    <polygon points="150,50 145,60 155,60" fill="#000000"/>
    <text x="160" y="70" font-family="Arial" font-size="12">F_N</text>
    <line x1="150" y1="180" x2="150" y2="250" stroke="#000000" stroke-width="2"/>
    <polygon points="150,250 145,240 155,240" fill="#000000"/>
    <text x="160" y="230" font-family="Arial" font-size="12">F_g</text>
    <line x1="100" y1="150" x2="40" y2="150" stroke="#000000" stroke-width="2"/>
    <polygon points="40,150 50,145 50,155" fill="#000000"/>
    <text x="55" y="140" font-family="Arial" font-size="12">F_f</text>
    <line x1="200" y1="150" x2="270" y2="150" stroke="#000000" stroke-width="2"/>
    <polygon points="270,150 260,145 260,155" fill="#000000"/>
    <text x="235" y="140" font-family="Arial" font-size="12">F_a</text>
  </svg>`,

  // Simple circuit (Physics)
  simple_circuit: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <line x1="50" y1="100" x2="50" y2="200" stroke="#000000" stroke-width="2"/>
    <line x1="50" y1="200" x2="250" y2="200" stroke="#000000" stroke-width="2"/>
    <line x1="250" y1="200" x2="250" y2="100" stroke="#000000" stroke-width="2"/>
    <line x1="250" y1="100" x2="50" y2="100" stroke="#000000" stroke-width="2"/>
    <line x1="30" y1="145" x2="30" y2="155" stroke="#000000" stroke-width="2"/>
    <line x1="40" y1="140" x2="40" y2="160" stroke="#000000" stroke-width="2"/>
    <line x1="30" y1="150" x2="50" y2="150" stroke="#000000" stroke-width="2"/>
    <path d="M 120 100 L 130 90 L 140 110 L 150 90 L 160 110 L 170 90 L 180 100" stroke="#000000" stroke-width="2" fill="none"/>
    <text x="150" y="80" font-family="Arial" font-size="12" text-anchor="middle">R</text>
    <circle cx="150" cy="200" r="15" stroke="#000000" stroke-width="2" fill="none"/>
    <text x="150" y="205" font-family="Arial" font-size="12" text-anchor="middle">A</text>
  </svg>`,

  // Molecule structure (Chemistry)
  molecule: () => `<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="300" height="300" fill="#ffffff"/>
    <line x1="80" y1="150" x2="130" y2="150" stroke="#000000" stroke-width="2"/>
    <line x1="170" y1="150" x2="220" y2="150" stroke="#000000" stroke-width="2"/>
    <circle cx="60" cy="150" r="20" stroke="#000000" stroke-width="2" fill="none"/>
    <text x="60" y="155" font-family="Arial" font-size="14" text-anchor="middle" font-weight="bold">H</text>
    <circle cx="150" cy="150" r="25" stroke="#000000" stroke-width="2" fill="none"/>
    <text x="150" y="155" font-family="Arial" font-size="14" text-anchor="middle" font-weight="bold">O</text>
    <circle cx="240" cy="150" r="20" stroke="#000000" stroke-width="2" fill="none"/>
    <text x="240" y="155" font-family="Arial" font-size="14" text-anchor="middle" font-weight="bold">H</text>
    <text x="150" y="250" font-family="Arial" font-size="16" text-anchor="middle">H₂O</text>
  </svg>`
};

// Match prompt to a fallback shape
function matchFallbackShape(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase();
  
  // Geometry shapes - check specific cases first
  if (lowerPrompt.includes('right triangle') || (lowerPrompt.includes('triangle') && lowerPrompt.includes('right'))) {
    return 'right_triangle';
  }
  if (lowerPrompt.includes('triangle') && !lowerPrompt.includes('right')) {
    return 'triangle';
  }
  if (lowerPrompt.includes('parallelogram') || lowerPrompt.includes('rhombus')) {
    return 'parallelogram';
  }
  if (lowerPrompt.includes('trapezoid') || lowerPrompt.includes('trapezium')) {
    return 'trapezoid';
  }
  if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('quadrilateral') || lowerPrompt.includes('square')) {
    return 'rectangle';
  }
  
  // Circular shapes
  if (lowerPrompt.includes('tangent')) {
    return 'tangent';
  }
  if (lowerPrompt.includes('chord') || lowerPrompt.includes('inscribed')) {
    return 'chord';
  }
  if (lowerPrompt.includes('arc') || lowerPrompt.includes('semicircle')) {
    return 'arc';
  }
  if (lowerPrompt.includes('circle') && (lowerPrompt.includes('coordinate') || lowerPrompt.includes('plane'))) {
    return 'circle';
  }
  if (lowerPrompt.includes('circle') && !lowerPrompt.includes('circuit')) {
    return 'simple_circle';
  }
  
  // 3D Solids
  if (lowerPrompt.includes('sphere')) {
    return 'sphere';
  }
  if (lowerPrompt.includes('cylinder')) {
    return 'cylinder';
  }
  if (lowerPrompt.includes('cone')) {
    return 'cone';
  }
  if (lowerPrompt.includes('pyramid')) {
    return 'pyramid';
  }
  if (lowerPrompt.includes('prism') || lowerPrompt.includes('rectangular solid') || lowerPrompt.includes('box') || lowerPrompt.includes('cuboid')) {
    return 'prism';
  }
  
  // Algebra
  if (lowerPrompt.includes('parabola') || lowerPrompt.includes('quadratic')) {
    return 'parabola';
  }
  if (lowerPrompt.includes('linear') || lowerPrompt.includes('line graph') || lowerPrompt.includes('slope')) {
    return 'linear';
  }
  
  // Physics
  if (lowerPrompt.includes('force') || lowerPrompt.includes('free body')) {
    return 'force_diagram';
  }
  if (lowerPrompt.includes('circuit') || lowerPrompt.includes('resistor')) {
    return 'simple_circuit';
  }
  
  // Chemistry
  if (lowerPrompt.includes('molecule') || lowerPrompt.includes('h2o') || lowerPrompt.includes('water')) {
    return 'molecule';
  }
  
  return null;
}

// Get fallback shape SVG as data URL
function getFallbackShape(prompt: string): string | null {
  const shapeKey = matchFallbackShape(prompt);
  if (shapeKey && FALLBACK_SHAPES[shapeKey]) {
    const svg = FALLBACK_SHAPES[shapeKey]();
    const base64Svg = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64Svg}`;
  }
  return null;
}

// Query the Regents Shape Library for matching shapes
async function queryShapeLibrary(prompt: string, subject: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect shape type from prompt - expanded keyword matching
    let shapeType = 'polygon';
    if (lowerPrompt.includes('triangle')) shapeType = 'triangle';
    else if (lowerPrompt.includes('parallelogram') || lowerPrompt.includes('rhombus') || 
             lowerPrompt.includes('rectangle') || lowerPrompt.includes('quadrilateral') ||
             lowerPrompt.includes('trapezoid') || lowerPrompt.includes('square')) shapeType = 'quadrilateral';
    else if (lowerPrompt.includes('circle') || lowerPrompt.includes('arc') || lowerPrompt.includes('chord') ||
             lowerPrompt.includes('tangent') || lowerPrompt.includes('secant')) shapeType = 'circle';
    else if (lowerPrompt.includes('parabola') || lowerPrompt.includes('quadratic')) shapeType = 'parabola';
    else if (lowerPrompt.includes('linear') || lowerPrompt.includes('line') || lowerPrompt.includes('slope')) shapeType = 'linear';
    else if (lowerPrompt.includes('force') || lowerPrompt.includes('free body')) shapeType = 'force_diagram';
    else if (lowerPrompt.includes('circuit')) shapeType = 'circuit';
    else if (lowerPrompt.includes('molecule')) shapeType = 'molecule';
    else if (lowerPrompt.includes('prism') || lowerPrompt.includes('cylinder') || 
             lowerPrompt.includes('pyramid') || lowerPrompt.includes('cone') || 
             lowerPrompt.includes('sphere')) shapeType = 'polygon'; // 3D solids
    
    // Query the library for matching verified shapes - also search by description/tags
    const { data, error } = await supabase
      .from('regents_shape_library')
      .select('id, svg_data, vertices, parameters, usage_count, description, tags')
      .eq('is_verified', true)
      .eq('shape_type', shapeType)
      .ilike('subject', `%${subject}%`)
      .order('usage_count', { ascending: false })
      .limit(5);
    
    if (error || !data || data.length === 0) {
      console.log(`No matching shape in library for ${shapeType}/${subject}`);
      return null;
    }
    
    // Find best match by checking description/tags against the prompt
    let bestMatch = data[0];
    const promptKeywords = lowerPrompt.split(/\s+/).filter(w => w.length > 3);
    let bestScore = 0;
    
    for (const shape of data) {
      const shapeWithMeta = shape as { id: string; svg_data: string | null; vertices: unknown; parameters: unknown; usage_count: number; description: string; tags: string[] };
      const desc = (shapeWithMeta.description || '').toLowerCase();
      const tags = (shapeWithMeta.tags || []).join(' ').toLowerCase();
      const combined = desc + ' ' + tags;
      
      let score = 0;
      for (const keyword of promptKeywords) {
        if (combined.includes(keyword)) score++;
      }
      
      // Prioritize shapes with actual SVG data
      if (shapeWithMeta.svg_data) score += 10;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = shape;
      }
    }
    
    const shape = bestMatch as { id: string; svg_data: string | null; vertices: unknown; parameters: unknown; usage_count: number; description: string };
    
    // Check if svg_data exists
    if (!shape.svg_data) {
      console.log(`Shape found in library but has no SVG data: ${shape.description}`);
      // Return null to fall through to other generation methods
      // The shape description can be used by AI generation as context
      return null;
    }
    
    // Increment usage count (fire and forget)
    supabase
      .from('regents_shape_library')
      .update({ usage_count: (shape.usage_count || 0) + 1 })
      .eq('id', shape.id)
      .then(() => {});
    
    console.log(`Found matching shape in library with SVG: ${shapeType}`);
    
    const svgData = shape.svg_data;
    
    // If the SVG data is already a data URL, return it
    if (svgData.startsWith('data:')) {
      return svgData;
    }
    
    // Convert raw SVG to data URL
    const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
    return `data:image/svg+xml;base64,${base64Svg}`;
  } catch (err) {
    console.error("Error querying shape library:", err);
    return null;
  }
}

interface QuestionWithPrompt {
  questionNumber: number;
  imagePrompt: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  shouldRetry: boolean;
}

// Validate generated image using AI vision
async function validateDiagramImage(imageUrl: string, originalPrompt: string): Promise<ValidationResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return { isValid: true, issues: [], shouldRetry: false }; // Skip validation if no key
  }

  try {
    console.log("Validating generated diagram...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this mathematical diagram for quality issues. Check for these SPECIFIC problems:

COORDINATE PLANE ISSUES:
- Are the Y-axis numbers in correct order (0,1,2,3... going UP)?
- Are the X-axis numbers in correct order (0,1,2,3... going RIGHT)?
- Are axis numbers scattered randomly instead of evenly spaced?

LABEL ISSUES:
- Are any vertex labels duplicated (same letter appears twice)?
- Are labels placed inside shapes instead of outside?
- Is text rotated/diagonal when it should be horizontal?
- Are there unwanted "units" labels cluttering the diagram?

SHAPE ISSUES:
- Is the shape clearly visible on the coordinate plane?
- Are vertices plotted at approximately correct positions?

Respond with ONLY a JSON object in this exact format:
{
  "isValid": true/false,
  "issues": ["list of specific issues found"],
  "shouldRetry": true/false
}

Set shouldRetry=true if the diagram has major issues that would confuse students.
Set isValid=false if there are ANY of the issues listed above.`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("Validation API error:", response.status);
      return { isValid: true, issues: [], shouldRetry: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as ValidationResult;
      console.log("Validation result:", result);
      return result;
    }

    return { isValid: true, issues: [], shouldRetry: false };
  } catch (error) {
    console.error("Validation error:", error);
    return { isValid: true, issues: [], shouldRetry: false };
  }
}

// Generate high-quality presentation image using Nano Banana Pro (google/gemini-3-pro-image-preview)
// This uses the user's EXACT prompt without any math/geometry templating
async function generatePresentationImage(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    console.log("Generating presentation image with Nano Banana Pro...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nano Banana Pro API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Nano Banana Pro response received");

    // Extract image from the response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log("Successfully generated presentation image with Nano Banana Pro");
        return imageUrl;
      }
    }

    console.log("No image in Nano Banana Pro response");
    return null;
  } catch (error) {
    console.error("Error generating presentation image:", error);
    return null;
  }
}

// Generate image using Nano Banana (google/gemini-2.5-flash-image-preview)
async function generateImageWithNanoBanana(
  prompt: string,
  attemptNumber = 1,
): Promise<{ imageUrl: string | null; validation: ValidationResult | null }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return { imageUrl: null, validation: null };
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════════════
    // MASTER GEOMETRY TEMPLATE v5 - PIXEL-PERFECT AXIS LABELING
    // ═══════════════════════════════════════════════════════════════════════════════

    // Parse coordinates from the prompt to provide explicit placement instructions
    const coordinateMatches = prompt.match(/\((\d+),\s*(\d+)\)/g) || [];
    const coordinates = coordinateMatches
      .map((match) => {
        const nums = match.match(/(\d+)/g);
        return nums ? { x: parseInt(nums[0]), y: parseInt(nums[1]) } : null;
      })
      .filter(Boolean);

    // Determine the coordinate range needed
    const maxX = Math.max(10, ...coordinates.map((c) => c!.x + 1));
    const maxY = Math.max(10, ...coordinates.map((c) => c!.y + 1));

    // Generate the EXPLICIT list of axis numbers
    const xAxisNumbers = Array.from({ length: maxX + 1 }, (_, i) => i).join(", ");
    const yAxisNumbers = Array.from({ length: maxY + 1 }, (_, i) => i).join(", ");

    const enhancedPrompt = `CREATE A MATHEMATICAL COORDINATE PLANE DIAGRAM.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: THE AXIS NUMBERING IS THE MOST IMPORTANT PART. READ CAREFULLY.
═══════════════════════════════════════════════════════════════════════════════

You must create a STANDARD CARTESIAN COORDINATE PLANE like you see in every math textbook.

THE X-AXIS (horizontal line):
- Goes from LEFT to RIGHT
- Has an arrow pointing RIGHT at the end
- Label it with lowercase "x" at the right
- Put tick marks at EQUAL intervals
- Write these EXACT numbers BELOW the tick marks, reading LEFT to RIGHT:
  ${xAxisNumbers}
- The number 0 is on the LEFT (at the origin)
- The number ${maxX} is on the RIGHT
- EVERY number from 0 to ${maxX} must appear ONCE and ONLY ONCE
- Numbers must be IN ORDER: 0 then 1 then 2 then 3 then 4 then 5 then 6 then 7 then 8 then 9 then 10
- DO NOT SKIP ANY NUMBERS
- DO NOT PUT ANY NUMBER TWICE

THE Y-AXIS (vertical line):
- Goes from BOTTOM to TOP
- Has an arrow pointing UP at the end
- Label it with lowercase "y" at the top
- Put tick marks at EQUAL intervals
- Write these EXACT numbers TO THE LEFT of the tick marks, reading BOTTOM to TOP:
  ${yAxisNumbers}
- The number 0 is at the BOTTOM (at the origin, shared with x-axis)
- The number ${maxY} is at the TOP
- EVERY number from 0 to ${maxY} must appear ONCE and ONLY ONCE
- Numbers must be IN ORDER: 0 at bottom, then 1 above it, then 2, then 3, then 4, then 5, then 6, then 7, then 8, then 9, then 10 at top
- DO NOT SKIP ANY NUMBERS
- DO NOT PUT ANY NUMBER TWICE

THE ORIGIN:
- Is where the X and Y axes cross
- Is at the BOTTOM-LEFT of the coordinate grid
- Has the value (0, 0)
- Both axes share the "0" at this point

GRID LINES (optional but helpful):
- Light gray horizontal and vertical lines at each integer value
- Like graph paper

═══════════════════════════════════════════════════════════════════════════════
AXIS NUMBER VERIFICATION - COUNT THESE OUT LOUD:
═══════════════════════════════════════════════════════════════════════════════

X-AXIS (read left to right): 
Position 1: "0" | Position 2: "1" | Position 3: "2" | Position 4: "3" | Position 5: "4" | Position 6: "5" | Position 7: "6" | Position 8: "7" | Position 9: "8" | Position 10: "9" | Position 11: "10"

Y-AXIS (read bottom to top):
Position 1 (bottom): "0" | Position 2: "1" | Position 3: "2" | Position 4: "3" | Position 5: "4" | Position 6: "5" | Position 7: "6" | Position 8: "7" | Position 9: "8" | Position 10: "9" | Position 11 (top): "10"

═══════════════════════════════════════════════════════════════════════════════
NOW DRAW THE SHAPE ON TOP OF THE COORDINATE PLANE:
═══════════════════════════════════════════════════════════════════════════════

${prompt}

${
  coordinates.length > 0
    ? `
VERTEX PLOTTING INSTRUCTIONS:
${coordinates
  .map((c, i) => {
    const labels = prompt.match(/[A-Z]\s*\(\d+,\s*\d+\)/g) || [];
    const label = labels[i] || `Point ${i + 1}`;
    return `• ${label}: 
    - Start at origin (0,0) in bottom-left corner
    - Count ${c!.x} tick marks to the RIGHT on the x-axis (you should be at x=${c!.x})
    - From there, count ${c!.y} tick marks UPWARD (you should now be at y=${c!.y})
    - Place a solid black dot at this grid intersection
    - Write "${label}" next to the dot, outside the shape`;
  })
  .join("\n")}
`
    : ""
}

Connect the vertices with thin black lines to form the shape.

═══════════════════════════════════════════════════════════════════════════════
COMMON MISTAKES TO AVOID:
═══════════════════════════════════════════════════════════════════════════════

❌ WRONG: X-axis reads "0, 1, 2, 3, 5, 8, 9, 10" (missing 4, 6, 7)
❌ WRONG: Y-axis reads "0, 1, 2, 3, 4, 7, 8, 9, 10" (missing 5, 6)
❌ WRONG: Numbers not evenly spaced
❌ WRONG: Numbers in random order like "10, 3, 7, 4"
❌ WRONG: Same number appearing twice
❌ WRONG: Rotated or diagonal text
❌ WRONG: Numbers placed inconsistently (some above, some below axis)

✅ CORRECT: Every integer from 0 to 10 appears exactly once
✅ CORRECT: Numbers are in sequential order (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
✅ CORRECT: Numbers are evenly spaced
✅ CORRECT: X-axis numbers below the line, Y-axis numbers to the left of the line
✅ CORRECT: All text is horizontal

═══════════════════════════════════════════════════════════════════════════════
STYLE REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

- White background
- Black lines and text only
- Clean, professional math textbook style
- All text must be perfectly horizontal (not rotated)
- Vertex labels outside the shape, not inside`;

    console.log("Generating image with Nano Banana...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image", // Correct model name for image generation
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nano Banana API error:", response.status, errorText);
      return { imageUrl: null, validation: null };
    }

    const data = await response.json();
    console.log("Nano Banana response received");

    // Extract image from the response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log("Successfully generated image with Nano Banana");

        // Validate the generated image (only for geometry diagrams, max 2 retries)
        const isGeometryPrompt =
          prompt.toLowerCase().includes("coordinate") ||
          prompt.toLowerCase().includes("vertex") ||
          prompt.toLowerCase().includes("triangle") ||
          prompt.toLowerCase().includes("quadrilateral");

        if (isGeometryPrompt && attemptNumber <= 2) {
          const validation = await validateDiagramImage(imageUrl, prompt);

          if (validation.shouldRetry && attemptNumber < 2) {
            console.log(`Validation failed (attempt ${attemptNumber}), retrying...`, validation.issues);
            return generateImageWithNanoBanana(prompt, attemptNumber + 1);
          }

          return { imageUrl, validation };
        }

        return { imageUrl, validation: null };
      }
    }

    console.log("No image in Nano Banana response");
    return { imageUrl: null, validation: null };
  } catch (error) {
    console.error("Error generating with Nano Banana:", error);
    return { imageUrl: null, validation: null };
  }
}

// Detect shape type from prompt (polygons, circles, arcs)
function detectShapeType(prompt: string): { type: string; sides: number; isCircular: boolean } {
  const lowerPrompt = prompt.toLowerCase();

  // Check for circular shapes first
  if (lowerPrompt.includes("circle")) {
    return { type: "circle", sides: 0, isCircular: true };
  }
  if (lowerPrompt.includes("semicircle") || lowerPrompt.includes("semi-circle")) {
    return { type: "semicircle", sides: 0, isCircular: true };
  }
  if (lowerPrompt.includes("arc")) {
    return { type: "arc", sides: 0, isCircular: true };
  }
  if (lowerPrompt.includes("ellipse") || lowerPrompt.includes("oval")) {
    return { type: "ellipse", sides: 0, isCircular: true };
  }

  // Polygon types
  if (lowerPrompt.includes("triangle") || lowerPrompt.includes("3-gon")) {
    return { type: "triangle", sides: 3, isCircular: false };
  }
  if (
    lowerPrompt.includes("quadrilateral") ||
    lowerPrompt.includes("rectangle") ||
    lowerPrompt.includes("square") ||
    lowerPrompt.includes("parallelogram") ||
    lowerPrompt.includes("rhombus") ||
    lowerPrompt.includes("trapezoid") ||
    lowerPrompt.includes("4-gon")
  ) {
    return { type: "quadrilateral", sides: 4, isCircular: false };
  }
  if (lowerPrompt.includes("pentagon") || lowerPrompt.includes("5-gon")) {
    return { type: "pentagon", sides: 5, isCircular: false };
  }
  if (lowerPrompt.includes("hexagon") || lowerPrompt.includes("6-gon")) {
    return { type: "hexagon", sides: 6, isCircular: false };
  }
  if (lowerPrompt.includes("heptagon") || lowerPrompt.includes("7-gon")) {
    return { type: "heptagon", sides: 7, isCircular: false };
  }
  if (lowerPrompt.includes("octagon") || lowerPrompt.includes("8-gon")) {
    return { type: "octagon", sides: 8, isCircular: false };
  }
  if (lowerPrompt.includes("line segment") || lowerPrompt.includes("segment")) {
    return { type: "segment", sides: 2, isCircular: false };
  }
  if (lowerPrompt.includes("ray")) {
    return { type: "ray", sides: 2, isCircular: false };
  }
  if (lowerPrompt.includes("line")) {
    return { type: "line", sides: 2, isCircular: false };
  }

  // Default: infer from number of coordinates
  const coordCount = (prompt.match(/\(\d+,\s*\d+\)/g) || []).length;
  if (coordCount === 2) return { type: "segment", sides: 2, isCircular: false };
  if (coordCount === 3) return { type: "triangle", sides: 3, isCircular: false };
  if (coordCount === 4) return { type: "quadrilateral", sides: 4, isCircular: false };
  if (coordCount === 5) return { type: "pentagon", sides: 5, isCircular: false };
  if (coordCount === 6) return { type: "hexagon", sides: 6, isCircular: false };

  return { type: "polygon", sides: coordCount || 0, isCircular: false };
}

// Parse circle info from prompt (center point and radius)
function parseCircleInfo(prompt: string): {
  center: { x: number; y: number } | null;
  radius: number | null;
  startAngle?: number;
  endAngle?: number;
} {
  const lowerPrompt = prompt.toLowerCase();

  // Try to find center point: "center (5, 4)" or "centered at (5, 4)" or "center at C(5, 4)"
  const centerMatch = prompt.match(/center(?:ed)?(?:\s+at)?\s*(?:[A-Z])?\s*\((\d+),\s*(\d+)\)/i);
  let center: { x: number; y: number } | null = null;
  if (centerMatch) {
    center = { x: parseInt(centerMatch[1]), y: parseInt(centerMatch[2]) };
  }

  // Try to find radius: "radius 3" or "radius of 3" or "r = 3" or "r=3"
  const radiusMatch =
    prompt.match(/radius(?:\s+of)?\s*=?\s*(\d+(?:\.\d+)?)/i) || prompt.match(/r\s*=\s*(\d+(?:\.\d+)?)/i);
  let radius: number | null = null;
  if (radiusMatch) {
    radius = parseFloat(radiusMatch[1]);
  }

  // For arcs, try to find angles
  let startAngle = 0;
  let endAngle = 360;

  if (lowerPrompt.includes("semicircle") || lowerPrompt.includes("semi-circle")) {
    // Check orientation
    if (lowerPrompt.includes("upper") || lowerPrompt.includes("top")) {
      startAngle = 0;
      endAngle = 180;
    } else if (lowerPrompt.includes("lower") || lowerPrompt.includes("bottom")) {
      startAngle = 180;
      endAngle = 360;
    } else if (lowerPrompt.includes("left")) {
      startAngle = 90;
      endAngle = 270;
    } else if (lowerPrompt.includes("right")) {
      startAngle = -90;
      endAngle = 90;
    } else {
      // Default: upper semicircle
      startAngle = 0;
      endAngle = 180;
    }
  } else if (lowerPrompt.includes("arc")) {
    // Try to parse angle ranges: "arc from 30° to 120°" or "30 to 120 degrees"
    const angleMatch = prompt.match(/(\d+)\s*(?:°|degrees?)?\s*to\s*(\d+)\s*(?:°|degrees?)?/i);
    if (angleMatch) {
      startAngle = parseInt(angleMatch[1]);
      endAngle = parseInt(angleMatch[2]);
    } else {
      // Default: quarter arc
      startAngle = 0;
      endAngle = 90;
    }
  }

  return { center, radius, startAngle, endAngle };
}

// Generate deterministic SVG for all shape types on coordinate plane (guaranteed correct axis labels)
function generateDeterministicCoordinatePlaneSVG(prompt: string): string | null {
  // CRITICAL: Skip deterministic generation if prompt contains algebraic/variable coordinates
  // Variables like a, b, c, x, y, etc. indicate this is a proof problem, not a graphing problem
  const hasAlgebraicCoords = /\([a-z][\s,]|,\s*[a-z]\)|[a-z]\s*\+|[a-z]\s*-|[+-]\s*[a-z]|₂|²/i.test(prompt);
  if (hasAlgebraicCoords) {
    console.log("Detected algebraic/variable coordinates - skipping deterministic SVG generation");
    return null;
  }

  // IMPROVED: Parse ONLY explicitly labeled vertex coordinates (A(x,y), B(x,y), etc.)
  // Now supports NEGATIVE coordinates like P(-1, 5) or R(5, -3)
  const labeledVertexMatches = prompt.match(/([A-Z])\s*\((-?\d+),\s*(-?\d+)\)/g) || [];

  // Use a Map to deduplicate labels - only keep the first occurrence of each label
  const labeledVerticesMap = new Map<string, { label: string; x: number; y: number }>();
  for (const match of labeledVertexMatches) {
    const parsed = match.match(/([A-Z])\s*\((-?\d+),\s*(-?\d+)\)/);
    if (parsed) {
      const label = parsed[1];
      // Only add if we haven't seen this label before
      if (!labeledVerticesMap.has(label)) {
        labeledVerticesMap.set(label, {
          label: label,
          x: parseInt(parsed[2]),
          y: parseInt(parsed[3]),
        });
      }
    }
  }

  const labeledVertices = Array.from(labeledVerticesMap.values());

  // Extract coordinates and labels arrays from labeled vertices
  const coordinates = labeledVertices.map((v) => ({ x: v.x, y: v.y }));
  const labels = labeledVertices.map((v) => v.label);

  console.log(
    `Parsed ${labeledVertices.length} unique labeled vertices:`,
    labeledVertices.map((v) => `${v.label}(${v.x}, ${v.y})`).join(", "),
  );

  // Detect shape type
  const shapeInfo = detectShapeType(prompt);

  // For circular shapes, we need center and radius
  let circleInfo: ReturnType<typeof parseCircleInfo> | null = null;
  if (shapeInfo.isCircular) {
    circleInfo = parseCircleInfo(prompt);

    // If we have center in coordinates but not parsed, use first coordinate
    if (!circleInfo.center && coordinates.length > 0) {
      circleInfo.center = coordinates[0];
    }

    // Default radius if not specified
    if (!circleInfo.radius) {
      circleInfo.radius = 3; // Default radius
    }

    console.log(
      `Detected circular shape: ${shapeInfo.type}, center: (${circleInfo.center?.x}, ${circleInfo.center?.y}), radius: ${circleInfo.radius}`,
    );
  } else {
    console.log(`Detected polygon type: ${shapeInfo.type} (${coordinates.length} vertices)`);
  }

  // For circular shapes without coordinates, we still need a center point
  if (shapeInfo.isCircular && circleInfo?.center) {
    // Continue with circle generation
  } else if (coordinates.length === 0) {
    return null; // Can't generate without coordinates
  }

  // Determine the coordinate range needed - SUPPORT NEGATIVE COORDINATES
  let minX = 0;
  let minY = 0;
  let maxX = 10;
  let maxY = 10;

  if (shapeInfo.isCircular && circleInfo?.center && circleInfo?.radius) {
    minX = Math.min(minX, circleInfo.center.x - circleInfo.radius - 2);
    minY = Math.min(minY, circleInfo.center.y - circleInfo.radius - 2);
    maxX = Math.max(maxX, circleInfo.center.x + circleInfo.radius + 2);
    maxY = Math.max(maxY, circleInfo.center.y + circleInfo.radius + 2);
  }
  if (coordinates.length > 0) {
    minX = Math.min(minX, ...coordinates.map((c) => c.x - 2));
    minY = Math.min(minY, ...coordinates.map((c) => c.y - 2));
    maxX = Math.max(maxX, ...coordinates.map((c) => c.x + 2));
    maxY = Math.max(maxY, ...coordinates.map((c) => c.y + 2));
  }

  // Calculate total range
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  // SVG dimensions and scaling - now supports negative coordinates
  const svgWidth = 320;
  const svgHeight = 320;
  const margin = 40;
  const plotWidth = svgWidth - 2 * margin;
  const plotHeight = svgHeight - 2 * margin;
  const scaleX = plotWidth / rangeX;
  const scaleY = plotHeight / rangeY;
  // Use uniform scaling for circles to prevent distortion
  const uniformScale = Math.min(scaleX, scaleY);

  // Helper to convert coordinates to SVG positions (now accounts for minX/minY offset)
  const toSvgX = (x: number) => margin + (x - minX) * scaleX;
  const toSvgY = (y: number) => svgHeight - margin - (y - minY) * scaleY; // Y is inverted in SVG

  // Build SVG parts
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
  
  <!-- Grid lines -->
  <g stroke="#e0e0e0" stroke-width="1">`;

  // Vertical grid lines (from minX to maxX)
  for (let x = minX; x <= maxX; x++) {
    svg += `\n    <line x1="${toSvgX(x)}" y1="${toSvgY(minY)}" x2="${toSvgX(x)}" y2="${toSvgY(maxY)}"/>`;
  }
  // Horizontal grid lines (from minY to maxY)
  for (let y = minY; y <= maxY; y++) {
    svg += `\n    <line x1="${toSvgX(minX)}" y1="${toSvgY(y)}" x2="${toSvgX(maxX)}" y2="${toSvgY(y)}"/>`;
  }

  svg += `\n  </g>
  
  <!-- Axes -->
  <g stroke="#000000" stroke-width="2">
    <!-- X-axis (at y=0, or at minY if 0 is not in range) -->
    <line x1="${toSvgX(minX) - 5}" y1="${toSvgY(0)}" x2="${toSvgX(maxX) + 10}" y2="${toSvgY(0)}"/>
    <!-- X-axis arrow -->
    <polygon points="${toSvgX(maxX) + 10},${toSvgY(0)} ${toSvgX(maxX) + 2},${toSvgY(0) - 4} ${toSvgX(maxX) + 2},${toSvgY(0) + 4}" fill="#000000"/>
    <!-- Y-axis (at x=0, or at minX if 0 is not in range) -->
    <line x1="${toSvgX(0)}" y1="${toSvgY(minY) + 5}" x2="${toSvgX(0)}" y2="${toSvgY(maxY) - 10}"/>
    <!-- Y-axis arrow -->
    <polygon points="${toSvgX(0)},${toSvgY(maxY) - 10} ${toSvgX(0) - 4},${toSvgY(maxY) - 2} ${toSvgX(0) + 4},${toSvgY(maxY) - 2}" fill="#000000"/>
  </g>
  
  <!-- Axis labels -->
  <g font-family="Arial, sans-serif" font-size="11" fill="#000000">
    <!-- X-axis label -->
    <text x="${toSvgX(maxX) + 15}" y="${toSvgY(0) + 4}" font-style="italic">x</text>
    <!-- Y-axis label -->
    <text x="${toSvgX(0) - 5}" y="${toSvgY(maxY) - 15}" font-style="italic">y</text>`;

  // X-axis numbers (from minX to maxX, including negative numbers)
  for (let x = minX; x <= maxX; x++) {
    // Skip 0 label if it overlaps with origin
    if (x === 0 && minY < 0 && maxY > 0) continue;
    svg += `\n    <text x="${toSvgX(x)}" y="${toSvgY(0) + 15}" text-anchor="middle">${x}</text>`;
  }

  // Y-axis numbers (from minY to maxY, including negative numbers)
  for (let y = minY; y <= maxY; y++) {
    if (y === 0) continue; // Skip 0 on Y-axis since it's on X-axis
    svg += `\n    <text x="${toSvgX(0) - 8}" y="${toSvgY(y) + 4}" text-anchor="end">${y}</text>`;
  }

  svg += `\n  </g>`;

  // Draw circular shapes (circles, arcs, semicircles)
  if (shapeInfo.isCircular && circleInfo?.center && circleInfo?.radius) {
    const cx = toSvgX(circleInfo.center.x);
    const cy = toSvgY(circleInfo.center.y);
    const rx = circleInfo.radius * scaleX;
    const ry = circleInfo.radius * scaleY;

    svg += `\n  
  <!-- ${shapeInfo.type.charAt(0).toUpperCase() + shapeInfo.type.slice(1)} -->`;

    if (shapeInfo.type === "circle") {
      // Full circle
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
  </g>`;
    } else if (shapeInfo.type === "ellipse") {
      // Ellipse (same as circle for now, but could support different rx/ry)
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
  </g>`;
    } else if (shapeInfo.type === "semicircle" || shapeInfo.type === "arc") {
      // Arc/Semicircle using SVG path
      const startAngle = circleInfo.startAngle || 0;
      const endAngle = circleInfo.endAngle || 180;

      // Convert angles to radians (SVG uses degrees but we calculate in radians)
      const startRad = ((startAngle - 90) * Math.PI) / 180; // -90 to start from top
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      // Calculate start and end points
      const x1 = cx + rx * Math.cos(startRad);
      const y1 = cy + ry * Math.sin(startRad);
      const x2 = cx + rx * Math.cos(endRad);
      const y2 = cy + ry * Math.sin(endRad);

      // Determine arc flags
      const angleDiff = endAngle - startAngle;
      const largeArcFlag = Math.abs(angleDiff) > 180 ? 1 : 0;
      const sweepFlag = angleDiff > 0 ? 1 : 0;

      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <path d="M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}"/>
  </g>`;
    }

    // Add center point marker and label
    const centerLabel = labels[0] || "C";
    svg += `
  <!-- Center point -->
  <g fill="#000000">
    <circle cx="${cx}" cy="${cy}" r="4"/>
    <text x="${cx + 10}" y="${cy - 10}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${centerLabel}(${circleInfo.center.x}, ${circleInfo.center.y})</text>
  </g>`;

    // Add radius line and label
    svg += `
  <!-- Radius line -->
  <g stroke="#000000" stroke-width="1.5" stroke-dasharray="4,2">
    <line x1="${cx}" y1="${cy}" x2="${cx + rx}" y2="${cy}"/>
  </g>
  <text x="${cx + rx / 2}" y="${cy - 5}" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">r = ${circleInfo.radius}</text>`;
  }

  // Draw polygon shapes (triangles, quadrilaterals, etc.)
  if (!shapeInfo.isCircular && coordinates.length >= 2) {
    svg += `\n  
  <!-- ${shapeInfo.type.charAt(0).toUpperCase() + shapeInfo.type.slice(1)} outline -->`;

    if (shapeInfo.type === "segment") {
      // Line segment: just connect two points
      svg += `
  <g stroke="#000000" stroke-width="2.5" fill="none">
    <line x1="${toSvgX(coordinates[0].x)}" y1="${toSvgY(coordinates[0].y)}" 
          x2="${toSvgX(coordinates[1].x)}" y2="${toSvgY(coordinates[1].y)}"/>
  </g>`;
    } else if (shapeInfo.type === "ray") {
      // Ray: start at first point, extend beyond second point
      const dx = coordinates[1].x - coordinates[0].x;
      const dy = coordinates[1].y - coordinates[0].y;
      const extendedX = coordinates[1].x + dx * 2;
      const extendedY = coordinates[1].y + dy * 2;
      svg += `
  <g stroke="#000000" stroke-width="2.5" fill="none">
    <line x1="${toSvgX(coordinates[0].x)}" y1="${toSvgY(coordinates[0].y)}" 
          x2="${toSvgX(Math.min(maxX, Math.max(0, extendedX)))}" y2="${toSvgY(Math.min(maxY, Math.max(0, extendedY)))}"/>
    <!-- Ray arrow -->
    <polygon points="${toSvgX(coordinates[1].x)},${toSvgY(coordinates[1].y) - 4} ${toSvgX(coordinates[1].x) - 4},${toSvgY(coordinates[1].y) + 4} ${toSvgX(coordinates[1].x) + 4},${toSvgY(coordinates[1].y) + 4}" fill="#000000"/>
  </g>`;
    } else if (shapeInfo.type === "line") {
      // Line: extend in both directions
      const dx = coordinates[1].x - coordinates[0].x;
      const dy = coordinates[1].y - coordinates[0].y;
      const extendedX1 = coordinates[0].x - dx * 2;
      const extendedY1 = coordinates[0].y - dy * 2;
      const extendedX2 = coordinates[1].x + dx * 2;
      const extendedY2 = coordinates[1].y + dy * 2;
      svg += `
  <g stroke="#000000" stroke-width="2.5" fill="none">
    <line x1="${toSvgX(Math.min(maxX, Math.max(0, extendedX1)))}" y1="${toSvgY(Math.min(maxY, Math.max(0, extendedY1)))}" 
          x2="${toSvgX(Math.min(maxX, Math.max(0, extendedX2)))}" y2="${toSvgY(Math.min(maxY, Math.max(0, extendedY2)))}"/>
  </g>`;
    } else {
      // All polygons (triangles, quadrilaterals, pentagons, hexagons, etc.)
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <polygon points="${coordinates.map((c) => `${toSvgX(c.x)},${toSvgY(c.y)}`).join(" ")}"/>
  </g>`;
    }
  }

  // Plot polygon vertices and labels (skip for circles which have their own labeling)
  if (!shapeInfo.isCircular && coordinates.length > 0) {
    // Calculate centroid for smart label placement
    const centroidX = coordinates.reduce((sum, c) => sum + c.x, 0) / coordinates.length;
    const centroidY = coordinates.reduce((sum, c) => sum + c.y, 0) / coordinates.length;

    svg += `\n  
  <!-- Vertices -->
  <g fill="#000000">`;

    coordinates.forEach((coord, i) => {
      const label = labels[i] || String.fromCharCode(65 + i); // A, B, C, D, E, F...
      const labelX = toSvgX(coord.x);
      const labelY = toSvgY(coord.y);

      // Smart label positioning: place labels away from the centroid
      const dirX = coord.x - centroidX;
      const dirY = coord.y - centroidY;
      const magnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

      // Normalize and scale for label offset
      let textOffsetX = (dirX / magnitude) * 25;
      let textOffsetY = (dirY / magnitude) * -15; // Invert Y for SVG

      // Ensure minimum offset
      if (Math.abs(textOffsetX) < 10) textOffsetX = textOffsetX >= 0 ? 12 : -25;
      if (Math.abs(textOffsetY) < 8) textOffsetY = textOffsetY >= 0 ? -10 : 15;

      // Clamp offsets to keep labels in view
      textOffsetX = Math.max(-40, Math.min(15, textOffsetX));
      textOffsetY = Math.max(-15, Math.min(20, textOffsetY));

      svg += `\n    <!-- ${label}(${coord.x}, ${coord.y}) -->
    <circle cx="${labelX}" cy="${labelY}" r="4"/>
    <text x="${labelX + textOffsetX}" y="${labelY + textOffsetY}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${label}(${coord.x}, ${coord.y})</text>`;
    });

    svg += `\n  </g>`;

    // Add special annotations for certain polygon types
    if (shapeInfo.type === "triangle" && coordinates.length === 3) {
      // Check for right angle markers
      const isRightTriangle = prompt.toLowerCase().includes("right");
      if (isRightTriangle) {
        // Find the right angle vertex (usually at the corner with perpendicular sides)
        // For now, add a small square at the first vertex as a right angle marker
        const rightVertex = coordinates[0];
        const size = 6;
        svg += `\n  
  <!-- Right angle marker -->
  <g stroke="#000000" stroke-width="1" fill="none">
    <polyline points="${toSvgX(rightVertex.x) + size},${toSvgY(rightVertex.y)} ${toSvgX(rightVertex.x) + size},${toSvgY(rightVertex.y) - size} ${toSvgX(rightVertex.x)},${toSvgY(rightVertex.y) - size}"/>
  </g>`;
      }
    }
  }

  svg += `
</svg>`;

  // Convert to data URL
  const base64Svg = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64Svg}`;
}

// Detect subject area from prompt for subject-specific diagram styles
function detectSubjectArea(prompt: string): 'math' | 'physics' | 'chemistry' | 'biology' | 'general' {
  const lowerPrompt = prompt.toLowerCase();
  
  // Physics indicators
  const physicsKeywords = [
    'force', 'velocity', 'acceleration', 'momentum', 'circuit', 'wave', 
    'electric', 'magnetic', 'gravity', 'friction', 'motion', 'energy',
    'newton', 'vector', 'projectile', 'pendulum', 'spring', 'resistor',
    'capacitor', 'inductor', 'current', 'voltage', 'ohm', 'watt'
  ];
  if (physicsKeywords.some(kw => lowerPrompt.includes(kw))) {
    return 'physics';
  }
  
  // Chemistry indicators  
  const chemistryKeywords = [
    'molecule', 'atom', 'electron', 'orbital', 'bond', 'reaction',
    'compound', 'element', 'periodic', 'ion', 'chemical', 'ph',
    'acid', 'base', 'oxidation', 'reduction', 'mole', 'lewis',
    'structural', 'organic', 'carbon', 'hydrogen', 'oxygen', 'nitrogen'
  ];
  if (chemistryKeywords.some(kw => lowerPrompt.includes(kw))) {
    return 'chemistry';
  }
  
  // Biology indicators
  const biologyKeywords = [
    'cell', 'dna', 'rna', 'protein', 'mitosis', 'meiosis', 'gene',
    'chromosome', 'organism', 'tissue', 'organ', 'membrane', 'nucleus'
  ];
  if (biologyKeywords.some(kw => lowerPrompt.includes(kw))) {
    return 'biology';
  }
  
  // Math (default for geometric terms)
  const mathKeywords = [
    'triangle', 'circle', 'square', 'rectangle', 'polygon', 'coordinate',
    'graph', 'function', 'equation', 'angle', 'line', 'vertex', 'quadrilateral',
    'pentagon', 'hexagon', 'parabola', 'hyperbola', 'ellipse', 'sine', 'cosine'
  ];
  if (mathKeywords.some(kw => lowerPrompt.includes(kw))) {
    return 'math';
  }
  
  return 'general';
}

// Get subject-specific SVG generation prompt based on the Universal Diagram Component methodology
function getSubjectSpecificPrompt(prompt: string, subject: 'math' | 'physics' | 'chemistry' | 'biology' | 'general'): string {
  const baseRequirements = `
SVG TECHNICAL REQUIREMENTS (MANDATORY):
- Use viewBox="0 0 300 300" for consistent scaling
- Use a consistent stroke-width of 2px for main elements, 1px for details
- Ensure all paths are simplified, closed, and non-overlapping
- Use flat design with NO shadows, NO blurs, NO gradients
- White background (#ffffff), black primary strokes (#000000)
- Clear ID tags for each group (<g id="axis">, <g id="shape">, etc.)
- Path optimization for small file size and readable code
- All text must be horizontal using <text> elements`;

  switch (subject) {
    case 'physics':
      return `Generate a clean, professional SVG diagram for physics education.

DIAGRAM TO CREATE: ${prompt}

PHYSICS DIAGRAM STYLE GUIDE (Technical Schematic):
- Use a professional color palette: slate blues (#4A5568, #2D3748), grays (#718096)
- Use rounded rectangles for components/nodes with rx="4"
- Use clear, straight-line connectors with proper arrowheads
- Vector arrows should use <polygon> for arrowheads, consistent sizing
- Force vectors: bold arrows with magnitude labels
- Circuit components: use standardized symbols (zigzag for resistor, parallel lines for capacitor)
- Include clear axis labels for graphs
- Use stroke-dasharray="4,2" for reference lines or construction aids
- All text labels must be legible (font-size="11" minimum)
- Ensure symmetrical and balanced layout

${baseRequirements}

Return ONLY valid SVG code, no explanation.`;

    case 'chemistry':
      return `Generate a clean, professional SVG diagram for chemistry education.

DIAGRAM TO CREATE: ${prompt}

CHEMISTRY DIAGRAM STYLE GUIDE (Molecular/Structural):
- Use a consistent stroke-width of 2px for bonds
- Single bonds: straight lines
- Double bonds: two parallel lines with 2px gap
- Triple bonds: three parallel lines
- Atoms/elements: circles with element symbol text centered
- Use professional colors: Carbon (#333), Oxygen (#EF4444), Nitrogen (#3B82F6), Hydrogen (#9CA3AF)
- Electron dots: small filled circles (r="2")
- Orbital diagrams: use ellipses with proper labeling
- Lewis structures: clear dot positioning around atoms
- Reaction arrows: use proper arrow notation (→, ⇌)
- Keep molecular structures flat and 2D (no 3D perspective)

${baseRequirements}

Return ONLY valid SVG code, no explanation.`;

    case 'biology':
      return `Generate a clean, professional SVG diagram for biology education.

DIAGRAM TO CREATE: ${prompt}

BIOLOGY DIAGRAM STYLE GUIDE (Educational Diagram):
- Use modular design where individual parts can be identified
- Cell structures: use distinct shapes for each organelle
- Use professional colors: membrane (#84CC16), nucleus (#8B5CF6), cytoplasm (#FEF3C7)
- Clear labels with leader lines connecting to structures
- Cross-sections: use different fill patterns or subtle color differences
- Include scale references where appropriate
- Symmetrical layouts for comparative diagrams

${baseRequirements}

Return ONLY valid SVG code, no explanation.`;

    case 'math':
      return `Generate a precise, textbook-quality mathematical SVG diagram.

DIAGRAM TO CREATE: ${prompt}

MATH DIAGRAM STYLE GUIDE (Geometric/Coordinate):
- Coordinate planes: complete grid with light gray lines (#e0e0e0)
- Bold black axes with arrows at ends
- Number labels at regular intervals, properly positioned
- Plot points as solid black circles (r="4")
- Label each point with name and coordinates
- Shapes: stroke="#000000" stroke-width="2" fill="none"
- Angle arcs: use <path> with arc notation, include degree labels
- Right angle markers: small squares at corners
- Construction lines: stroke-dasharray="5,5"
- Measurements: positioned <text> elements with appropriate font-size

${baseRequirements}

Return ONLY valid SVG code, no explanation.`;

    default:
      return `Generate a clean, professional SVG icon/diagram.

DIAGRAM TO CREATE: ${prompt}

GENERAL DIAGRAM STYLE GUIDE (Universal Diagram Component):
- Minimalist line-art style
- Consistent stroke-weight of 2px
- Simplified, closed, non-overlapping paths
- Professional appearance suitable for educational use
- Centered composition
- Clear visual hierarchy

${baseRequirements}

Return ONLY valid SVG code, no explanation.`;
  }
}

// Generate presentation-style SVG with colors (fast, clean, educational)
async function generatePresentationSVG(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    console.log("Generating presentation SVG with fast model...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fastest model
        messages: [
          {
            role: "system",
            content: `You are an expert at creating CLEAN, SIMPLE SVG illustrations for educational presentations.

CRITICAL REQUIREMENTS:
1. SIMPLE flat design - minimal detail, clean lines
2. Use SOFT COLORS - pastel tones, muted palettes suitable for dark slide backgrounds
3. viewBox="0 0 300 300" always
4. stroke-width="2" for main elements
5. NO text labels, NO words in the SVG
6. NO shadows, gradients, or complex effects
7. Keep SVG code minimal for fast loading
8. Educational and professional appearance
9. Icon/illustration style - single centered subject

Example color palette: soft blues (#60A5FA, #3B82F6), soft greens (#4ADE80), soft yellows (#FCD34D), soft purples (#A78BFA)

Return ONLY valid SVG code, nothing else.`,
          },
          {
            role: "user",
            content: `Create a SIMPLE, CLEAN SVG illustration for a presentation slide: ${prompt}

Requirements:
- Simple flat design with soft colors
- Educational/professional style
- Centered composition
- No text or labels
- Minimal detail, clean lines`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500, // Small for speed
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Extract SVG from the response
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      let svgString = svgMatch[0];
      
      // Ensure viewBox is present
      if (!svgString.includes('viewBox')) {
        svgString = svgString.replace('<svg', '<svg viewBox="0 0 300 300"');
      }
      
      // Ensure width and height are set
      if (!svgString.includes('width=')) {
        svgString = svgString.replace('<svg', '<svg width="300" height="300"');
      }
      
      // Convert SVG to data URL
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    }

    return null;
  } catch (error) {
    console.error("Error generating presentation SVG:", error);
    return null;
  }
}

// Generate SIMPLE black-and-white SVG diagram (fast, minimal detail, no colors)
async function generateSimpleSVGWithAI(prompt: string): Promise<string | null> {
  // First, try deterministic generation for coordinate plane problems
  const isCoordinatePlane = prompt.toLowerCase().includes("coordinate") || prompt.match(/[A-Z]\s*\(\d+,\s*\d+\)/);

  if (isCoordinatePlane) {
    console.log("Using deterministic SVG generator for coordinate plane...");
    const deterministicSvg = generateDeterministicCoordinatePlaneSVG(prompt);
    if (deterministicSvg) {
      console.log("Deterministic SVG generated successfully");
      return deterministicSvg;
    }
  }

  // Fall back to AI generation with SIMPLE B&W style
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    const subject = detectSubjectArea(prompt);
    console.log(`Generating simple B&W SVG for subject: ${subject}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Faster, cheaper model
        messages: [
          {
            role: "system",
            content: `You are an expert at creating SIMPLE black-and-white SVG line diagrams for educational worksheets.

CRITICAL REQUIREMENTS:
1. BLACK AND WHITE ONLY - No colors, no fills, just black strokes on white background
2. MINIMAL DETAIL - Simple line art only, like a textbook diagram
3. FAST GENERATION - Keep SVG code minimal and clean
4. viewBox="0 0 300 300" always
5. stroke="#000000" stroke-width="2" for all lines
6. NO shadows, gradients, or complex effects
7. NO filled shapes - use fill="none" or fill="#ffffff"
8. Labels in simple black text, always horizontal

Return ONLY valid SVG code, nothing else.`,
          },
          {
            role: "user",
            content: `Create a SIMPLE black-and-white line diagram for: ${prompt}

Requirements:
- Black lines on white background ONLY
- Simple line art, no shading or colors
- Minimal detail, clear and clean
- Educational textbook style
- All text labels horizontal`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500, // Smaller for speed
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Extract SVG from the response
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      let svgString = svgMatch[0];
      
      // Ensure viewBox is present
      if (!svgString.includes('viewBox')) {
        svgString = svgString.replace('<svg', '<svg viewBox="0 0 300 300"');
      }
      
      // Ensure width and height are set
      if (!svgString.includes('width=')) {
        svgString = svgString.replace('<svg', '<svg width="300" height="300"');
      }
      
      // Force black and white by removing any color fills
      svgString = svgString.replace(/fill="(?!none|#fff|#ffffff|white)[^"]*"/gi, 'fill="none"');
      
      // Convert SVG to data URL
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    }

    return null;
  } catch (error) {
    console.error("Error generating simple SVG with AI:", error);
    return null;
  }
}


async function generateSVGWithAI(prompt: string): Promise<string | null> {
  // First, try deterministic generation for coordinate plane problems
  const isCoordinatePlane = prompt.toLowerCase().includes("coordinate") || prompt.match(/[A-Z]\s*\(\d+,\s*\d+\)/);

  if (isCoordinatePlane) {
    console.log("Using deterministic SVG generator for coordinate plane...");
    const deterministicSvg = generateDeterministicCoordinatePlaneSVG(prompt);
    if (deterministicSvg) {
      console.log("Deterministic SVG generated successfully");
      return deterministicSvg;
    }
  }

  // Fall back to AI generation for non-coordinate-plane diagrams
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    // Detect subject area and get subject-specific prompt
    const subject = detectSubjectArea(prompt);
    console.log(`Detected subject area: ${subject}`);
    const enhancedPrompt = getSubjectSpecificPrompt(prompt, subject);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating professional SVG diagrams for educational ${subject} worksheets. 
            
CORE PRINCIPLES:
1. FLAT DESIGN ONLY - No shadows, blurs, or complex effects
2. PATH OPTIMIZATION - Keep code clean and minimal
3. VIEWBOX SETTINGS - Always use viewBox="0 0 300 300" for easy scaling
4. CONSISTENT STROKES - Use 2px for main elements, 1px for details
5. PROPER GROUPING - Use <g> elements with descriptive IDs
6. HORIZONTAL TEXT - All labels must be horizontal, never rotated

Return only valid SVG code, nothing else.`,
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Extract SVG from the response
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      // Validate and clean up the SVG
      let svgString = svgMatch[0];
      
      // Ensure viewBox is present
      if (!svgString.includes('viewBox')) {
        svgString = svgString.replace('<svg', '<svg viewBox="0 0 300 300"');
      }
      
      // Ensure width and height are set
      if (!svgString.includes('width=')) {
        svgString = svgString.replace('<svg', '<svg width="300" height="300"');
      }
      
      // Convert SVG to data URL
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    }

    return null;
  } catch (error) {
    console.error("Error generating SVG with AI:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support presentation-style and clipart image generation
    // Presentations use REAL PNG/JPEG image generation (not SVG) for better compatibility
    if (body.prompt && (body.style === "clipart" || body.style === "presentation")) {
      console.log(`Generating ${body.style} image...`);

      const isPresentation = body.style === "presentation";
      const userPrompt = body.prompt;
      const topic = body.topic || "";
      const slideTitle = body.slideTitle || "";

      let imageUrl: string | null = null;

      // For presentations, use the high-quality PNG/JPEG image generator
      // This produces actual images that work everywhere (PowerPoint, Word, etc.)
      if (isPresentation) {
        console.log("Using Nano Banana Pro for PNG presentation image...");
        
        // Build a rich prompt for the image generator - request transparent/seamless backgrounds
        const imagePrompt = `${userPrompt}

${topic ? `Context: This is for a presentation about "${topic}".` : ""}
${slideTitle ? `This image is for a slide titled "${slideTitle}".` : ""}

CRITICAL STYLE REQUIREMENTS:
- Create a high-quality, professional educational illustration
- Use a TRANSPARENT or GRADIENT background that blends seamlessly with colorful slide backgrounds
- DO NOT use a solid white, black, or single-color background
- The subject should appear to float or blend naturally into any background
- If background is needed, use soft gradients that fade to transparency at the edges
- Vibrant colors, clean design, suitable for classroom projection
- No text, labels, or words in the image
- Think "sticker style" - the main subject should be clearly visible but blend into any colored backdrop`;

        imageUrl = await generatePresentationImage(imagePrompt);
        
        if (imageUrl) {
          console.log("Successfully generated PNG presentation image");
        }
      }

      // Fallback to SVG only for clipart style or if PNG fails
      if (!imageUrl) {
        console.log("Using SVG fallback...");
        const svgPrompt = isPresentation
          ? `Create a clean, simple educational illustration for: ${userPrompt}
${topic ? `Topic: ${topic}` : ""}
${slideTitle ? `Slide: ${slideTitle}` : ""}

Style: Simple line art, clean educational diagram suitable for projection.`
          : userPrompt;

        imageUrl = await generatePresentationSVG(svgPrompt);

        if (!imageUrl) {
          console.log("SVG failed, trying simple B&W SVG...");
          imageUrl = await generateSimpleSVGWithAI(svgPrompt);
        }
      }

      // Return imageUrl (null is acceptable - frontend should handle gracefully)
      return new Response(
        JSON.stringify({ imageUrl: imageUrl || null, fallback: !imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Existing batch question image generation
    // DEFAULT: Use fast, simple black-and-white SVG generation
    // Only use AI images if explicitly requested with useNanoBanana=true
    const { questions, useNanoBanana, preferDeterministicSVG, useSimpleSVG } = body as {
      questions: QuestionWithPrompt[];
      useNanoBanana?: boolean;
      preferDeterministicSVG?: boolean;
      useSimpleSVG?: boolean; // New: force simple B&W SVG
    };

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default to simple SVG generation (fast, B&W, minimal detail)
    const shouldUseSimpleSVG = useSimpleSVG !== false && !useNanoBanana;
    
    console.log(
      `Starting image generation for ${questions.length} questions (Simple SVG: ${shouldUseSimpleSVG}, Nano Banana: ${useNanoBanana})...`,
    );

    const results: { questionNumber: number; imageUrl: string | null; validation?: ValidationResult | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);

      let imageUrl: string | null = null;
      let validation: ValidationResult | null = null;
      const subject = detectSubjectArea(q.imagePrompt);

      // STEP 1: Try Regents Shape Library first (fastest, most accurate)
      console.log("Checking Regents Shape Library...");
      imageUrl = await queryShapeLibrary(q.imagePrompt, subject);
      if (imageUrl) {
        console.log("Found matching shape in library!");
        validation = { isValid: true, issues: [], shouldRetry: false };
      }

      // STEP 2: Try deterministic SVG generation (for coordinate plane problems)
      if (!imageUrl && (shouldUseSimpleSVG || preferDeterministicSVG)) {
        console.log("Using fast deterministic SVG generator (B&W, simple)...");
        imageUrl = generateDeterministicCoordinatePlaneSVG(q.imagePrompt);
        if (imageUrl) {
          console.log("Deterministic SVG generated successfully");
          validation = { isValid: true, issues: [], shouldRetry: false };
        }
      }

      // STEP 3: Skip AI generation for worksheets - it's too inaccurate for geometry
      // Instead, rely on the Regents Shape Library database of scanned verified diagrams
      if (!imageUrl) {
        console.log("No matching diagram found in Regents Shape Library. Skipping AI generation (disabled for accuracy).");
        console.log("Tip: Import more diagrams from Regents PDFs to expand the library.");
      }

      // STEP 4: Use hardcoded fallback shapes as last resort
      if (!imageUrl) {
        console.log("AI generation failed, trying hardcoded fallback shapes...");
        imageUrl = getFallbackShape(q.imagePrompt);
        if (imageUrl) {
          console.log("Using hardcoded fallback shape");
          validation = { isValid: true, issues: ['Used fallback shape'], shouldRetry: false };
        }
      }

      results.push({
        questionNumber: q.questionNumber,
        imageUrl,
        validation,
      });

      const validationStatus = validation
        ? validation.isValid
          ? "✓ Valid"
          : `⚠ Issues: ${validation.issues.join(", ")}`
        : "";
      console.log(`Question ${q.questionNumber}: ${imageUrl ? "Success" : "Failed"} ${validationStatus}`);
    }

    const successCount = results.filter((r) => r.imageUrl).length;
    const validCount = results.filter((r) => r.validation?.isValid !== false).length;
    console.log(`Completed: ${successCount}/${questions.length} images generated, ${validCount} passed validation`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in generate-diagram-images:", error);
    const message = error instanceof Error ? error.message : "Failed to generate images";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
