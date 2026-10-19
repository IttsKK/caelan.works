# caelan.works

A static site built with [Astro](https://astro.build), in two parts under one
header:

- **Home and work** (`/`, `/work/<slug>`): a dark, quiet portfolio of websites,
  with a photography row, an About section and contact details.
- **Photography** (`/photography`): a full-screen board of photos you drag and
  zoom around, with a gallery for each photo.

The header on the home and work pages links the two (Work · Photography ·
About · Contact). On the photography board there's no nav: the name in the
top-left links back to the home page, and sits in exactly the same spot as the
name in the site's header.

## Running it

```sh
bun install
bun run dev      # local dev server
bun run build    # static build into dist/
bun run preview  # serve the build
bunx astro check # typecheck
```

## Where the content lives

| What | File |
| --- | --- |
| Name, intro, About copy, email, nav, links | `src/config/site.ts` |
| Work entries and their screenshots | `src/data/projects.ts`, `src/assets/work/` |
| Photos, grouped in folders | `src/assets/photos/<set>/` |
| Where each photo sits on the board | `src/data/photos.json` (written by the editor) |
| Which photos appear on the home page | `featured` in `src/data/photos.ts` |
| Home and work styles | `src/styles/global.css` |
| Photography board styles | `src/styles/board.css` (only loaded on `/photography`) |

### Adding a project

Add an entry to `src/data/projects.ts`. It shows up in the "Selected work"
list in the hero (with a hover preview), in the Work grid, and on its own page
at `/work/<slug>`. Each entry needs, all at 2x:

- `cover` — the first screen at 1440×900.
- `mobile` — one phone screen at 390×844.
- `pages` — full-length desktop captures at 1440 wide, home page first. With
  more than one, each is labelled on the project page.

## Notes on the design

Dark by default; the home and work pages have a light-mode toggle in the
footer, remembered in `localStorage` (the photography board is always dark).
Quiet on purpose, so the screenshots carry the colour, with a faint grain over
everything so the flat background doesn't feel like a template. One typeface,
[Archivo](https://fonts.google.com/specimen/Archivo), with a touch of its width
axis on headings; the photography board uses a small mono for its controls.
Everything for the home and work pages lives in `src/styles/global.css`.

Hovering a title in the hero's work list shows that site trailing the pointer.
It only runs with a mouse; on touch screens the list is just links.

# Photography board

## Sets

Each folder inside `src/assets/photos/` is a set: right now `digital/` and
`film/`. Make a new folder and it becomes a new set. Sets get their own area
on the board with a small label, and a filter next to the name (All · Digital
· Film): picking one shows just that set, the Colour and Light views sort only
that set, and the gallery only steps through it. The order of sets is
`SET_ORDER` in `src/data/photos.ts`; names come from the folder, capitalised.

In the gallery (with the board in its Loose arrangement), photos go set by
set. Within a set, the newer edits with a plain border come first, then the
older work, and within each of those every photo sits next to the ones closest
to it in colour. Borders are spotted automatically at build time
(`src/data/border.ts`), so a new bordered photo joins the others on its own.

## Adding and arranging photos

Run `bun run dev` and open <http://localhost:4321/photography?edit>. The editor only
exists in dev; the built site has no trace of it.

- **Add photos**: pick a set in "Add to", then drop image files onto the
  page. They're copied into that set's folder (scaled down to 2400px if
  they're bigger) and placed next to photos of a similar colour in the same
  set. Copying files into a folder by hand works too.
- **Move**: drag a photo. Shift-click or shift-drag a box to select several
  and move them together. Arrow keys nudge (shift for bigger steps).
- **Rotate**: `[` and `]` (shift for bigger steps), or alt + scroll.
- **Place near similar**: moves the selected photos (or any new, unplaced
  ones) beside the photos closest to them in colour.
- **Scatter**: drops the selection into random free spots in view.
- **Nudge apart**: pushes overlapping photos apart (just the selection, if
  there is one).
- **Regroup all**: lays out each set in its own area, in colour groups, as a
  starting point to adjust by hand.
- **Undo** (⌘Z) and **Save** (⌘S). Saving writes `src/data/photos.json`;
  commit it like any other change.

Positions are stored in photo widths from the middle of the board, so the
layout scales with the screen. A photo without a saved position (new, or
never arranged) is placed beside its closest colours on the live site too, so
nothing breaks if you skip the editor. The colour reading lives in
`src/data/colour.ts`, the save and upload endpoints in `editor-server.mjs`
(a dev-server plugin set up in `astro.config.mjs`; restart `bun run dev` after
pulling it in).

## Controls

- **Move**: drag (mouse or finger), or the arrow keys.
- **Zoom** (bottom left): − and +, scroll, pinch, or the + / − / 0 keys.
  Zooming with the pointer keeps the spot under it in place.
- **Loose / Colour / Light** (bottom right) re-arrange the board. Loose is the
  layout from the editor. Colour and Light are spectrums: each photo sits at its
  measured value along a labelled axis, and photos with close values gather
  into a cloud around their spot. With lots of photos this becomes a
  gradient. The gallery follows the current order.
- **Gallery**: arrows, scroll or trackpad, swiping, clicking either side of
  the front photo (each click moves exactly one photo), or the dial at the
  bottom: an arc with a tick per photo and a marker at the current one. Tap a
  tick to jump to it, or drag along the arc to scrub through. Clicking the empty space above or below the photos, Close, or Esc
  closes it.
- **Tilt**: press and hold the front photo and it tips gently toward where
  you're holding it, then wobbles back flat when you let go.

## How the board works

Everything moves in `src/scripts/board.ts`, with no animation library.

- **Camera.** Dragging moves the camera's target and it follows on a quick
  spring, with a little momentum after a flick. Zoom is a spring too. The
  grain moves with the board but is never scaled, since resampling it at
  every zoom level causes moiré.
- **Springs.** Each photo has springs for position, scale, rotation, tilt and
  opacity. Arrangements and the gallery are just different targets, so photos
  move between them with the same motion. Spring constants are at the top of
  `board.ts`.
- **Sharpness.** Each photo element is laid out at its gallery size and
  scaled down for the board, since scaling down stays sharp and scaling up
  doesn't. The full-size file is loaded for photos near the front of the
  gallery or zoomed in past their small file, and the decoded image replaces
  the small one, so nothing blanks or flashes.
- **Glint.** Each photo has a surface map, made at build time with no AI
  (`src/data/surface.ts`): brightness is treated as height and a Sobel filter
  works out which way each patch faces. While the front photo is tilted, a
  small WebGL shader (`src/scripts/glint.ts`) lights that surface from a fixed
  light up and to the left, so ripples, clouds and grass catch the light
  differently. It's blended so a flat photo is left untouched. Without WebGL
  a plain CSS sheen stands in.
- **Gallery stacks.** The photos either side of the front one are a stack:
  their centres sit at fixed, even distances from the centre of the front
  photo, whatever their shape. Each keeps its own size, so a landscape print
  is bigger but takes no extra room, and the stacks never shift when the front
  photo changes.
- **Idle.** The frame loop stops once everything has settled, and a photo's
  style is only written when it actually changes. Rewriting unchanged
  transforms every frame makes browsers redraw photos at lower quality, which
  shows up as flicker.
- `prefers-reduced-motion` turns the springs into instant moves.

## Hosting

The whole site is static. `bun run build` produces `dist/`, and a build step
(`prune-originals.mjs`) removes the full-size source photos from it, since only
the resized WebP copies are used. Without that the build would carry every
original twice.
