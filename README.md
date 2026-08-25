# caelan.works

A small static site built with [Astro](https://astro.build). It's a portfolio
and a contact page: an intro, the work, photography, and an email address.

## Running it

```sh
bun install
bun run dev      # local dev server
bun run build    # static build into dist/
bun run preview  # serve the build
bunx astro check # typecheck
```

## Where the content lives

Almost everything is data, so the pages don't need editing to stay current.

| What | File |
| --- | --- |
| Name, intro, About copy, email, nav, social links | `src/config/site.ts` |
| What I'm working on right now (the "Currently" line) | `src/config/site.ts` → `current` |
| Work entries | `src/data/projects.ts` |
| Photo sets | `src/data/photos.ts` |
| What I offer (the three cards in About) | `src/components/About.astro` |
| Colours, type, spacing | `src/styles/tokens.css` |

### Adding a project

Add an entry to `src/data/projects.ts`. It shows up on `/work` automatically;
set `featured: true` to also put it on the home page. Leave `href` off for
private work and put a short `note` ("Private", "Client work") in its place.

### Adding photos

1. Put the files in `public/photos/` — JPEG or WebP, long edge around 2000px.
2. Add a set to `photoSets` in `src/data/photos.ts`.
3. Give each photo its real `width` and `height` so the grid doesn't reflow
   while images load. `wide: true` makes a frame span two columns.

While `photoSets` is empty, `/photography` shows a short placeholder rather
than an empty grid.

## Notes on the design

It's meant to read as printed matter — paper, ink, and rules — rather than a
product landing page. So: no cards, no pill buttons, no tag chips, and no
letterspaced all-caps labels. Metadata is one italic line; marginal labels are
set like running heads; work entries are numbered like plates in a catalogue.

- **Type** is [Fraunces](https://fonts.google.com/specimen/Fraunces) for display
  and [Newsreader](https://fonts.google.com/specimen/Newsreader) for text, both
  self-hosted variable fonts. Fraunces' personality lives in its `SOFT` and
  `WONK` axes, and it needs the right `opsz` at each size — see
  `--display-large` / `--display-small` in `src/styles/tokens.css`. Changing
  those two values changes the whole voice of the site.
- **Paper is the default.** Dark mode is the same warm ink inverted, and only
  applies if asked for here or in the OS.
- **The fluid simulation** is grain, not a feature. It uses dot ramps rather
  than ASCII art, belongs to the hero only, and fades out and stops animating
  once you scroll past it. It never runs on pages without a hero.
- The ink colour and light/dark mode are both remembered in `localStorage`. The
  five ink swatches live behind the small control at the bottom right — delete
  the `.controls__styles-wrap` block in `BaseLayout.astro` to drop them and
  leave just the mode toggle.
- `prefers-reduced-motion` turns off the simulation and all transitions.
