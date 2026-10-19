import sharp from "sharp";
import { Vibrant } from "node-vibrant/node";

export interface Colour {
  /** Average hue in degrees, weighted toward saturated pixels. */
  hue: number;
  /** Average lightness, 0–1. */
  light: number;
  /** The one colour it reads as, for the rainbow; see `readAccent`. */
  accent: Accent;
}

export interface Accent {
  /** Degrees. */
  hue: number;
  /** 0–1. */
  sat: number;
  /** 0–1. */
  light: number;
  /** Too grey, dark or pale to sit anywhere in a rainbow. */
  neutral: boolean;
}

/**
 * Read a photo's overall colour from a tiny downscaled copy. Greys barely
 * count toward the hue, so a sunset reads as orange rather than as the dark
 * water under it.
 */
export async function readColour(path: string): Promise<Colour> {
  const [average, accent] = await Promise.all([readAverage(path), readAccent(path)]);
  return { ...average, accent };
}

async function readAverage(path: string) {
  const { data } = await sharp(path)
    .resize(48, 48, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let x = 0;
  let y = 0;
  let light = 0;
  const pixels = data.length / 3;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    light += l;
    if (d < 0.08) continue;

    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    const s = d / (1 - Math.abs(2 * l - 1) || 1);
    const weight = s * d;
    x += Math.cos((h * Math.PI) / 180) * weight;
    y += Math.sin((h * Math.PI) / 180) * weight;
  }

  return {
    hue: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
    light: light / pixels,
  };
}

/**
 * The colour a photo reads as, even when it's several. node-vibrant (a port
 * of Android's Palette) boils the photo down to a few swatches with how much
 * of the photo each covers; of those, the one that's most saturated over
 * the most area, and neither near black nor near white, wins. A sunset over
 * blue water reads as orange; a grey sky with a sliver of orange reads as
 * grey, rather than as whatever an average of everything comes out as.
 */
async function readAccent(path: string): Promise<Accent> {
  const palette = await Vibrant.from(path).quality(3).getPalette();
  const swatches = Object.values(palette).filter((swatch) => swatch !== null);
  const total = swatches.reduce((sum, swatch) => sum + swatch.population, 0) || 1;
  const score = ({ hsl: [, s, l], population }: (typeof swatches)[number]) =>
    s * Math.sqrt(population / total) * (1 - Math.abs(l - 0.5));
  const best = swatches.sort((a, b) => score(b) - score(a))[0];
  if (!best) return { hue: 0, sat: 0, light: 0.5, neutral: true };
  const [h, s, l] = best.hsl;
  return { hue: h * 360, sat: s, light: l, neutral: s < 0.22 || l < 0.12 || l > 0.9 };
}

/** Sort key running from blue, through yellow and orange, to red. */
export const coolToWarm = (hue: number) => (240 - hue + 360) % 360;
