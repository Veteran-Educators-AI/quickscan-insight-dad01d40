
-- Make svg_data nullable for shapes imported without SVG (will use thumbnail_url or be generated later)
ALTER TABLE public.regents_shape_library ALTER COLUMN svg_data DROP NOT NULL;
