/*
 * Light on a tilted photo, following its texture.
 *
 * A canvas sits on top of the front photo, blended with soft-light, so mid
 * grey leaves the photo untouched, lighter brightens it and darker shades it.
 * A small WebGL shader lights the photo's surface map (see
 * `src/data/surface.ts`) from a fixed light up and to the left: the whole
 * photo brightens as it turns toward the light, and its texture picks up
 * small highlights and shadows of its own. Flat, it draws plain grey, which
 * changes nothing.
 */

const VERTEX = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D map;
uniform vec3 light;
uniform vec3 rest;
uniform float amount;
void main() {
  vec4 t = texture2D(map, uv);
  vec3 n = normalize(t.rgb * 2.0 - 1.0);
  // The whole photo turning toward or away from the light.
  float broad = light.z - rest.z;
  // The texture's own shading, relative to a flat photo.
  float relief = dot(n, light) - light.z;
  // A small, tight highlight, mostly on the brighter parts of the photo.
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, halfway), 0.0), 60.0) * smoothstep(0.35, 0.9, t.a);
  float v = 0.5 + amount * (broad * 0.5 + relief * 0.5 + spec * 0.3);
  gl_FragColor = vec4(vec3(clamp(v, 0.0, 1.0)), 1.0);
}`;

/** The light, in screen space: up and to the left, and toward you. */
const LIGHT = (() => {
  const v = [-0.45, -0.55, 0.7];
  const len = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / len) as [number, number, number];
})();

export interface Glint {
  /** Put the canvas on a photo and load its surface map. */
  attach(el: HTMLElement, surface: string, width: number, height: number): void;
  /** Redraw for the photo's tilt, in degrees. Returns false if not ready. */
  draw(rx: number, ry: number, amount: number): boolean;
  /** Whether the current photo's surface map has loaded. */
  ready(): boolean;
}

export function createGlint(): Glint | null {
  const canvas = document.createElement("canvas");
  canvas.className = "glint";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
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

  const uLight = gl.getUniformLocation(program, "light");
  const uRest = gl.getUniformLocation(program, "rest");
  const uAmount = gl.getUniformLocation(program, "amount");
  gl.uniform3fv(uRest, LIGHT);

  const textures = new Map<string, WebGLTexture>();
  const loading = new Set<string>();
  let current = "";

  const load = (surface: string) => {
    if (textures.has(surface) || loading.has(surface)) return;
    loading.add(surface);
    const image = new Image();
    image.onload = () => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures.set(surface, texture);
      loading.delete(surface);
    };
    image.onerror = () => loading.delete(surface);
    image.src = surface;
  };

  /** Turn the screen-space light into the photo's own space, given its tilt. */
  const localLight = (rx: number, ry: number) => {
    const a = (-rx * Math.PI) / 180;
    const b = (-ry * Math.PI) / 180;
    const [x, y, z] = LIGHT;
    // Undo rotateX, then rotateY (the transform applies rotateX(rx) rotateY(ry)).
    const y1 = y * Math.cos(a) - z * Math.sin(a);
    const z1 = y * Math.sin(a) + z * Math.cos(a);
    const x2 = x * Math.cos(b) + z1 * Math.sin(b);
    const z2 = -x * Math.sin(b) + z1 * Math.cos(b);
    return [x2, y1, z2];
  };

  return {
    attach(el, surface, width, height) {
      current = surface;
      load(surface);
      // Half resolution is plenty for soft light, and keeps it cheap.
      const w = Math.max(1, Math.round(width / 2));
      const h = Math.max(1, Math.round(height / 2));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (canvas.parentElement !== el) el.appendChild(canvas);
    },
    ready: () => textures.has(current),
    draw(rx, ry, amount) {
      const texture = textures.get(current);
      if (!texture) return false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform3fv(uLight, localLight(rx, ry));
      gl.uniform1f(uAmount, amount);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    },
  };
}
