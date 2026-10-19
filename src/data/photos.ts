import type { ImageMetadata } from "astro";
import saved from "./photos.json";

/**
 * Every photo on the board.
 *
 * Any image in a folder inside `src/assets/photos/` is picked up
 * automatically, and the folder is its set ("film/", "digital/", ...). Sets
 * get their own area on the board and their own filter. Its place on
 * the board lives in `photos.json`, which the editor writes
 * (`bun run dev`, then open `/?edit`). A photo with no entry there, or no
 * position, is placed next to photos of a similar colour.
 *
 * Positions are in photo widths from the middle of the board, so the layout
 * scales with the screen. `rot` is in degrees; `z` is stacking order. `file`
 * is the path inside `src/assets/photos/`, e.g. "film/0001.jpg".
 */
export interface Photo {
  file: string;
  x?: number;
  y?: number;
  rot?: number;
  z?: number;
}

const files = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/photos/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}",
  { eager: true },
);

const byName = new Map(
  Object.entries(files).map(([path, mod]) => [path.replace("../assets/photos/", ""), mod.default]),
);
const known = new Map((saved as Photo[]).map((photo) => [photo.file, photo]));

/** Saved photos first, in their saved order, then any new files. */
export const photos: Photo[] = [
  ...(saved as Photo[]).filter((photo) => byName.has(photo.file)),
  ...[...byName.keys()].filter((file) => !known.has(file)).sort().map((file) => ({ file })),
];

/** Resolve a filename to its imported image. */
export const photoSrc = (file: string): ImageMetadata => {
  const match = byName.get(file);
  if (!match) throw new Error(`Photo not found in src/assets/photos: ${file}`);
  return match;
};

/**
 * The photos shown on the home page, in order: a mix of digital and film.
 * Use the same paths as in `photos.json`.
 */
export const featured = [
  "digital/P8013617.jpg",
  "film/000091060003.jpg",
  "digital/P7142017.jpg",
  "film/000123360029.jpg",
  "digital/P8194275.jpg",
  "film/000123540033.jpg",
];

/**
 * Sets, in the order they appear on the board and in the filter. Folders
 * listed here come first; any others follow alphabetically.
 */
const SET_ORDER = ["digital", "film"];

/** A photo's set: the folder it's in, or "photos" for loose files. */
export const setOf = (file: string) => (file.includes("/") ? file.split("/")[0] : "photos");

export const sets = [...new Set(photos.map((photo) => setOf(photo.file)))].sort((a, b) => {
  const ia = SET_ORDER.indexOf(a);
  const ib = SET_ORDER.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
});

/** How a set's name is shown: the folder name, capitalised, dashes as spaces. */
export const setLabel = (set: string) => set.charAt(0).toUpperCase() + set.slice(1).replace(/[-_]+/g, " ");
