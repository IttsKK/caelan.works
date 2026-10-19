/*
 * The board's background, drawn by a small WebGL shader behind the photos.
 *
 * A texture painted as an image tile has to be resampled every time the board
 * zooms, and fine detail resampled to an in-between size turns into bands and
 * interference patterns. Drawing it per pixel avoids that: anything tied to
 * the board is drawn at board coordinates, and each layer of detail fades out
 * smoothly before it gets finer than a pixel or two, so zooming only ever
 * reveals or softens detail, never aliases it. Grain tied to the screen
 * doesn't move or scale at all.
 *
 * Styles (pick one with `?bg=<name>`; the default is DEFAULT_STYLE):
 *   grain  fine film grain fixed to the screen: identical at every zoom
 *   paper  soft paper mottling that moves and zooms with the board, plus grain
 *   dots   a dot grid on the board that thins out as you zoom away, plus grain
 *   cork   fine warm granules on the board, like the cork board, plus grain
 *   plain  flat, no texture
 */

export const STYLES = ["grain", "paper", "dots", "cork", "plain"] as const;
export type BackdropStyle = (typeof STYLES)[number];
export const DEFAULT_STYLE: BackdropStyle = "dots";

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 res;      // canvas size, device px
uniform float dpr;     // device px per CSS px
uniform vec2 cam;      // board point at the centre of the screen
uniform float zoom;    // CSS px per board px
uniform int style;
uniform vec3 base;     // the board colour

// A hash that holds up at large coordinates (no sin()).
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Smooth value noise in 0..1.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// How much of a layer of detail to keep: all of it while its features span
// a few pixels, none once they'd be finer than about two. "freq" is features
// per board px, "px" is board px per device pixel.
float keep(float freq, float px) {
  return 1.0 - smoothstep(0.12, 0.4, freq * px);
}

// Turns each layer of noise a little, so no layer lines up with a square
// grid (which otherwise shows as blocky cells up close).
const mat2 TURN = mat2(0.8, -0.6, 0.6, 0.8);

// Layered noise centred on 0, with each layer faded out before it aliases.
float fbm(vec2 p, float freq, float px) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    sum += amp * keep(freq, px) * (vnoise(p * freq + float(i) * 19.7) - 0.5);
    p = TURN * p;
    freq *= 2.03;
    amp *= 0.55;
  }
  return sum;
}

// Film grain fixed to the screen, about one CSS px per grain, with a softer
// spread than plain random (two samples averaged).
float grain() {
  vec2 cell = floor(gl_FragCoord.xy / max(1.0, dpr * 0.85));
  return hash(cell) + hash(cell + 71.3) - 1.0;
}

void main() {
  vec2 screen = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr;
  vec2 world = cam + (screen - res / dpr * 0.5) / zoom;
  float px = 1.0 / (zoom * dpr);
  vec3 col = base;
  float g = grain();

  if (style == 0) {
    // Grain: only the screen grain.
    col += g * 0.026;
  } else if (style == 1) {
    // Paper: broad soft patches with finer tooth inside them, warm, plus grain.
    float m = fbm(world, 1.0 / 260.0, px) * 0.9 + fbm(TURN * world, 1.0 / 36.0, px) * 0.3;
    col += m * vec3(0.075, 0.062, 0.048);
    col += g * 0.018;
  } else if (style == 2) {
    // Dots: a 28px grid on the board, dots a fixed size on screen. As they
    // crowd together the grid fades into one four times coarser.
    float shown = 0.0;
    for (int level = 0; level < 2; level++) {
      float spacing = level == 0 ? 28.0 : 112.0;
      float onScreen = spacing * zoom;
      float weight = level == 0 ? smoothstep(9.0, 16.0, onScreen) : 1.0 - smoothstep(30.0, 60.0, onScreen);
      vec2 nearest = (floor(world / spacing + 0.5)) * spacing;
      float dist = length(world - nearest) * zoom;  // CSS px
      float spot = clamp((1.15 - dist) * dpr + 0.5, 0.0, 1.0);
      shown = max(shown, spot * weight);
    }
    col += shown * 0.085;
    col += g * 0.016;
  } else if (style == 3) {
    // Cork: dense granules a few board px across, with patchy tone.
    float fine = (vnoise(TURN * world / 3.2) - 0.5) * keep(1.0 / 3.2, px);
    float mid = (vnoise(TURN * TURN * world / 8.0 + 3.1) - 0.5) * keep(1.0 / 8.0, px);
    float patch = fbm(world, 1.0 / 120.0, px);
    float t = fine * 0.6 + mid * 0.55 + patch * 0.8;
    col += t * vec3(0.1, 0.078, 0.055);
    col += g * 0.016;
  }
  // style 4 (plain): the base colour as it is.

  gl_FragColor = vec4(col, 1.0);
}`;

export interface Backdrop {
  style: BackdropStyle;
  setStyle(style: BackdropStyle): void;
  /** Redraw for the camera (board point at the screen centre) and zoom. */
  draw(camX: number, camY: number, zoom: number): void;
}

/** Put the background canvas into the board; null if WebGL isn't available. */
export function createBackdrop(board: HTMLElement, style: BackdropStyle, colour: string): Backdrop | null {
  const canvas = document.createElement("canvas");
  canvas.className = "backdrop";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("res");
  const uDpr = u("dpr");
  const uCam = u("cam");
  const uZoom = u("zoom");
  const uStyle = u("style");
  const uBase = u("base");

  // The board colour, from CSS, as 0..1 RGB.
  const probe = document.createElement("div");
  probe.style.color = colour;
  document.body.append(probe);
  const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [17, 15, 13];
  probe.remove();
  gl.uniform3f(uBase, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

  board.prepend(canvas);
  board.classList.add("has-backdrop");

  let drawn = "";
  const backdrop: Backdrop = {
    style,
    setStyle(next) {
      backdrop.style = next;
      drawn = "";
    },
    draw(camX, camY, zoom) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      // Only redraw when something changed (whole device pixels of movement).
      const key = `${backdrop.style}|${w}|${h}|${Math.round(camX * zoom * dpr)}|${Math.round(camY * zoom * dpr)}|${zoom.toFixed(5)}`;
      if (key === drawn) return;
      drawn = key;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uDpr, dpr);
      gl.uniform2f(uCam, camX, camY);
      gl.uniform1f(uZoom, zoom);
      gl.uniform1i(uStyle, STYLES.indexOf(backdrop.style));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
  return backdrop;
}
