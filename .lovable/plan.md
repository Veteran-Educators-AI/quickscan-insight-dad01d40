
# Replace AI-Based Student Identification with Google Vision OCR

## Problem
Student identification currently sends each scanned image to OpenAI (gpt-4o-mini) to read names and detect QR codes. This causes:
- OpenAI rate limit issues at high volume
- Slower identification (~3-5 seconds per image for the AI call)
- Unnecessary cost for a task that doesn't need reasoning

QR code scanning via camera (`jsQR`) works as a fast path, but when QR codes aren't detected from photos/scans (image quality, angle, printing issues), the system falls back to the expensive AI call.

## Solution
Replace the AI vision call in student identification with Google Cloud Vision OCR (the `ocr-student-work` function already exists and works). Vision API is fast (~1-2 seconds), has no rate limit issues at this volume, and is excellent at reading handwritten text.

## Changes

### 1. Update `identifyStudent` in `analyze-student-work` Edge Function
- Instead of calling OpenAI to read the image, call the `ocr-student-work` function (or use the Vision API directly since we already have the key) to extract all text from the image
- Then use the existing `fuzzyMatchStudent` function to match extracted text against the student roster
- Keep the QR code JSON detection by scanning the OCR text for JSON patterns (e.g., `{"v":1,"s":"..."}`)
- This eliminates ALL OpenAI calls during the identification phase

### 2. Improve Client-Side QR Fallback
- Add image preprocessing (contrast enhancement, grayscale) before `jsQR` scanning to improve detection rates from photos
- Try scanning at multiple resolutions/crops for better QR detection
- Add `inversionAttempts: 'attemptBoth'` to the batch scanner's `jsQR` call in `ContinuousQRScanner` (it's already in `useBatchAnalysis` but missing from the continuous scanner)

### 3. Name Extraction Logic from OCR Text
- Parse the OCR text to find student names using pattern matching (look for name-like text at the top of the page)
- Strip boilerplate (directions, question numbers, headers) using the existing `BOILERPLATE_PATTERNS`
- Run `fuzzyMatchStudent` against the cleaned text to find the best roster match
- Assign confidence levels: "high" for exact matches, "medium" for fuzzy matches

## Technical Details

### Edge Function: `supabase/functions/analyze-student-work/index.ts`

**Replace `identifyStudent` function (lines 193-256):**

Current flow:
```text
Image --> OpenAI gpt-4o-mini (read name + QR) --> Parse JSON --> fuzzyMatch
```

New flow:
```text
Image --> Google Vision OCR (extract all text) --> Parse for QR JSON --> fuzzyMatch names
```

The new function will:
1. Call Vision API directly (key is already available as `GOOGLE_VISION_API_KEY`)
2. Search OCR text for QR code JSON patterns (`{"v":1,"s":"..."}` or `{"v":2,...}`)
3. Extract candidate names from the first few lines of OCR text
4. Run `fuzzyMatchStudent` against extracted names
5. Return the same `IdentificationResult` shape (no frontend changes needed)

### Client-Side: `src/components/scan/ContinuousQRScanner.tsx`

- Add `inversionAttempts: 'attemptBoth'` to the `jsQR` call (line 189) matching the batch scanner's config
- This improves QR detection on dark backgrounds or inverted images

### No Database Changes Required
The identification result shape stays the same, so no migrations or frontend changes are needed beyond the QR scanner fix.

## Benefits
- Eliminates OpenAI rate limit issues during identification
- Faster identification (1-2s Vision API vs 3-5s OpenAI)
- Lower cost (Vision API is cheaper than GPT-4o-mini for this task)
- More reliable handwriting recognition (Vision API specializes in OCR)
- QR code detection improvement on the client side
