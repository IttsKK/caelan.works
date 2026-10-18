import { readdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Astro copies every imported image into the build, even when only resized
 * versions are used. The board only ever shows the WebP versions, so this
 * removes original JPEG/PNG files that nothing in the built site refers to.
 */
export function pruneOriginals() {
  return {
    name: "prune-originals",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const assets = join(root, "_astro");
        const all = await walk(root);
        const text = (
          await Promise.all(all.filter((f) => /\.(html|js|css|json|xml|txt)$/.test(f)).map((f) => readFile(f, "utf8")))
        ).join("\n");
        let removed = 0;
        let bytes = 0;
        for (const name of await readdir(assets).catch(() => [])) {
          if (!/\.(jpe?g|png)$/i.test(name) || text.includes(name)) continue;
          const file = join(assets, name);
          bytes += (await stat(file)).size;
          await rm(file);
          removed++;
        }
        if (removed) logger.info(`Removed ${removed} unused original images (${(bytes / 1e6).toFixed(0)} MB)`);
      },
    },
  };
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}
