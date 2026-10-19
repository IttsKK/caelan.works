/*
 * The photo board.
 *
 * Photos are scattered on a large canvas. In the default "loose" arrangement
 * each one is placed on its own near others of a similar colour (groups come
 * from `src/data/groups.ts`): cool to warm across, light to dark down, with
 * seeded randomness in offset and tilt so it looks laid out by hand. "Colour"
 * and "Light" lay the board out as a spectrum instead: each photo sits at its
 * measured value along an axis, so with enough photos it forms a gradient.
 *
 * You move around by dragging, and zoom by scrolling, pinching, the buttons
 * or the keyboard.
 *
 * Clicking a photo opens the gallery at that photo, and the gallery steps
 * through every photo in the board's current order. The photo at the front
 * can be grabbed and tilted in 3D, and springs back when let go. Each photo has springs
 * for position, scale, tilt and opacity; arrangements and the gallery are
 * just different targets for them, so everything moves with the same motion.
 *
 * Each photo element is laid out at its gallery size and scaled down for the
 * board. Scaling down stays sharp; scaling a small element up does not.
 */

import { createBackdrop, DEFAULT_STYLE, STYLES, type BackdropStyle } from "./backdrop";
import { createGlint } from "./glint";

type Mode = "board" | "gallery";
type Arrangement = "loose" | "colour" | "light";

class Spring {
  value: number;
  target: number;
  velocity = 0;

  constructor(value: number) {
    this.value = value;
    this.target = value;
  }

  step(dt: number, stiffness: number, damping: number) {
    const force = -stiffness * (this.value - this.target) - damping * this.velocity;
    this.velocity += force * dt;
    this.value += this.velocity * dt;
  }

  snap() {
    this.value = this.target;
    this.velocity = 0;
  }

  get settled() {
    return Math.abs(this.value - this.target) < 0.001 && Math.abs(this.velocity) < 0.01;
  }
}

export interface Print {
  el: HTMLButtonElement;
  file: string;
  /** One of the newer edits, with a plain border (see `src/data/border.ts`). */
  bordered: boolean;
  /** Place in its group's colour chain: neighbours look alike. */
  chain: number;
  /** The folder it's in: its set. */
  set: string;
  /** Where photos.json puts it, in photo widths; missing for unplaced photos. */
  saved: { x?: number; y?: number; rot?: number; z?: number };
  img: HTMLImageElement;
  ratio: number;
  warmth: number;
  light: number;
  group: number;
  order: number;
  gx: number;
  gy: number;
  /** Full-size image, swapped in once it has loaded. */
  full: string;
  /** Surface map for the glint (see `src/data/surface.ts`). */
  surface: string;
  /** A small image for the filmstrip. */
  thumb: string;
  fullState: "none" | "loading" | "done";
  /** Layout size (the gallery size), in px. */
  w: number;
  h: number;
  /** Scale that makes it board-sized. */
  boardScale: number;
  /** Resting place for the current arrangement, in world px. */
  home: { x: number; y: number; rot: number };
  x: Spring;
  y: Spring;
  scale: Spring;
  rot: Spring;
  tilt: Spring;
  opacity: Spring;
  /** Seconds to wait before moving, for the entrance and re-arranging. */
  delay: number;
  z: number;
  /** What was last written to the element's style, to skip unchanged writes. */
  drawn: { transform: string; opacity: string; zIndex: string; events: string; sheen: string };
}

// Photos: quick and only just underdamped, so they land with a hint of settle.
const PRINT_K = 260;
const PRINT_C = 29;
// Camera and zoom: quick to respond, with a touch of glide at the end.
const CAM_K = 150;
const CAM_C = 22;
// Grab and tilt: firm while held, loose on release so it wobbles back.
const GRAB_K = 170;
const GRAB_C = 15;
/** How far the front photo tips, in degrees, at the edge of the photo. */
const GRAB_TILT = 9;
const STEP = 1 / 120;

/** Small seeded random so the board is the same on every visit. */
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pad2 = (n: number) => String(n).padStart(2, "0");

const num = (value: string | undefined) => (value === undefined || value === "" ? undefined : Number(value));

export function startBoard({ editing = false }: { editing?: boolean } = {}) {
  const board = document.querySelector<HTMLElement>("[data-board]")!;
  const cursor = document.querySelector<HTMLElement>("[data-cursor]")!;
  const cursorLabel = document.querySelector<HTMLElement>("[data-cursor-label]")!;
  const caption = document.querySelector<HTMLElement>("[data-caption]")!;
  const galleryBar = document.querySelector<HTMLElement>("[data-gallery-nav]")!;
  const boardBar = document.querySelector<HTMLElement>("[data-board-controls]")!;
  const zoomLevel = document.querySelector<HTMLElement>("[data-zoom-level]")!;
  const arrangeButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-arrange]")];

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.documentElement.classList.toggle("has-cursor", finePointer);

  const prints: Print[] = [...document.querySelectorAll<HTMLButtonElement>("[data-print]")].map((el) => ({
    el,
    file: el.dataset.file ?? "",
    bordered: el.dataset.bordered !== undefined,
    chain: 0,
    set: el.dataset.set ?? "photos",
    saved: { x: num(el.dataset.x), y: num(el.dataset.y), rot: num(el.dataset.rot), z: num(el.dataset.z) },
    img: el.querySelector("img")!,
    ratio: Number(el.dataset.ratio) || 0.75,
    warmth: Number(el.dataset.warmth) || 0,
    light: Number(el.dataset.light) || 0.5,
    group: Number(el.dataset.group) || 0,
    order: Number(el.dataset.order) || 0,
    gx: Number(el.dataset.gx) || 0.5,
    gy: Number(el.dataset.gy) || 0.5,
    full: el.dataset.full ?? "",
    surface: el.dataset.surface ?? "",
    thumb: el.querySelector("img")!.srcset.split(",")[0]?.trim().split(" ")[0] || el.querySelector("img")!.src,
    fullState: "none",
    w: 0,
    h: 0,
    boardScale: 1,
    home: { x: 0, y: 0, rot: 0 },
    x: new Spring(0),
    y: new Spring(0),
    scale: new Spring(0),
    rot: new Spring(0),
    tilt: new Spring(0),
    opacity: new Spring(0),
    delay: 0,
    z: 0,
    drawn: { transform: "", opacity: "", zIndex: "", events: "", sheen: "" },
  }));
  /** Sets in board order, from the filter buttons (or the photos, if there are none). */
  const filterButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-set-filter]")];
  const setNames = filterButtons.length
    ? filterButtons.map((b) => b.dataset.setFilter ?? "").filter(Boolean)
    : [...new Set(prints.map((p) => p.set))];
  const setLabels = new Map(
    [...document.querySelectorAll<HTMLElement>("[data-set-label]")].map((el) => [el.dataset.setLabel ?? "", el]),
  );
  const labelDrawn = new Map<string, string>();
  /** The set being shown, or "" for all of them. */
  let activeSet = "";
  const shown = (print: Print) => !activeSet || print.set === activeSet;
  const visible = () => prints.filter(shown);

  let mode: Mode = "board";
  let arrangement: Arrangement = "loose";
  /** Every photo in the board's current order; the gallery steps through this. */
  let sequence: Print[] = [...prints];
  let active = 0;
  let hovered: Print | null = null;
  /** The spectrum's axis in world px, or null in the loose arrangement. */
  let axis: { from: number; to: number; y: number } | null = null;
  const axisEl = document.querySelector<HTMLElement>("[data-axis]")!;
  const axisLabels = [...axisEl.querySelectorAll("span")];
  let axisDrawn = "";

  let vw = window.innerWidth;
  let vh = window.innerHeight;
  /** Width of a photo on the board, in world px. */
  let base = 200;
  const bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  const cam = { x: new Spring(0), y: new Spring(0) };
  const zoom = new Spring(1);
  /** The front photo's grab: tilt around x and y, and a slight lift. */
  const grab = {
    rx: new Spring(0),
    ry: new Spring(0),
    lift: new Spring(1),
    held: null as { id: number } | null,
  };
  const grabSprings = [grab.rx, grab.ry, grab.lift];
  /** Texture-aware light on the front photo; null without WebGL (the CSS sheen is used instead). */
  const glint = reduced ? null : createGlint();
  /** The background (see `backdrop.ts`); null without WebGL, when the CSS grain stands in. */
  const params = new URLSearchParams(location.search);
  const asked = params.get("bg") ?? "";
  const backdrop = createBackdrop(
    board,
    (STYLES as readonly string[]).includes(asked) ? (asked as BackdropStyle) : DEFAULT_STYLE,
    getComputedStyle(board).backgroundColor,
  );
  // `?bg` in the address shows a picker for trying the background styles.
  if (backdrop && params.has("bg")) {
    const picker = document.createElement("div");
    picker.className = "bg-picker";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "Background style");
    picker.innerHTML = STYLES.map(
      (name) => `<button type="button" data-bg="${name}" aria-pressed="${name === backdrop.style}">${name}</button>`,
    ).join("");
    picker.addEventListener("click", (event) => {
      const name = (event.target as HTMLElement).closest<HTMLElement>("[data-bg]")?.dataset.bg as BackdropStyle | undefined;
      if (!name) return;
      backdrop.setStyle(name);
      picker.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bg === name)));
      const url = new URL(location.href);
      url.searchParams.set("bg", name);
      history.replaceState(null, "", url);
      kick();
    });
    document.body.append(picker);
  }
  const strip = document.querySelector<HTMLElement>("[data-strip]")!;
  const stripTrack = document.querySelector<HTMLElement>("[data-strip-track]")!;
  let zoomMin = 0.4;
  /** The zoom that fits everything shown on screen. */
  let fitZoom = 1;
  let zoomMax = 2;
  /** The board's zoom, kept while the gallery is open (which works at 1). */
  let boardZoom = 1;
  const pointer = { x: vw / 2, y: vh / 2, seen: false };
  const cursorPos = { x: vw / 2, y: vh / 2 };

  // ── Sizes ──

  /**
   * A photo's size on the board, in world px. Every photo covers about the
   * same area, so landscape and portrait carry the same weight: `base` is the
   * width of a 3:4 portrait.
   */
  const boardW = (print: Print) => base * Math.sqrt(print.ratio / 0.75);
  const boardH = (print: Print) => boardW(print) / print.ratio;

  const size = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    base = clamp(Math.min(vw, vh) * 0.2, 110, 210);
    const small = vw < 700;
    for (const print of prints) {
      // The size the photo has at the front of the gallery.
      const h = Math.min(vh * (small ? 0.62 : 0.76), (vw * (small ? 0.8 : 0.7)) / print.ratio);
      print.h = h;
      print.w = h * print.ratio;
      print.boardScale = boardW(print) / print.w;
      print.el.style.width = `${print.w}px`;
      print.el.style.height = `${print.h}px`;
      if (print.fullState === "none") print.img.sizes = `${Math.ceil(base)}px`;
    }
  };

  // ── Arrangements ──

  /**
   * An automatic layout: each set in its own area, left to right, and inside
   * each area every photo on its own, loosely gathered with others of its colour.
   */
  const autoLayout = () => {
    const random = seeded(17);
    const count = prints.length;
    const pos = prints.map(() => ({ x: 0, y: 0 }));
    let left = 0;
    for (const set of setNames) {
      const members = prints.map((print, i) => ({ print, i })).filter(({ print }) => print.set === set);
      const n = members.length;
      if (!n) continue;
      const mapW = Math.sqrt(n) * base * 2.3;
      const mapH = Math.sqrt(n) * base * 1.6;
      for (const { print, i } of members) {
        const angle = random() * Math.PI * 2;
        const reach = base * (0.25 + 0.75 * Math.sqrt(random())) * (0.8 + Math.sqrt(print.order) * 0.35);
        pos[i] = {
          x: left + print.gx * mapW + Math.cos(angle) * reach * 1.2,
          y: (print.gy - 0.5) * mapH + Math.sin(angle) * reach * 0.9,
        };
      }
      left += mapW + base * 4;
    }
    // Centre the whole board on the origin.
    const mid = (Math.min(...pos.map((p) => p.x)) + Math.max(...pos.map((p) => p.x))) / 2;
    for (const p of pos) p.x -= mid;
    const anchors = pos.map((p) => ({ ...p }));

    // Keep a clear gap around every photo; colour only steers roughly where
    // each one ends up.
    const tall = base * 1.35;
    for (let round = 0; round < 120; round++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          if (prints[i].set !== prints[j].set) continue;
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const ox = ((boardW(prints[i]) + boardW(prints[j])) / 2) * 1.3 - Math.abs(dx);
          const oy = ((boardH(prints[i]) + boardH(prints[j])) / 2) * 1.18 - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          if (ox / base < oy / tall) {
            const push = (ox / 2) * (dx < 0 ? -1 : 1);
            pos[i].x -= push;
            pos[j].x += push;
          } else {
            const push = (oy / 2) * (dy < 0 ? -1 : 1);
            pos[i].y -= push;
            pos[j].y += push;
          }
        }
      }
      for (let i = 0; i < count; i++) {
        pos[i].x += (anchors[i].x - pos[i].x) * 0.01;
        pos[i].y += (anchors[i].y - pos[i].y) * 0.01;
      }
    }

    return new Map(
      prints.map((print, i) => [print, { x: pos[i].x, y: pos[i].y, rot: (random() - 0.5) * 12, z: Math.floor(random() * 100) }]),
    );
  };


  /** Would `print` at (x, y) overlap any of `others` by more than a sliver? */
  const overlaps = (print: Print, x: number, y: number, others: Print[], gap = 1.05) =>
    others.some(
      (other) =>
        other !== print &&
        Math.abs(other.home.x - x) < ((boardW(print) + boardW(other)) / 2) * gap &&
        Math.abs(other.home.y - y) < ((boardH(print) + boardH(other)) / 2) * gap,
    );

  /** The nearest free spot to (x, y), searching outward in a spiral. */
  const freeSpot = (print: Print, x: number, y: number, others: Print[]) => {
    for (let k = 0; k < 3000; k++) {
      const angle = k * 2.39996;
      const r = base * 0.22 * Math.sqrt(k);
      const cx = x + Math.cos(angle) * r * 1.2;
      const cy = y + Math.sin(angle) * r;
      if (!overlaps(print, cx, cy, others)) return { x: cx, y: cy };
    }
    return { x, y };
  };

  /** How different two photos' colours are: hue matters most, then lightness. */
  const colourDistance = (a: Print, b: Print) => {
    const dh = Math.abs(a.warmth - b.warmth);
    const hue = Math.min(dh, 360 - dh) / 180;
    return hue * hue * 2 + (a.light - b.light) ** 2 * 3;
  };

  /**
   * A suggested spot for `print`: beside the photos among `others` whose
   * colours are closest to it, in the nearest free space.
   */
  const suggestSpot = (print: Print, others: Print[]) => {
    if (!others.length) return { x: 0, y: 0 };
    // Photos of its own set come first; a set's first photo starts a new
    // area to the right of everything.
    const sameSet = others.filter((o) => o !== print && o.set === print.set);
    if (!sameSet.length) {
      const right = Math.max(...others.map((o) => o.home.x));
      return freeSpot(print, right + base * 4, 0, others);
    }
    const nearest = sameSet
      .map((o) => ({ o, d: colourDistance(print, o) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    let wx = 0;
    let wy = 0;
    let total = 0;
    for (const { o, d } of nearest) {
      const weight = 1 / (0.02 + d);
      wx += o.home.x * weight;
      wy += o.home.y * weight;
      total += weight;
    }
    return freeSpot(print, wx / total, wy / total, others);
  };

  /** Saved photos go exactly where they were put; the rest are suggested a spot. */
  const arrangeLoose = () => {
    const placed = prints.filter((p) => p.saved.x !== undefined && p.saved.y !== undefined);
    if (!placed.length) {
      for (const [print, spot] of autoLayout()) {
        print.home = { x: spot.x, y: spot.y, rot: spot.rot };
        print.z = spot.z;
      }
    } else {
      for (const print of placed) {
        print.home = { x: print.saved.x! * base, y: print.saved.y! * base, rot: print.saved.rot ?? 0 };
        print.z = print.saved.z ?? 0;
      }
      const random = seeded(23);
      const done = [...placed];
      for (const print of prints) {
        if (done.includes(print)) continue;
        const spot = suggestSpot(print, done);
        print.home = { x: spot.x, y: spot.y, rot: (random() - 0.5) * 10 };
        print.z = Math.max(0, ...done.map((p) => p.z)) + 1;
        done.push(print);
      }
    }
    orderSequence();
  };

  /**
   * In the loose arrangement the gallery goes set by set. Within a set, the
   * newer bordered edits come first and the older work after, and within each
   * of those, every photo sits next to the ones it looks most like.
   */
  const orderSequence = () => {
    sequence = visible().sort(
      (a, b) =>
        setNames.indexOf(a.set) - setNames.indexOf(b.set) ||
        Number(b.bordered) - Number(a.bordered) ||
        a.chain - b.chain,
    );
  };

  /**
   * Chain each group of photos by colour: start from the coolest, then keep
   * stepping to the closest one not yet used. Neighbours in the chain look
   * alike, so the gallery flows instead of jumping between colours.
   */
  const chainByColour = () => {
    const groups = new Map<string, Print[]>();
    for (const print of prints) {
      const key = `${print.set}|${print.bordered}`;
      groups.set(key, [...(groups.get(key) ?? []), print]);
    }
    for (const group of groups.values()) {
      const left = [...group].sort((a, b) => a.warmth - b.warmth);
      let at = left.shift()!;
      at.chain = 0;
      for (let i = 1; left.length; i++) {
        left.sort((a, b) => colourDistance(at, a) - colourDistance(at, b));
        at = left.shift()!;
        at.chain = i;
      }
    }
  };

  /**
   * A spectrum: each photo at its measured value along x, from the lowest
   * value on the board to the highest. Photos with close values stack above
   * and below the axis line instead of covering each other.
   */
  const arrangeSpectrum = (key: (p: Print) => number, labels: [string, string]) => {
    const random = seeded(29);
    sequence = visible().sort((a, b) => key(a) - key(b));
    const values = sequence.map(key);
    const low = values[0];
    const range = values[values.length - 1] - low || 1;
    const width = Math.max(vw * 1.1, Math.sqrt(sequence.length) * base * 3);
    const tall = Math.max(...sequence.map((p) => p.h * p.boardScale));
    const placed: { x: number; y: number; w: number; h: number }[] = [];

    // Free spots near a photo's value, nearest first. Moving up or down is
    // cheaper than moving sideways, so position along the axis stays honest,
    // but a crowd of similar values spreads into a cloud rather than a tower.
    const offsets: { dx: number; dy: number; cost: number }[] = [];
    for (let i = -12; i <= 12; i++) {
      for (let j = -12; j <= 12; j++) {
        const dx = i * base * 0.36;
        const dy = j * tall * 0.36;
        offsets.push({ dx, dy, cost: (dx / base) ** 2 * 1.8 + (dy / tall) ** 2 });
      }
    }
    offsets.sort((a, b) => a.cost - b.cost);

    sequence.forEach((print, i) => {
      const vx = ((values[i] - low) / range - 0.5) * width;
      const spot =
        offsets.find(({ dx, dy }) =>
          placed.every(
            (p) =>
              Math.abs(p.x - (vx + dx)) > ((p.w + boardW(print)) / 2) * 1.06 ||
              Math.abs(p.y - dy) > ((p.h + boardH(print)) / 2) * 1.06,
          ),
        ) ?? { dx: 0, dy: 0 };
      const x = vx + spot.dx;
      const y = spot.dy;
      placed.push({ x, y, w: boardW(print), h: boardH(print) });
      print.home.x = x;
      print.home.y = y;
      print.home.rot = (random() - 0.5) * 4;
      print.z = i;
    });

    const bottom = Math.max(...placed.map((p) => p.y)) + tall / 2;
    axis = { from: -width / 2 - base / 2, to: width / 2 + base / 2, y: bottom + base * 0.45 };
    axisLabels[0].textContent = labels[0];
    axisLabels[1].textContent = labels[1];
  };

  const arrange = (stagger: boolean) => {
    axis = null;
    if (arrangement === "loose") arrangeLoose();
    else if (arrangement === "colour") arrangeSpectrum((p) => p.warmth, ["Cool", "Warm"]);
    else arrangeSpectrum((p) => p.light, ["Dark", "Light"]);
    measure();

    if (stagger && !reduced) {
      const width = bounds.maxX - bounds.minX || 1;
      for (const print of prints) print.delay = elapsed + ((print.home.x - bounds.minX) / width) * 0.3;
    }
  };

  /** Fit the board's bounds and zoom limits around where the photos are. */
  const measure = () => {
    const shownNow = visible().length ? visible() : prints;
    const tall = Math.max(...shownNow.map((p) => p.h * p.boardScale));
    const margin = base * 0.7;
    bounds.minX = Math.min(...shownNow.map((p) => p.home.x - boardW(p) / 2)) - margin;
    bounds.maxX = Math.max(...shownNow.map((p) => p.home.x + boardW(p) / 2)) + margin;
    bounds.minY = Math.min(...shownNow.map((p) => p.home.y)) - tall / 2 - margin;
    bounds.maxY = Math.max(...shownNow.map((p) => p.home.y)) + tall / 2 + margin;
    // `axis` is set by the arrangement above, which TypeScript can't see.
    const line = axis as { y: number } | null;
    if (line) bounds.maxY = Math.max(bounds.maxY, line.y + margin);

    // Zoom out far enough to see the whole board, in up to about 1:1 photos.
    fitZoom = Math.min(1, (vw * 0.92) / (bounds.maxX - bounds.minX), (vh * 0.86) / (bounds.maxY - bounds.minY));
    zoomMin = fitZoom;
    zoomMax = Math.max(1.2, Math.min(...shownNow.map((p) => 1 / p.boardScale)));
    boardZoom = clamp(boardZoom, zoomMin, zoomMax);
    // The editor gets room to drag photos past the current edges.
    if (editing) {
      bounds.minX -= base * 3;
      bounds.maxX += base * 3;
      bounds.minY -= base * 3;
      bounds.maxY += base * 3;
      zoomMin = Math.min(zoomMin, 0.15);
    }
  };

  // ── Camera ──

  /** Where the camera can sit on one axis: centred if the board fits, else between its edges. */
  const camRange = (min: number, max: number, view: number) =>
    max - min <= view ? [(min + max) / 2, (min + max) / 2] : [min + view / 2, max - view / 2];

  const clampCam = () => {
    const [x0, x1] = camRange(bounds.minX, bounds.maxX, vw / zoom.target);
    const [y0, y1] = camRange(bounds.minY, bounds.maxY, vh / zoom.target);
    cam.x.target = clamp(cam.x.target, x0, x1);
    cam.y.target = clamp(cam.y.target, y0, y1);
  };

  // ── Zoom ──

  /** Zoom, keeping the board point under `anchor` (screen px) in place. */
  const setZoom = (value: number, anchor = { x: vw / 2, y: vh / 2 }) => {
    if (mode !== "board") return;
    const before = zoom.target;
    boardZoom = clamp(value, zoomMin, zoomMax);
    const wx = cam.x.target + (anchor.x - vw / 2) / before;
    const wy = cam.y.target + (anchor.y - vh / 2) / before;
    cam.x.target = wx - (anchor.x - vw / 2) / boardZoom;
    cam.y.target = wy - (anchor.y - vh / 2) / boardZoom;
    zoom.target = boardZoom;
    zoomLevel.textContent = `${Math.round(boardZoom * 100)}%`;
    clampCam();
    checkSharpness();
    kick();
  };

  const pan = (dx: number, dy: number) => {
    cam.x.target += dx / zoom.target;
    cam.y.target += dy / zoom.target;
    clampCam();
    kick();
  };

  // ── Targets ──

  const setTargets = () => {
    if (mode === "board") {
      for (const print of prints) {
        // A hovered photo lifts toward you and mostly straightens.
        const lifted = hovered === print;
        print.x.target = print.home.x;
        print.y.target = print.home.y - (lifted ? base * 0.03 : 0);
        print.rot.target = print.home.rot * (lifted ? 0.25 : 1);
        print.tilt.target = 0;
        // Photos outside the chosen set step back and fade out.
        print.scale.target = print.boardScale * (lifted ? 1.07 : shown(print) ? 1 : 0.9);
        print.opacity.target = shown(print) ? 1 : 0;
        print.el.classList.toggle("is-lifted", lifted);
      }
      return;
    }

    // Gallery, at zoom 1 so world px are screen px: the active photo at full
    // size in the middle, the next few close on either side and turned with
    // their outer edges toward you.
    const small = vw < 700;
    const sideScale = small ? 0.55 : 0.66;
    const gap = small ? 6 : 12;
    // The side photos are a stack: their centres sit at fixed, even distances
    // from the centre of the front photo, whatever their shape or the front
    // photo's. Each photo keeps its own size, so a landscape print is bigger
    // than a portrait one but takes no more room; it just overlaps more.
    const portraitW = Math.min(vh * (small ? 0.62 : 0.76), (vw * (small ? 0.8 : 0.7)) / 0.75) * 0.75;
    const firstCentre = portraitW / 2 + gap + portraitW * sideScale * 0.42;
    const step = portraitW * sideScale * 0.2;

    sequence.forEach((print, i) => {
      const d = i - active;
      const far = Math.abs(d);
      const side = Math.sign(d);
      const offset = d === 0 ? 0 : firstCentre + (far - 1) * step;

      print.x.target = cam.x.target + side * offset;
      print.y.target = cam.y.target - vh * 0.01;
      print.rot.target = 0;
      print.tilt.target = d === 0 ? 0 : side * -40;
      print.scale.target = d === 0 ? 1 : sideScale;
      print.opacity.target = far <= 5 ? 1 - Math.max(0, far - 1) * 0.16 : 0;
      print.z = 1000 - far;
    });
  };

  // ── Sharpness ──

  /** Swap in the full-size image once it's decoded, so nothing blanks or flickers. */
  const sharpen = (print: Print) => {
    if (print.fullState !== "none" || !print.full) return;
    print.fullState = "loading";
    const loader = new Image();
    loader.src = print.full;
    loader
      .decode()
      .then(() => {
        // Put the decoded image in place of the small one, rather than
        // changing the small one's source, so the swap is instant.
        loader.alt = print.img.alt;
        loader.draggable = false;
        print.img.replaceWith(loader);
        print.img = loader;
        print.fullState = "done";
      })
      .catch(() => {
        print.fullState = "none";
      });
  };

  /** Load the full image for any photo shown bigger than its board-sized file. */
  const checkSharpness = () => {
    const dpr = window.devicePixelRatio || 1;
    const loaded = (print: Print) => print.img.naturalWidth || base * dpr;
    sequence.forEach((print, i) => {
      if (mode === "gallery") {
        if (Math.abs(i - active) <= 2) sharpen(print);
        return;
      }
      const shown = print.w * print.scale.target * zoom.target * dpr;
      if (shown > loaded(print) * 1.15) sharpen(print);
    });
  };

  // ── Gallery ──

  const updateCaption = () => {
    if (mode !== "gallery") {
      caption.textContent = "";
      return;
    }
    caption.textContent = `${pad2(active + 1)} / ${pad2(sequence.length)}`;
  };

  /** Keep keyboard focus on the photo being shown. */
  const focusActive = () => {
    if (!(document.activeElement as HTMLElement | null)?.closest?.("[data-print]")) return;
    sequence[active].el.focus({ preventScroll: true });
  };

  const show = () => {
    setTargets();
    checkSharpness();
    updateCaption();
    focusActive();
    const front = sequence[active];
    if (glint) {
      glint.attach(front.el, front.surface, front.w, front.h);
      glint.draw(0, 0, 0);
      glintDrawn = "";
      for (const print of prints) if (print !== front) print.el.classList.remove("has-glint");
    }
    updateStrip();
    kick();
  };

  // ── Dial ──

  /*
   * A shallow arc of ticks, one per photo, with a marker that slides along it
   * to the current photo, like the selector in a game library. Tap a tick to
   * jump to it, or drag along the arc to scrub through. Drawn in SVG, in a
   * fixed 480-wide box that CSS scales.
   */
  const DIAL_W = 480;
  const DIAL_SAG = 30;
  const DIAL_R = (DIAL_W ** 2 / 4 + DIAL_SAG ** 2) / (2 * DIAL_SAG);
  const DIAL_HALF = Math.asin(DIAL_W / 2 / DIAL_R) * 0.92;
  const DIAL_CX = DIAL_W / 2;
  const DIAL_CY = DIAL_R + 22;
  const SVG = "http://www.w3.org/2000/svg";
  let dialMarker: SVGGElement | null = null;

  const dialAngle = (i: number) =>
    sequence.length > 1 ? -DIAL_HALF + (i / (sequence.length - 1)) * DIAL_HALF * 2 : 0;

  const buildDial = () => {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${DIAL_W} ${DIAL_SAG + 30}`);
    svg.classList.add("dial__svg");
    // The arc itself, faint, from end to end.
    const arc = document.createElementNS(SVG, "path");
    const end = (a: number) => `${DIAL_CX + DIAL_R * Math.sin(a)} ${DIAL_CY - DIAL_R * Math.cos(a)}`;
    arc.setAttribute("d", `M ${end(-DIAL_HALF - 0.02)} A ${DIAL_R} ${DIAL_R} 0 0 1 ${end(DIAL_HALF + 0.02)}`);
    arc.classList.add("dial__arc");
    svg.append(arc);
    const ticks = document.createElementNS(SVG, "g");
    sequence.forEach((_, i) => {
      const tick = document.createElementNS(SVG, "line");
      tick.setAttribute("x1", String(DIAL_CX));
      tick.setAttribute("x2", String(DIAL_CX));
      tick.setAttribute("y1", String(DIAL_CY - DIAL_R - 5));
      tick.setAttribute("y2", String(DIAL_CY - DIAL_R + 1));
      tick.setAttribute("transform", `rotate(${((dialAngle(i) * 180) / Math.PI).toFixed(3)} ${DIAL_CX} ${DIAL_CY})`);
      tick.classList.add("dial__tick");
      ticks.append(tick);
    });
    const marker = document.createElementNS(SVG, "g");
    marker.classList.add("dial__marker");
    marker.style.transformOrigin = `${DIAL_CX}px ${DIAL_CY}px`;
    const line = document.createElementNS(SVG, "line");
    line.setAttribute("x1", String(DIAL_CX));
    line.setAttribute("x2", String(DIAL_CX));
    line.setAttribute("y1", String(DIAL_CY - DIAL_R - 10));
    line.setAttribute("y2", String(DIAL_CY - DIAL_R + 4));
    const dot = document.createElementNS(SVG, "circle");
    dot.setAttribute("cx", String(DIAL_CX));
    dot.setAttribute("cy", String(DIAL_CY - DIAL_R - 15));
    dot.setAttribute("r", "2.2");
    marker.append(line, dot);
    svg.append(ticks, marker);
    dialMarker = marker;
    stripTrack.replaceChildren(svg);
  };

  const updateStrip = () => {
    [...stripTrack.querySelectorAll(".dial__tick")].forEach((tick, i) => tick.classList.toggle("is-active", i === active));
    if (dialMarker) dialMarker.style.transform = `rotate(${((dialAngle(active) * 180) / Math.PI).toFixed(3)}deg)`;
  };

  /** Which photo a point on the dial points at. */
  const dialIndex = (x: number, y: number) => {
    const rect = strip.getBoundingClientRect();
    const scale = DIAL_W / rect.width;
    const px = (x - rect.left) * scale;
    const py = (y - rect.top) * scale;
    const angle = Math.atan2(px - DIAL_CX, DIAL_CY - py);
    const t = (angle + DIAL_HALF) / (DIAL_HALF * 2);
    return Math.round(clamp(t, 0, 1) * (sequence.length - 1));
  };

  let scrubbing = false;
  strip.addEventListener("pointerdown", (event) => {
    scrubbing = true;
    strip.setPointerCapture(event.pointerId);
    event.preventDefault();
    goTo(dialIndex(event.clientX, event.clientY));
  });
  strip.addEventListener("pointermove", (event) => {
    if (scrubbing) goTo(dialIndex(event.clientX, event.clientY));
  });
  // Scrolling over the dial skips through quickly: no pause between steps,
  // and a small scroll moves a photo. Elsewhere, scrolling steps one at a time.
  let dialWheel = 0;
  strip.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const unit = event.deltaMode === 1 ? 16 : 1;
      dialWheel += (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
      const steps = Math.trunc(dialWheel / 18);
      if (steps) {
        dialWheel -= steps * 18;
        goTo(active + steps);
      }
    },
    { passive: false },
  );
  const endScrub = () => (scrubbing = false);
  strip.addEventListener("pointerup", endScrub);
  strip.addEventListener("pointercancel", endScrub);

  const openGallery = (print: Print) => {
    mode = "gallery";
    // Hold the camera where it is and come back to 1:1.
    cam.x.target = cam.x.value;
    cam.y.target = cam.y.value;
    zoom.target = 1;
    active = sequence.indexOf(print);
    hovered = null;
    board.dataset.mode = "gallery";
    galleryBar.hidden = false;
    boardBar.hidden = true;
    setCursorLabel("");
    buildDial();
    show();
  };

  const goTo = (index: number) => {
    if (mode !== "gallery") return;
    const next = clamp(index, 0, sequence.length - 1);
    if (next === active) return;
    releaseGrab(true);
    active = next;
    show();
  };

  const go = (step: number) => goTo(active + step);

  const closeGallery = () => {
    if (mode !== "gallery") return;
    releaseGrab(true);
    mode = "board";
    board.dataset.mode = "board";
    galleryBar.hidden = true;
    boardBar.hidden = false;
    zoom.target = boardZoom;
    setTargets();
    updateCaption();
    clampCam();
    setCursorLabel("");
    sequence[active].el.focus({ preventScroll: true });
    kick();
  };

  // ── Cursor ──

  const setCursorLabel = (text: string) => {
    cursorLabel.textContent = text;
    cursor.classList.toggle("has-label", text !== "");
  };

  const labelFor = (print: Print | null) => {
    if (mode === "board") return print ? (editing ? "Move" : "Open") : "";
    if (!print) return "Close";
    const d = sequence.indexOf(print) - active;
    return d < 0 ? "Prev" : d > 0 ? "Next" : "Grab";
  };

  // ── Gallery clicks ──

  /**
   * Which part of the gallery a point is in: the front photo (0), either
   * side of it within the strip (-1 or 1), or above and below it ("close").
   * Every click to a side moves exactly one photo, so the number of clicks
   * is the number of photos you go through.
   */
  const galleryZone = (x: number, y: number): -1 | 0 | 1 | "close" => {
    // Measured from where the front photo is settling, not where it is
    // mid-animation, so quick clicks still count from the right place.
    const front = sequence[active];
    const cx = front.x.target - cam.x.target + vw / 2;
    const cy = front.y.target - cam.y.target + vh / 2;
    const halfW = (front.w * front.scale.target) / 2;
    const halfH = (front.h * front.scale.target) / 2;
    if (Math.abs(x - cx) <= halfW) return Math.abs(y - cy) <= halfH ? 0 : "close";
    // Beside the front photo, only the band the side photos fill counts;
    // the empty space above and below them closes the gallery.
    const side = x < cx ? -1 : 1;
    const neighbour = sequence[active + side];
    if (!neighbour) return "close";
    const sideHalfH = (neighbour.h * neighbour.scale.target) / 2;
    return Math.abs(y - cy) <= sideHalfH + 10 ? side : "close";
  };

  const galleryClick = (x: number, y: number) => {
    const zone = galleryZone(x, y);
    if (zone === "close") closeGallery();
    else if (zone !== 0) go(zone);
  };

  // ── Grab and tilt ──

  /** Tilt the front photo toward where it's being held. */
  const aimGrab = (x: number, y: number) => {
    if (!grab.held) return;
    const current = sequence[active];
    const rect = current.el.getBoundingClientRect();
    // Where the pointer is on the photo, -1 to 1 from the centre.
    const px = clamp(((x - rect.left) / rect.width) * 2 - 1, -1.3, 1.3);
    const py = clamp(((y - rect.top) / rect.height) * 2 - 1, -1.3, 1.3);
    grab.ry.target = px * GRAB_TILT;
    grab.rx.target = -py * GRAB_TILT;
    kick();
  };

  const releaseGrab = (instant = false) => {
    grab.held = null;
    for (const spring of [grab.rx, grab.ry]) spring.target = 0;
    grab.lift.target = 1;
    if (instant) grabSprings.forEach((spring) => spring.snap());
    board.classList.remove("is-dragging");
    kick();
  };

  const setHovered = (print: Print | null) => {
    if (editing) print = null;
    if (hovered === print) return;
    hovered = print;
    if (mode === "board") setTargets();
    kick();
  };

  // ── Input ──

  /** When the last drag or pinch ended; the click that follows is ignored. */
  let draggedAt = 0;
  const wasDrag = () => performance.now() - draggedAt < 80;

  const touches = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number; zoom: number } | null = null;
  let drag: { x: number; y: number; camX: number; camY: number; moved: boolean; t: number; vx: number; vy: number } | null =
    null;

  const touchDistance = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  /** Whether the mouse is outside the window; the crosshair waits where it left. */
  let outside = true;

  /**
   * Move the crosshair with the mouse. Browsers sometimes report one stray
   * position as the mouse leaves the window, outside it or at 0,0, which would
   * send the crosshair flying the wrong way, so those are ignored. Coming
   * back, it appears where the mouse is instead of gliding over.
   */
  const trackCursor = (event: PointerEvent) => {
    const x = event.clientX;
    const y = event.clientY;
    if (x < 0 || y < 0 || x > vw || y > vh) return;
    if (x === 0 && y === 0 && Math.hypot(pointer.x, pointer.y) > 40) return;
    pointer.x = x;
    pointer.y = y;
    if (event.pointerType !== "mouse") return;
    if (outside || !pointer.seen) {
      pointer.seen = true;
      outside = false;
      cursorPos.x = x;
      cursorPos.y = y;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.classList.remove("is-gone");
      cursor.classList.add("is-visible");
    }
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      trackCursor(event);

      if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pinch && touches.size >= 2) {
        setZoom((pinch.zoom * touchDistance()) / pinch.dist);
      } else if (drag) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 6) {
          drag.moved = true;
          board.classList.add("is-dragging");
          setCursorLabel("");
        }
        if (mode === "board" && drag.moved) {
          // Track how fast the board is moving, in world px per ms, for the flick.
          const now = performance.now();
          const dt = Math.max(1, now - drag.t);
          const nx = drag.camX - dx / zoom.target;
          const ny = drag.camY - dy / zoom.target;
          drag.vx = drag.vx * 0.6 + ((nx - cam.x.target) / dt) * 0.4;
          drag.vy = drag.vy * 0.6 + ((ny - cam.y.target) / dt) * 0.4;
          drag.t = now;
          cam.x.target = nx;
          cam.y.target = ny;
          clampCam();
        }
      }
      kick();
    },
    { passive: true },
  );

  // As the mouse leaves the window, the crosshair goes at once rather than
  // fading out while it's still moving.
  const leaveWindow = () => {
    outside = true;
    cursor.classList.remove("is-visible");
    cursor.classList.add("is-gone");
  };
  document.addEventListener("mouseleave", leaveWindow);
  document.documentElement.addEventListener("pointerleave", leaveWindow);
  window.addEventListener("blur", leaveWindow);

  // Dragging pans the board and swipes the gallery; two fingers pinch to zoom.
  board.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.pointerType === "touch") touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size >= 2 && mode === "board") {
      pinch = { dist: touchDistance(), zoom: zoom.target };
      drag = null;
      return;
    }
    drag = {
      x: event.clientX,
      y: event.clientY,
      camX: cam.x.target,
      camY: cam.y.target,
      moved: false,
      t: performance.now(),
      vx: 0,
      vy: 0,
    };
  });

  const endPointer = (event: PointerEvent) => {
    touches.delete(event.pointerId);
    if (pinch) {
      if (touches.size < 2) {
        pinch = null;
        draggedAt = performance.now();
      }
      return;
    }
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (mode === "board" && drag.moved) {
      // Carry on a little in the direction of the flick.
      cam.x.target += drag.vx * 200;
      cam.y.target += drag.vy * 200;
      clampCam();
    } else if (mode === "gallery" && drag.moved && Math.abs(dx) > 40) {
      go(dx < 0 ? 1 : -1);
    }
    if (drag.moved) draggedAt = performance.now();
    board.classList.remove("is-dragging");
    drag = null;
    kick();
  };
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);

  for (const print of prints) {
    print.el.addEventListener("pointerdown", (event) => {
      if (mode !== "gallery" || event.button !== 0) return;
      if (galleryZone(event.clientX, event.clientY) !== 0) return;
      event.stopPropagation();
      grab.held = { id: event.pointerId };
      grab.lift.target = 1.012;
      print.el.setPointerCapture(event.pointerId);
      board.classList.add("is-dragging");
      aimGrab(event.clientX, event.clientY);
    });
    print.el.addEventListener("pointermove", (event) => {
      if (grab.held?.id === event.pointerId) aimGrab(event.clientX, event.clientY);
    });
    const letGo = (event: PointerEvent) => {
      if (grab.held?.id === event.pointerId) releaseGrab();
    };
    print.el.addEventListener("pointerup", letGo);
    print.el.addEventListener("pointercancel", letGo);
    print.el.addEventListener("pointerenter", () => {
      setCursorLabel(labelFor(print));
      setHovered(print);
    });
    print.el.addEventListener("pointerleave", () => {
      setCursorLabel(labelFor(null));
      if (hovered === print) setHovered(null);
    });
    print.el.addEventListener("click", (event) => {
      event.stopPropagation();
      if (wasDrag() || editing) return;
      if (mode === "board") return openGallery(print);
      galleryClick(event.clientX, event.clientY);
    });
    // Keyboard users: bring a focused photo into view.
    print.el.addEventListener("focus", () => {
      if (mode !== "board") return;
      cam.x.target = print.home.x;
      cam.y.target = print.home.y;
      clampCam();
      kick();
    });
  }

  board.addEventListener("click", (event) => {
    if (!wasDrag() && mode === "gallery") galleryClick(event.clientX, event.clientY);
  });
  // Over the bars at the top and bottom, the gallery's labels don't apply.
  board.addEventListener("pointerleave", () => {
    if (mode === "gallery" && !grab.held) setCursorLabel("");
  });
  // In the gallery, the cursor label follows the click zones rather than
  // whichever photo happens to be under it.
  board.addEventListener("pointermove", (event) => {
    if (mode !== "gallery" || grab.held) return;
    const zone = galleryZone(event.clientX, event.clientY);
    setCursorLabel(zone === 0 ? "Grab" : zone === -1 ? "Prev" : zone === 1 ? "Next" : "Close");
  });

  document.querySelector("[data-prev]")?.addEventListener("click", () => go(-1));
  document.querySelector("[data-next]")?.addEventListener("click", () => go(1));
  document.querySelector("[data-close]")?.addEventListener("click", () => closeGallery());
  document.querySelector("[data-zoom-in]")?.addEventListener("click", () => setZoom(boardZoom * 1.25));
  document.querySelector("[data-zoom-out]")?.addEventListener("click", () => setZoom(boardZoom / 1.25));

  /** Zoom and centre to show everything currently shown. */
  const fitView = () => {
    boardZoom = clamp(Math.min(0.85, fitZoom), zoomMin, zoomMax);
    zoom.target = boardZoom;
    zoomLevel.textContent = `${Math.round(boardZoom * 100)}%`;
    cam.x.target = (bounds.minX + bounds.maxX) / 2;
    cam.y.target = (bounds.minY + bounds.maxY) / 2;
    checkSharpness();
    kick();
  };

  /** Show one set, or all of them (""). */
  const setFilter = (set: string) => {
    if (set === activeSet || mode !== "board") return;
    activeSet = set;
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.setFilter ?? "") === set)));
    // The loose layout keeps its places (and any unsaved editor changes);
    // a spectrum is re-sorted for just the photos shown.
    if (arrangement === "loose") {
      orderSequence();
      measure();
    } else {
      arrange(true);
    }
    setTargets();
    fitView();
  };
  filterButtons.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.setFilter ?? "")));

  const setArrangement = (next: Arrangement) => {
    if (next === arrangement || mode !== "board") return;
    arrangement = next;
    arrangeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.arrange === next)));
    arrange(true);
    setZoom(boardZoom);
    setTargets();
  };
  arrangeButtons.forEach((button) =>
    button.addEventListener("click", () => setArrangement(button.dataset.arrange as Arrangement)),
  );

  window.addEventListener("keydown", (event) => {
    if ((event.target as HTMLElement | null)?.closest?.("input, textarea")) return;
    if (mode === "gallery") {
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "Escape") closeGallery();
      else return;
    } else {
      if (event.key === "+" || event.key === "=") setZoom(boardZoom * 1.25);
      else if (event.key === "-" || event.key === "_") setZoom(boardZoom / 1.25);
      else if (event.key === "0") setZoom(1);
      else if (event.key === "ArrowRight") pan(140, 0);
      else if (event.key === "ArrowLeft") pan(-140, 0);
      else if (event.key === "ArrowDown") pan(0, 140);
      else if (event.key === "ArrowUp") pan(0, -140);
      else return;
    }
    event.preventDefault();
  });

  // On the board, scrolling zooms toward the pointer (a trackpad pinch arrives
  // as ctrl + wheel, with smaller steps). In the gallery, scrolling steps
  // through photos.
  let wheelTotal = 0;
  let wheelLock = 0;
  window.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      if (mode === "board") {
        const unit = event.deltaMode === 1 ? 16 : 1;
        const rate = event.ctrlKey ? 0.01 : 0.0018;
        setZoom(boardZoom * Math.exp(-event.deltaY * unit * rate), pointer);
        return;
      }
      const now = performance.now();
      if (now < wheelLock) return;
      wheelTotal += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(wheelTotal) > 40) {
        go(wheelTotal > 0 ? 1 : -1);
        wheelTotal = 0;
        wheelLock = now + 260;
      }
    },
    { passive: false },
  );

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      size();
      arrange(false);
      if (mode === "board") setZoom(boardZoom);
      setTargets();
      kick();
    }, 80);
  });

  // ── Frame loop ──

  let raf = 0;
  let last = 0;
  /** The last tilt the glint was drawn for. */
  let glintDrawn = "";
  let elapsed = 0;
  let carry = 0;

  const kick = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    carry += dt;
    const steps = Math.floor(carry / STEP);
    carry -= steps * STEP;

    const view = [cam.x, cam.y, zoom];
    if (reduced) view.forEach((s) => s.snap());
    else for (let i = 0; i < steps; i++) view.forEach((s) => s.step(STEP, CAM_K, CAM_C));

    // Held, the photo tracks the pointer firmly; let go, it wobbles back.
    const [gk, gc] = grab.held ? [420, 34] : [GRAB_K, GRAB_C];
    if (reduced) grabSprings.forEach((s) => s.snap());
    else for (let i = 0; i < steps; i++) grabSprings.forEach((s) => s.step(STEP, gk, gc));
    const grabbing = mode === "gallery" && !grabSprings.every((s) => s.settled);
    const front = mode === "gallery" ? sequence[active] : null;
    // The CSS sheen stands in until the surface map has loaded.
    if (front && glint) front.el.classList.toggle("has-glint", glint.ready());

    const cursorEase = 1 - Math.exp(-dt * 28);
    if (!outside) {
      cursorPos.x += (pointer.x - cursorPos.x) * cursorEase;
      cursorPos.y += (pointer.y - cursorPos.y) * cursorEase;
    }

    const z = zoom.value;
    let busy = false;
    for (const print of prints) {
      const springs = [print.x, print.y, print.scale, print.rot, print.tilt, print.opacity];
      if (elapsed >= print.delay) {
        if (reduced) springs.forEach((s) => s.snap());
        else for (let i = 0; i < steps; i++) springs.forEach((s) => s.step(STEP, PRINT_K, PRINT_C));
      }
      if (elapsed < print.delay || !springs.every((s) => s.settled)) busy = true;

      // World to screen: photos are placed relative to the camera, at the zoom.
      const sx = (print.x.value - cam.x.value) * z + vw / 2;
      const sy = (print.y.value - cam.y.value) * z + vh / 2;
      // Only touch the style when something changed. Rewriting an unchanged
      // transform every frame makes the browser keep redrawing the photo at a
      // lower quality, which shows up as flicker.
      const held = print === front;
      const rx = held ? grab.rx.value : 0;
      const ry = print.tilt.value + (held ? grab.ry.value : 0);
      const lift = held ? grab.lift.value : 1;
      const transform =
        `translate3d(${(sx - print.w / 2).toFixed(2)}px, ${(sy - print.h / 2).toFixed(2)}px, 0) ` +
        `perspective(1400px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) ` +
        `rotate(${print.rot.value.toFixed(2)}deg) scale(${(print.scale.value * z * lift).toFixed(4)})`;
      if (held && glint?.ready()) {
        // The surface-mapped light follows the tilt; it settles back to a
        // flat grey that leaves the photo untouched.
        const key = `${rx.toFixed(2)}|${grab.ry.value.toFixed(2)}`;
        if (glintDrawn !== key) {
          glintDrawn = key;
          glint.draw(rx, grab.ry.value, clamp(Math.hypot(rx, grab.ry.value) / GRAB_TILT, 0, 1));
        }
      } else if (held || print.drawn.sheen) {
        // Light comes from a fixed source up and to the left. The more the
        // tilted photo faces it, the brighter it gets, and the reflection
        // slides across as it turns; facing away, it falls into shade.
        const tx = held ? grab.ry.value / GRAB_TILT : 0;
        const ty = held ? grab.rx.value / GRAB_TILT : 0;
        const facing = -tx * 0.55 + ty * 0.65;
        const shine = clamp(facing * 1.6, 0, 1);
        const shade = clamp(-facing * 1.4, 0, 1);
        const sheen = held && (shine > 0.002 || shade > 0.002)
          ? `${(30 + tx * 35).toFixed(1)}|${(20 + ty * 35).toFixed(1)}|${shine.toFixed(3)}|${shade.toFixed(3)}`
          : "";
        if (print.drawn.sheen !== sheen) {
          print.drawn.sheen = sheen;
          const [gx = "30", gy = "20", sh = "0", sd = "0"] = sheen.split("|");
          print.el.style.setProperty("--gx", `${gx}%`);
          print.el.style.setProperty("--gy", `${gy}%`);
          print.el.style.setProperty("--shine", sh);
          print.el.style.setProperty("--shade", sd);
        }
      }
      const opacity = clamp(print.opacity.value, 0, 1).toFixed(3);
      const zIndex = String(hovered === print && mode === "board" ? 999 : print.z);
      const events = print.opacity.target > 0 ? "" : "none";
      const style = print.el.style;
      const drawn = print.drawn;
      if (drawn.transform !== transform) style.transform = drawn.transform = transform;
      if (drawn.opacity !== opacity) style.opacity = drawn.opacity = opacity;
      if (drawn.zIndex !== zIndex) style.zIndex = drawn.zIndex = zIndex;
      if (drawn.events !== events) style.pointerEvents = drawn.events = events;
    }

    // The grain moves with the board but keeps its size: resampling it at
    // every zoom level causes moiré. Whole pixels keep it crisp.
    if (backdrop) backdrop.draw(cam.x.value, cam.y.value, z);
    else {
      // The CSS dot grid moves and scales with the board.
      board.style.backgroundPosition = `${vw / 2 - cam.x.value * z}px ${vh / 2 - cam.y.value * z}px`;
      board.style.backgroundSize = `${28 * z}px ${28 * z}px`;
    }

    // Set labels sit above the top-left corner of each set's area, in the
    // loose arrangement with every set shown.
    for (const [set, label] of setLabels) {
      const members = arrangement === "loose" && !activeSet && mode === "board" ? prints.filter((p) => p.set === set) : [];
      let next = "";
      if (members.length) {
        const left = Math.min(...members.map((p) => p.x.value - boardW(p) / 2));
        const top = Math.min(...members.map((p) => p.y.value - boardH(p) / 2));
        next = `${((left - cam.x.value) * z + vw / 2).toFixed(1)}|${((top - cam.y.value) * z + vh / 2 - 26).toFixed(1)}`;
      }
      if (labelDrawn.get(set) !== next) {
        labelDrawn.set(set, next);
        label.classList.toggle("is-visible", next !== "");
        if (next) {
          const [lx, ly] = next.split("|");
          label.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
        }
      }
    }

    const axisNext =
      axis && mode === "board"
        ? `${((axis.from - cam.x.value) * z + vw / 2).toFixed(1)}|${((axis.y - cam.y.value) * z + vh / 2).toFixed(1)}|${((axis.to - axis.from) * z).toFixed(1)}`
        : "";
    if (axisNext !== axisDrawn) {
      axisDrawn = axisNext;
      axisEl.classList.toggle("is-visible", axisNext !== "");
      if (axisNext) {
        const [left, top, width] = axisNext.split("|");
        axisEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        axisEl.style.width = `${width}px`;
      }
    }
    cursor.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;

    const moving =
      busy ||
      grabbing ||
      view.some((s) => !s.settled) ||
      (!outside && (Math.abs(pointer.x - cursorPos.x) > 0.2 || Math.abs(pointer.y - cursorPos.y) > 0.2));
    raf = moving ? requestAnimationFrame(frame) : 0;
  };

  // ── Start ──

  size();
  chainByColour();
  arrange(false);
  // Open on the first set rather than the middle of the whole board, which
  // can fall in the gap between sets.
  const opening = prints.filter((p) => p.set === setNames[0]);
  const around = opening.length ? opening : prints;
  cam.x.value = cam.x.target = around.reduce((sum, p) => sum + p.home.x, 0) / around.length;
  cam.y.value = cam.y.target = around.reduce((sum, p) => sum + p.home.y, 0) / around.length;
  // Open a little zoomed out, so most of the board is in view.
  zoom.value = zoom.target = boardZoom = clamp(0.85, zoomMin, zoomMax);
  zoomLevel.textContent = `${Math.round(boardZoom * 100)}%`;

  // Photos drop onto the board, left to right (in the editor they're just there).
  const random = seeded(3);
  const width = bounds.maxX - bounds.minX || 1;
  for (const print of prints) {
    print.x.value = print.home.x;
    print.y.value = print.home.y - (editing ? 0 : 30);
    print.rot.value = print.home.rot * (editing ? 1 : 1.6);
    print.scale.value = print.boardScale * (editing ? 1 : 1.05);
    print.opacity.value = editing ? 1 : 0;
    print.delay = reduced || editing ? 0 : 0.1 + ((print.home.x - bounds.minX) / width) * 0.45 + random() * 0.08;
  }
  setTargets();
  kick();

  /** What the editor (`src/scripts/editor.ts`) works with. */
  return {
    prints,
    board,
    /** One photo width in world px; saved positions are in these units. */
    unit: () => base,
    toWorld: (x: number, y: number) => ({
      x: cam.x.value + (x - vw / 2) / zoom.value,
      y: cam.y.value + (y - vh / 2) / zoom.value,
    }),
    toScreen: (x: number, y: number) => ({
      x: (x - cam.x.value) * zoom.value + vw / 2,
      y: (y - cam.y.value) * zoom.value + vh / 2,
    }),
    view: () => ({ x: cam.x.target, y: cam.y.target, zoom: zoom.target }),
    setView: (x: number, y: number, z: number) => {
      boardZoom = clamp(z, zoomMin, zoomMax);
      cam.x.value = cam.x.target = x;
      cam.y.value = cam.y.target = y;
      zoom.value = zoom.target = boardZoom;
      zoomLevel.textContent = `${Math.round(boardZoom * 100)}%`;
      kick();
    },
    /** Apply changed homes: re-measure, re-target and redraw. */
    refresh: () => {
      measure();
      orderSequence();
      setTargets();
      checkSharpness();
      kick();
    },
    autoLayout,
    sets: setNames,
    suggestSpot,
    freeSpot,
    overlaps,
    boardW,
    boardH,
    setCursorLabel,
  };
}

export type BoardApi = ReturnType<typeof startBoard>;
