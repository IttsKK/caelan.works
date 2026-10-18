import { coolToWarm, type Colour } from "./colour";

export interface Placement {
  /** Which group the photo is in. */
  group: number;
  /** Place within its group: 0 is the front of the stack and first in the gallery. */
  order: number;
  /** The group's spot on the board, 0–1 on each axis: cool → warm, light → dark. */
  gx: number;
  gy: number;
}

/**
 * Cluster photos into groups of similar colour (k-means on warmth and
 * lightness), aiming for about `size` photos per group. Deterministic, so the
 * board is the same on every build.
 */
export function groupByColour(colours: Colour[], size = 4): Placement[] {
  const n = colours.length;
  if (n === 0) return [];

  const norm = (values: number[]) => {
    const min = Math.min(...values);
    const range = Math.max(...values) - min || 1;
    return values.map((v) => (v - min) / range);
  };
  const xs = norm(colours.map((c) => coolToWarm(c.hue)));
  const ys = norm(colours.map((c) => -c.light));
  const points = xs.map((x, i) => ({ x, y: ys[i] }));

  // Start from photos spread evenly along the cool-to-warm axis.
  const k = Math.max(1, Math.min(n, Math.round(n / size)));
  const byX = points.map((p, i) => ({ p, i })).sort((a, b) => a.p.x - b.p.x);
  let centres = Array.from({ length: k }, (_, j) => ({ ...byX[Math.floor(((j + 0.5) * n) / k)].p }));
  let assign = new Array<number>(n).fill(0);

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

  for (let round = 0; round < 30; round++) {
    assign = points.map((p) => {
      let best = 0;
      centres.forEach((c, j) => {
        if (dist(p, c) < dist(p, centres[best])) best = j;
      });
      return best;
    });
    centres = centres.map((c, j) => {
      const members = points.filter((_, i) => assign[i] === j);
      if (!members.length) return c;
      return {
        x: members.reduce((s, m) => s + m.x, 0) / members.length,
        y: members.reduce((s, m) => s + m.y, 0) / members.length,
      };
    });
  }

  // Drop empty groups and renumber the rest left to right.
  const used = [...new Set(assign)].sort((a, b) => centres[a].x - centres[b].x);
  const renumber = new Map(used.map((g, i) => [g, i]));

  // Within a group, the most typical photo goes in front.
  const orderOf = new Array<number>(n).fill(0);
  for (const g of used) {
    points
      .map((p, i) => ({ i, d: dist(p, centres[g]) }))
      .filter(({ i }) => assign[i] === g)
      .sort((a, b) => a.d - b.d)
      .forEach(({ i }, order) => (orderOf[i] = order));
  }

  // Place each group by its colour blended with its rank on each axis, so a
  // board of mostly warm photos still spreads out instead of piling up at
  // one end, and the order of colours is kept.
  const spread = (values: number[]) =>
    values.map((v) => {
      const rank = values.length > 1 ? values.filter((o) => o < v).length / (values.length - 1) : 0.5;
      return 0.4 * v + 0.6 * rank;
    });
  const gxs = spread(used.map((g) => centres[g].x));
  const gys = spread(used.map((g) => centres[g].y));

  return points.map((_, i) => {
    const g = renumber.get(assign[i])!;
    return { group: g, order: orderOf[i], gx: gxs[g], gy: gys[g] };
  });
}
