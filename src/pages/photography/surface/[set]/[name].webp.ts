import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { photos } from "../../../../data/photos";
import { surfaceMap } from "../../../../data/surface";

/** One surface map per photo, at /photography/surface/<set>/<name>.webp. See `src/data/surface.ts`. */
export const getStaticPaths = (() =>
  photos.map((photo) => {
    const [set, file] = photo.file.includes("/") ? photo.file.split("/") : ["photos", photo.file];
    return { params: { set, name: file.replace(/\.[^.]+$/, "") }, props: { file: photo.file } };
  })) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const map = await surfaceMap(join(process.cwd(), "src/assets/photos", props.file as string));
  return new Response(new Uint8Array(map), { headers: { "Content-Type": "image/webp" } });
};
