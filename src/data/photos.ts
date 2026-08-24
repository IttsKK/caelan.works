import type { PhotoSet } from "../types/site";

/**
 * Photography, grouped into sets.
 *
 * To add photos:
 *   1. Drop the files in `public/photos/` (JPEG or WebP, long edge ~2000px).
 *   2. Add a set below, or add frames to an existing one.
 *   3. Fill in `width`/`height` with the real pixel size so the grid doesn't
 *      jump while images load. `wide: true` gives a frame two columns.
 *
 * While this list is empty the photography page shows a short placeholder
 * instead of an empty grid.
 */
export const photoSets: PhotoSet[] = [];
