import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { basename, extname, join } from "node:path";

/**
 * The editor's save and upload endpoints. A Vite plugin, so it only exists
 * while `bun run dev` is running; the built site has no way to write anything.
 *
 *   POST /__editor/save               body: the full photos.json array
 *   POST /__editor/upload?name=a.jpg&set=film  body: the raw image file
 *
 * Uploads go into the set's folder, scaled down to 2400px on the long edge
 * if they're bigger (scans can be huge, and the site never needs more).
 */
export function boardEditor() {
  const root = process.cwd();
  const dataFile = join(root, "src/data/photos.json");
  const photoDir = join(root, "src/assets/photos");
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  return {
    name: "board-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || !req.url?.startsWith("/__editor/")) return next();
        const url = new URL(req.url, "http://localhost");
        try {
          if (url.pathname === "/__editor/save") {
            const photos = JSON.parse((await readBody(req)).toString("utf8"));
            if (!Array.isArray(photos) || photos.some((p) => typeof p?.file !== "string")) {
              return send(res, 400, { error: "Expected an array of photos" });
            }
            // Keep only known fields, rounded so the file diffs cleanly.
            const round = (n, places) => (typeof n === "number" && Number.isFinite(n) ? Number(n.toFixed(places)) : undefined);
            const clean = photos.map((p) => ({
              file: String(p.file).replace(/\\/g, "/").replace(/^\/+|\.\.\//g, ""),
              x: round(p.x, 3),
              y: round(p.y, 3),
              rot: round(p.rot, 1),
              z: round(p.z, 0),
            }));
            await writeFile(dataFile, JSON.stringify(clean, null, 2) + "\n");
            return send(res, 200, { saved: clean.length });
          }

          if (url.pathname === "/__editor/upload") {
            const raw = basename(url.searchParams.get("name") ?? "");
            const ext = extname(raw).toLowerCase();
            if (!allowed.has(ext)) return send(res, 400, { error: `Unsupported file type: ${ext || "none"}` });
            const stem = raw.slice(0, -ext.length).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "photo";
            // Never overwrite: add a number if the name is taken.
            const set = (url.searchParams.get("set") ?? "photos").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "photos";
            const dir = join(photoDir, set);
            await mkdir(dir, { recursive: true });
            let name = `${stem}${ext}`;
            for (let i = 2; existsSync(join(dir, name)); i++) name = `${stem}-${i}${ext}`;
            const body = await readBody(req);
            const meta = await sharp(body).metadata();
            const long = Math.max(meta.width ?? 0, meta.height ?? 0);
            const out = long > 2400 ? await sharp(body).rotate().resize({ width: 2400, height: 2400, fit: "inside" }).jpeg({ quality: 92 }).toBuffer() : body;
            if (long > 2400 && ext !== ".jpg" && ext !== ".jpeg") name = name.slice(0, -ext.length) + ".jpg";
            await writeFile(join(dir, name), out);
            const file = `${set}/${name}`;
            // Register it with no position, so it gets placed.
            const photos = JSON.parse(await readFile(dataFile, "utf8"));
            photos.push({ file });
            await writeFile(dataFile, JSON.stringify(photos, null, 2) + "\n");
            return send(res, 200, { file });
          }

          return send(res, 404, { error: "Unknown editor endpoint" });
        } catch (error) {
          return send(res, 500, { error: String(error) });
        }
      });
    },
  };
}
