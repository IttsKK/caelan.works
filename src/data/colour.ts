import sharp from "sharp";

export interface Colour {
  /** Average hue in degrees, weighted toward saturated pixels. */
  hue: number;
  /** Average lightness, 0–1. */
  light: number;
}

/**
 * Read a photo's overall colour from a tiny downscaled copy. Greys barely
 * count toward the hue, so a sunset reads as orange rather than as the dark
 * water under it.
 */
export async function readColour(path: string): Promise<Colour> {
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

/** Sort key running from blue, through yellow and orange, to red. */
export const coolToWarm = (hue: number) => (240 - hue + 360) % 360;
