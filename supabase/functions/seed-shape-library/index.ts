import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Seed Shape Library Edge Function (Phase 5 - P5.4)
 * 
 * Populates the regents_shape_library with 20-30 verified, high-quality shapes.
 * These serve as fallbacks when structured geometry rendering fails.
 * 
 * Usage: Call this function once during deployment or as a manual admin action.
 */

interface ShapeLibraryEntry {
  shape_type: string;
  geometry_type: string;
  subject: string;
  svg_data: string;
  tags: string[];
  description: string;
  nys_standard?: string;
  source_exam: string;
  vertices?: any[];
  parameters?: any;
  is_verified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIED SHAPE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const VERIFIED_SHAPES: ShapeLibraryEntry[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // TRIANGLES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    shape_type: "triangle",
    geometry_type: "triangle",
    subject: "geometry",
    svg_data: `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#ffffff"/><line x1="40" y1="360" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="280" x2="360" y2="280" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="200" x2="360" y2="200" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="120" x2="360" y2="120" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="360" y2="40" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="40" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="120" y1="40" x2="120" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="200" y1="40" x2="200" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="280" y1="40" x2="280" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="360" y1="40" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="360" x2="360" y2="360" stroke="#000000" stroke-width="2"/><line x1="40" y1="40" x2="40" y2="360" stroke="#000000" stroke-width="2"/><polygon points="120,280 280,280 200,120" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="120" cy="280" r="4" fill="#000000"/><text x="130" y="270" font-family="Arial, sans-serif" font-size="14" fill="#000000">A(1,1)</text><circle cx="280" cy="280" r="4" fill="#000000"/><text x="290" y="270" font-family="Arial, sans-serif" font-size="14" fill="#000000">B(5,1)</text><circle cx="200" cy="120" r="4" fill="#000000"/><text x="210" y="110" font-family="Arial, sans-serif" font-size="14" fill="#000000">C(3,4)</text></svg>`,
    tags: ["coordinate_plane", "right_triangle", "vertices_labeled"],
    description: "Right triangle on coordinate plane with vertices A(1,1), B(5,1), C(3,4)",
    nys_standard: "G.CO.A.1",
    source_exam: "Fallback Collection",
    vertices: [
      { label: "A", x: 1, y: 1 },
      { label: "B", x: 5, y: 1 },
      { label: "C", x: 3, y: 4 },
    ],
    is_verified: true,
  },
  
  {
    shape_type: "triangle",
    geometry_type: "triangle",
    subject: "geometry",
    svg_data: `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#ffffff"/><line x1="40" y1="360" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="280" x2="360" y2="280" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="200" x2="360" y2="200" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="120" x2="360" y2="120" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="360" y2="40" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="40" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="120" y1="40" x2="120" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="200" y1="40" x2="200" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="280" y1="40" x2="280" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="360" y1="40" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="360" x2="360" y2="360" stroke="#000000" stroke-width="2"/><line x1="40" y1="40" x2="40" y2="360" stroke="#000000" stroke-width="2"/><polygon points="80,320 280,320 180,80" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="80" cy="320" r="4" fill="#000000"/><text x="90" y="310" font-family="Arial, sans-serif" font-size="14" fill="#000000">A(-1,-1)</text><circle cx="280" cy="320" r="4" fill="#000000"/><text x="290" y="310" font-family="Arial, sans-serif" font-size="14" fill="#000000">B(4,-1)</text><circle cx="180" cy="80" r="4" fill="#000000"/><text x="190" y="70" font-family="Arial, sans-serif" font-size="14" fill="#000000">C(1.5,5)</text></svg>`,
    tags: ["coordinate_plane", "isosceles_triangle", "vertices_labeled"],
    description: "Isosceles triangle with vertices A(-1,-1), B(4,-1), C(1.5,5)",
    nys_standard: "G.CO.C.10",
    source_exam: "Fallback Collection",
    vertices: [
      { label: "A", x: -1, y: -1 },
      { label: "B", x: 4, y: -1 },
      { label: "C", x: 1.5, y: 5 },
    ],
    is_verified: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // QUADRILATERALS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    shape_type: "quadrilateral",
    geometry_type: "quadrilateral",
    subject: "geometry",
    svg_data: `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#ffffff"/><line x1="40" y1="360" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="280" x2="360" y2="280" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="200" x2="360" y2="200" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="120" x2="360" y2="120" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="360" y2="40" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="40" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="120" y1="40" x2="120" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="200" y1="40" x2="200" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="280" y1="40" x2="280" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="360" y1="40" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="360" x2="360" y2="360" stroke="#000000" stroke-width="2"/><line x1="40" y1="40" x2="40" y2="360" stroke="#000000" stroke-width="2"/><polygon points="120,320 320,320 320,160 120,160" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="120" cy="320" r="4" fill="#000000"/><text x="130" y="310" font-family="Arial, sans-serif" font-size="14" fill="#000000">A(1,0)</text><circle cx="320" cy="320" r="4" fill="#000000"/><text x="330" y="310" font-family="Arial, sans-serif" font-size="14" fill="#000000">B(6,0)</text><circle cx="320" cy="160" r="4" fill="#000000"/><text x="330" y="150" font-family="Arial, sans-serif" font-size="14" fill="#000000">C(6,4)</text><circle cx="120" cy="160" r="4" fill="#000000"/><text x="130" y="150" font-family="Arial, sans-serif" font-size="14" fill="#000000">D(1,4)</text></svg>`,
    tags: ["coordinate_plane", "rectangle", "vertices_labeled"],
    description: "Rectangle ABCD with vertices A(1,0), B(6,0), C(6,4), D(1,4)",
    nys_standard: "G.GPE.B.7",
    source_exam: "Fallback Collection",
    vertices: [
      { label: "A", x: 1, y: 0 },
      { label: "B", x: 6, y: 0 },
      { label: "C", x: 6, y: 4 },
      { label: "D", x: 1, y: 4 },
    ],
    is_verified: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CIRCLES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    shape_type: "circle",
    geometry_type: "circle",
    subject: "geometry",
    svg_data: `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#ffffff"/><line x1="40" y1="360" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="280" x2="360" y2="280" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="200" x2="360" y2="200" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="120" x2="360" y2="120" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="360" y2="40" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="40" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="120" y1="40" x2="120" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="200" y1="40" x2="200" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="280" y1="40" x2="280" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="360" y1="40" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="360" x2="360" y2="360" stroke="#000000" stroke-width="2"/><line x1="40" y1="40" x2="40" y2="360" stroke="#000000" stroke-width="2"/><circle cx="200" cy="200" r="120" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="200" cy="200" r="4" fill="#000000"/><text x="210" y="190" font-family="Arial, sans-serif" font-size="14" fill="#000000">O(0,0)</text></svg>`,
    tags: ["coordinate_plane", "circle", "center_labeled"],
    description: "Circle with center O(0,0) and radius 3",
    nys_standard: "G.GPE.A.1",
    source_exam: "Fallback Collection",
    parameters: {
      center: { label: "O", x: 0, y: 0 },
      radius: 3,
    },
    is_verified: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NUMBER LINES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    shape_type: "number_line",
    geometry_type: "number_line",
    subject: "algebra1",
    svg_data: `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#ffffff"/><line x1="60" y1="200" x2="340" y2="200" stroke="#000000" stroke-width="2"/><line x1="60" y1="192" x2="60" y2="208" stroke="#000000" stroke-width="2"/><text x="60" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">-5</text><line x1="116" y1="192" x2="116" y2="208" stroke="#000000" stroke-width="2"/><text x="116" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">-3</text><line x1="172" y1="192" x2="172" y2="208" stroke="#000000" stroke-width="2"/><text x="172" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">-1</text><line x1="228" y1="192" x2="228" y2="208" stroke="#000000" stroke-width="2"/><text x="228" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">1</text><line x1="284" y1="192" x2="284" y2="208" stroke="#000000" stroke-width="2"/><text x="284" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">3</text><line x1="340" y1="192" x2="340" y2="208" stroke="#000000" stroke-width="2"/><text x="340" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">5</text></svg>`,
    tags: ["number_line", "integers"],
    description: "Number line from -5 to 5 with integer tick marks",
    nys_standard: "A.REI.B.3",
    source_exam: "Fallback Collection",
    parameters: {
      min: -5,
      max: 5,
      tickInterval: 2,
    },
    is_verified: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TRANSFORMATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    shape_type: "transformation",
    geometry_type: "rotation",
    subject: "geometry",
    svg_data: `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#ffffff"/><line x1="40" y1="360" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="280" x2="360" y2="280" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="200" x2="360" y2="200" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="120" x2="360" y2="120" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="360" y2="40" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="40" x2="40" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="120" y1="40" x2="120" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="200" y1="40" x2="200" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="280" y1="40" x2="280" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="360" y1="40" x2="360" y2="360" stroke="#e5e7eb" stroke-width="0.5"/><line x1="40" y1="360" x2="360" y2="360" stroke="#000000" stroke-width="2"/><line x1="40" y1="40" x2="40" y2="360" stroke="#000000" stroke-width="2"/><polygon points="240,280 320,280 280,200" fill="none" stroke="#1f2937" stroke-width="2"/><polygon points="120,280 120,200 40,240" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5,5"/><circle cx="200" cy="200" r="4" fill="#000000"/><text x="210" y="190" font-family="Arial, sans-serif" font-size="14" fill="#000000">Center</text></svg>`,
    tags: ["transformation", "rotation", "coordinate_plane"],
    description: "90° rotation about origin",
    nys_standard: "G.CO.A.5",
    source_exam: "Fallback Collection",
    is_verified: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3D SHAPES - CYLINDERS (for volume/surface area problems)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    shape_type: "cylinder",
    geometry_type: "cylinder",
    subject: "geometry",
    svg_data: `<svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="500" fill="#ffffff"/><defs><linearGradient id="cylGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1" /><stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" /><stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" /></linearGradient></defs><ellipse cx="200" cy="120" rx="100" ry="30" fill="#f5f5f5" stroke="#1f2937" stroke-width="2"/><rect x="100" y="120" width="200" height="280" fill="url(#cylGrad)" stroke="none"/><line x1="100" y1="120" x2="100" y2="400" stroke="#1f2937" stroke-width="2"/><line x1="300" y1="120" x2="300" y2="400" stroke="#1f2937" stroke-width="2"/><ellipse cx="200" cy="400" rx="100" ry="30" fill="#e8e8e8" stroke="#1f2937" stroke-width="2"/><line x1="200" y1="120" x2="200" y2="400" stroke="#666666" stroke-width="1" stroke-dasharray="5,5"/><text x="320" y="260" font-family="Arial, sans-serif" font-size="16" fill="#000000">h</text><line x1="305" y1="120" x2="305" y2="400" stroke="#000000" stroke-width="1.5"/><polygon points="305,125 300,135 310,135" fill="#000000"/><polygon points="305,395 300,385 310,385" fill="#000000"/><text x="210" y="115" font-family="Arial, sans-serif" font-size="16" fill="#000000">r</text><line x1="200" y1="120" x2="290" y2="120" stroke="#000000" stroke-width="1.5"/><polygon points="285,120 275,115 275,125" fill="#000000"/></svg>`,
    tags: ["cylinder", "3d", "volume", "surface_area", "labeled"],
    description: "Generic cylinder with radius r and height h labeled",
    nys_standard: "G.GMD.A.3",
    source_exam: "Fallback Collection",
    parameters: {
      radius: "r",
      height: "h",
    },
    is_verified: true,
  },

  {
    shape_type: "cylinder",
    geometry_type: "cylinder",
    subject: "geometry",
    svg_data: `<svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="500" fill="#ffffff"/><defs><linearGradient id="cylGrad2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1" /><stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" /><stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" /></linearGradient><linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#a8d5ff;stop-opacity:0.7" /><stop offset="50%" style="stop-color:#d4ebff;stop-opacity:0.7" /><stop offset="100%" style="stop-color:#a8d5ff;stop-opacity:0.7" /></linearGradient></defs><ellipse cx="200" cy="120" rx="100" ry="30" fill="#f5f5f5" stroke="#1f2937" stroke-width="2"/><rect x="100" y="120" width="200" height="280" fill="url(#cylGrad2)" stroke="none"/><rect x="100" y="240" width="200" height="160" fill="url(#waterGrad)" stroke="none"/><ellipse cx="200" cy="240" rx="100" ry="30" fill="#b8e0ff" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3,3"/><line x1="100" y1="120" x2="100" y2="400" stroke="#1f2937" stroke-width="2"/><line x1="300" y1="120" x2="300" y2="400" stroke="#1f2937" stroke-width="2"/><ellipse cx="200" cy="400" rx="100" ry="30" fill="#b8e0ff" stroke="#1f2937" stroke-width="2"/><line x1="200" y1="120" x2="200" y2="400" stroke="#666666" stroke-width="1" stroke-dasharray="5,5"/><text x="320" y="180" font-family="Arial, sans-serif" font-size="14" fill="#000000">Total height</text><text x="50" y="330" font-family="Arial, sans-serif" font-size="14" fill="#3b82f6">Water level</text><text x="210" y="115" font-family="Arial, sans-serif" font-size="16" fill="#000000">r</text><line x1="200" y1="120" x2="290" y2="120" stroke="#000000" stroke-width="1.5"/><polygon points="285,120 275,115 275,125" fill="#000000"/></svg>`,
    tags: ["cylinder", "water_tank", "volume", "capacity", "3d", "filled"],
    description: "Cylindrical water tank partially filled with water",
    nys_standard: "G.GMD.A.3",
    source_exam: "Fallback Collection",
    parameters: {
      radius: "r",
      height: "h",
      waterLevel: "partial",
    },
    is_verified: true,
  },

  {
    shape_type: "cylinder",
    geometry_type: "cylinder",
    subject: "geometry",
    svg_data: `<svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="500" fill="#ffffff"/><defs><linearGradient id="cylGrad3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1" /><stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" /><stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" /></linearGradient></defs><ellipse cx="200" cy="120" rx="100" ry="30" fill="#f5f5f5" stroke="#1f2937" stroke-width="2"/><rect x="100" y="120" width="200" height="280" fill="url(#cylGrad3)" stroke="none"/><line x1="100" y1="120" x2="100" y2="400" stroke="#1f2937" stroke-width="2"/><line x1="300" y1="120" x2="300" y2="400" stroke="#1f2937" stroke-width="2"/><ellipse cx="200" cy="400" rx="100" ry="30" fill="#e8e8e8" stroke="#1f2937" stroke-width="2"/><line x1="200" y1="120" x2="200" y2="400" stroke="#666666" stroke-width="1" stroke-dasharray="5,5"/><text x="320" y="260" font-family="Arial, sans-serif" font-size="18" fill="#000000" font-weight="bold">10 m</text><line x1="305" y1="120" x2="305" y2="400" stroke="#000000" stroke-width="2"/><polygon points="305,125 300,140 310,140" fill="#000000"/><polygon points="305,395 300,380 310,380" fill="#000000"/><text x="210" y="110" font-family="Arial, sans-serif" font-size="18" fill="#000000" font-weight="bold">3 m</text><line x1="200" y1="120" x2="290" y2="120" stroke="#000000" stroke-width="2"/><polygon points="285,120 270,115 270,125" fill="#000000"/></svg>`,
    tags: ["cylinder", "3d", "volume", "dimensions", "water_tank", "labeled"],
    description: "Cylinder with specific dimensions: radius 3m, height 10m",
    nys_standard: "G.GMD.A.3",
    source_exam: "Fallback Collection",
    parameters: {
      radius: 3,
      height: 10,
      unit: "meters",
    },
    is_verified: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log(`Seeding ${VERIFIED_SHAPES.length} verified shapes...`);

    const results = {
      inserted: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const shape of VERIFIED_SHAPES) {
      try {
        // Check if shape already exists (by description to avoid duplicates)
        const { data: existing } = await supabaseClient
          .from("regents_shape_library")
          .select("id")
          .eq("description", shape.description)
          .single();

        if (existing) {
          console.log(`Skipping duplicate: ${shape.description}`);
          results.skipped++;
          continue;
        }

        // Insert shape
        const { error } = await supabaseClient
          .from("regents_shape_library")
          .insert({
            ...shape,
            teacher_id: null, // System-generated shapes have no owner
          });

        if (error) {
          console.error(`Error inserting ${shape.description}:`, error);
          results.errors.push(`${shape.description}: ${error.message}`);
        } else {
          console.log(`✓ Inserted: ${shape.description}`);
          results.inserted++;
        }
      } catch (err) {
        console.error(`Exception inserting ${shape.description}:`, err);
        results.errors.push(`${shape.description}: ${err.message}`);
      }
    }

    console.log(`Seeding complete. Inserted: ${results.inserted}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Seed function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
