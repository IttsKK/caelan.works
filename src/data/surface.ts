import sharp from "sharp";

/**
 * A surface map for the glint on a tilted photo. No AI involved: brightness
 * is treated as height (bright parts raised), and a Sobel filter measures
 * which way each patch of that surface faces. The result is a normal map:
 * RGB holds the direction each pixel faces, and alpha holds the brightness,
 * which the shader uses to let highlights glint more than shadows.
 *
 * It's a heuristic rather than true depth, but it follows the texture of the
 * photo, so ripples, clouds and grass catch the light differently.
 */
export async function surfaceMap(path: string, width = 320, relief = 2): Promise<Buffer> {
  const { data, info } = await sharp(path)
    .resize({ width })
    .greyscale()
    .blur(1.8)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const step = info.channels;
  const at = (x: number, y: number) => {
    const cx = Math.min(w - 1, Math.max(0, x));
    const cy = Math.min(h - 1, Math.max(0, y));
    return data[(cy * w + cx) * step] / 255;
  };

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      let nx = -gx * relief;
      let ny = -gy * relief;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[i + 3] = Math.round(at(x, y) * 255);
    }
  }

  // Lossy is fine for soft light, and a fraction of the size.
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 82, alphaQuality: 70 }).toBuffer();
}
