import sharp from "sharp";

/**
 * Whether a photo has a plain border edited into it: a band of one flat
 * colour running all the way round, ending in a clear edge where the photo
 * starts. That's the style the newer edits use, so the gallery can keep them
 * together.
 *
 * It looks at each side separately: how deep the flat band goes, and whether
 * it ends sharply. A dark or vignetted photo can have a flat edge too, but it
 * fades into the picture instead of stopping, and a frame that's part of the
 * picture (a window, a wall) is far deeper than an edited border.
 */
export async function hasBorder(path: string): Promise<boolean> {
  return (await measureBorder(path)).bordered;
}

export async function measureBorder(path: string) {
  const size = 400;
  const { data } = await sharp(path)
    .resize(size, size, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = (x: number, y: number) => {
    const i = (y * size + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };

  /** Mean colour and spread of one line of pixels, `depth` in from a side. */
  const line = (side: "top" | "bottom" | "left" | "right", depth: number) => {
    const values: number[][] = [];
    // Skip the corners, where two sides meet.
    for (let k = Math.floor(size * 0.1); k < size * 0.9; k++) {
      if (side === "top") values.push(px(k, depth));
      else if (side === "bottom") values.push(px(k, size - 1 - depth));
      else if (side === "left") values.push(px(depth, k));
      else values.push(px(size - 1 - depth, k));
    }
    const mean = [0, 1, 2].map((c) => values.reduce((s, v) => s + v[c], 0) / values.length);
    const spread = Math.sqrt(
      values.reduce((s, v) => s + (v[0] - mean[0]) ** 2 + (v[1] - mean[1]) ** 2 + (v[2] - mean[2]) ** 2, 0) /
        (values.length * 3),
    );
    return { mean, spread };
  };

  const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const sides = (["top", "bottom", "left", "right"] as const).map((side) => {
    const edge = line(side, 1);
    let depth = 1;
    // Walk inward while each line stays flat and the same colour as the edge.
    while (depth < size * 0.12) {
      const next = line(side, depth + 1);
      if (next.spread > 14 || distance(next.mean, edge.mean) > 18) break;
      depth++;
    }
    // Just past the band, the photo should look clearly different.
    const inside = line(side, Math.min(depth + 3, size - 1));
    const step = distance(inside.mean, edge.mean) + Math.max(0, inside.spread - edge.spread);
    return { side, depth, flat: edge.spread, colour: edge.mean, step };
  });

  // A side shows the frame when its flat band is thin (an edited border, not
  // a wall or a window frame in the picture) and stops sharply.
  const framed = sides.filter((s) => s.depth >= 3 && s.depth <= size * 0.05 && s.step > 16);
  // At most one side may run straight on into the photo, when the picture is
  // the same colour as the border there (a dark sky under a dark frame).
  const flatAllRound = sides.every((s) => s.depth >= 3);
  // One frame: all four sides roughly the same colour.
  const sameColour = sides.every((s) => distance(s.colour, sides[0].colour) < 40);
  return { bordered: framed.length >= 3 && flatAllRound && sameColour, sides };
}
