-- Allow public read access to attempts for student results page
-- Students can view their own results via QR code without authentication

CREATE POLICY "Allow public read access to attempts for student results"
ON public.attempts
FOR SELECT
USING (true);

-- Allow public read access to scores for student results
CREATE POLICY "Allow public read access to scores for student results"
ON public.scores
FOR SELECT
USING (true);

-- Allow public read access to students for student results
CREATE POLICY "Allow public read access to students for results"
ON public.students
FOR SELECT
USING (true);

-- Allow public read access to questions for student results
CREATE POLICY "Allow public read access to questions for results"
ON public.questions
FOR SELECT
USING (true);

-- Allow public read access to rubrics for student results
CREATE POLICY "Allow public read access to rubrics for results"
ON public.rubrics
FOR SELECT
USING (true);

-- Allow public read access to attempt_images for student results
CREATE POLICY "Allow public read access to attempt_images for results"
ON public.attempt_images
FOR SELECT
USING (true);