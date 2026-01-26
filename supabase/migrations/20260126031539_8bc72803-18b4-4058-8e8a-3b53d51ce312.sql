-- Create table to store cataloged shapes from Regents exams
CREATE TABLE public.regents_shape_library (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES public.profiles(id),
    
    -- Shape identification
    shape_type TEXT NOT NULL, -- e.g., 'triangle', 'quadrilateral', 'circle', 'parabola', 'circuit', 'molecule'
    subject TEXT NOT NULL, -- 'geometry', 'algebra1', 'algebra2', 'physics', 'chemistry'
    
    -- The actual shape data
    svg_data TEXT NOT NULL, -- Complete SVG string (compact, reusable)
    thumbnail_url TEXT, -- Base64 or storage URL for quick preview
    
    -- Metadata for matching
    tags TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['coordinate_plane', 'right_triangle', 'transformation']
    description TEXT, -- Human-readable description
    nys_standard TEXT, -- e.g., 'G.CO.B.6'
    
    -- Source information
    source_exam TEXT, -- e.g., 'June 2024 Geometry Regents'
    source_question_number INTEGER,
    source_image_url TEXT, -- Original scanned image
    
    -- Coordinates/parameters for programmatic reuse
    vertices JSONB, -- For polygons: [{"label": "A", "x": 0, "y": 0}, ...]
    parameters JSONB, -- For other shapes: {"center": [5,4], "radius": 3} or {"vertex": [0,0], "opens": "up"}
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false, -- Teacher has verified the shape is accurate
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regents_shape_library ENABLE ROW LEVEL SECURITY;

-- Teachers can view all shapes (shared library)
CREATE POLICY "Anyone can view verified shapes" 
ON public.regents_shape_library 
FOR SELECT 
USING (is_verified = true OR teacher_id = auth.uid());

-- Teachers can create shapes
CREATE POLICY "Teachers can create shapes" 
ON public.regents_shape_library 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own shapes
CREATE POLICY "Teachers can update their own shapes" 
ON public.regents_shape_library 
FOR UPDATE 
USING (auth.uid() = teacher_id);

-- Teachers can delete their own shapes
CREATE POLICY "Teachers can delete their own shapes" 
ON public.regents_shape_library 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create indexes for fast lookups
CREATE INDEX idx_regents_shapes_subject_type ON public.regents_shape_library(subject, shape_type);
CREATE INDEX idx_regents_shapes_tags ON public.regents_shape_library USING GIN(tags);
CREATE INDEX idx_regents_shapes_standard ON public.regents_shape_library(nys_standard);
CREATE INDEX idx_regents_shapes_verified ON public.regents_shape_library(is_verified) WHERE is_verified = true;

-- Add trigger for updated_at
CREATE TRIGGER update_regents_shape_library_updated_at
BEFORE UPDATE ON public.regents_shape_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();