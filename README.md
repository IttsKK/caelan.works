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

- The ASCII fluid simulation belongs to the hero only. It fades out and stops
  animating once you scroll past it, and never runs on pages without a hero.
- The colour accent and light/dark mode are both remembered in `localStorage`.
  Mode follows the system preference until someone picks one.
- `prefers-reduced-motion` turns off the simulation and all transitions.
