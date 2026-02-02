-- Phase 5.1: Add geometry_type column to regents_shape_library
-- This enables better matching between structured geometry metadata and library shapes

-- Add geometry_type column
ALTER TABLE public.regents_shape_library 
ADD COLUMN geometry_type TEXT;

-- Create index for fast lookups by geometry_type
CREATE INDEX idx_regents_shapes_geometry_type 
ON public.regents_shape_library(geometry_type);

-- Create composite index for geometry_type + subject (common query pattern)
CREATE INDEX idx_regents_shapes_geometry_subject 
ON public.regents_shape_library(geometry_type, subject);

-- Populate geometry_type based on existing data
-- This uses the vertices and parameters JSONB columns to infer the type

UPDATE public.regents_shape_library
SET geometry_type = CASE
  -- Polygons based on vertex count
  WHEN vertices IS NOT NULL AND jsonb_array_length(vertices) = 3 THEN 'triangle'
  WHEN vertices IS NOT NULL AND jsonb_array_length(vertices) = 4 THEN 'quadrilateral'
  WHEN vertices IS NOT NULL AND jsonb_array_length(vertices) > 4 THEN 'coordinate_polygon'
  
  -- Circles based on parameters
  WHEN parameters IS NOT NULL AND parameters ? 'center' AND parameters ? 'radius' THEN 'circle'
  
  -- Transformations (check tags)
  WHEN 'rotation' = ANY(tags) THEN 'rotation'
  WHEN 'reflection' = ANY(tags) THEN 'reflection'
  WHEN 'translation' = ANY(tags) THEN 'translation'
  WHEN 'dilation' = ANY(tags) THEN 'dilation'
  
  -- Number line (check tags or shape_type)
  WHEN 'number_line' = ANY(tags) OR shape_type = 'number_line' THEN 'number_line'
  
  -- Angles (check tags)
  WHEN 'angle' = ANY(tags) OR shape_type = 'angle' THEN 'angle_diagram'
  
  -- Default: use shape_type as fallback
  ELSE shape_type
END
WHERE geometry_type IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.regents_shape_library.geometry_type IS 
'Structured geometry type matching GeometryShapeType enum. Used for precise matching with generated geometry metadata.';
