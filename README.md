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

| What | File |
| --- | --- |
| Name, intro, About copy, email, nav, links | `src/config/site.ts` |
| Work entries and their screenshots | `src/data/projects.ts`, `src/assets/work/` |
| Colours, type, layout | `src/styles/global.css` |

Photography lives on its own site. Put its URL in `photography` in
`src/config/site.ts` to show a single link to it in the footer.

### Adding a project

Add an entry to `src/data/projects.ts`. It shows up in the "Selected work"
list in the hero (with a hover preview), in the Work grid, and on its own page
at `/work/<slug>`. Each entry needs, all at 2x:

- `cover` — the first screen at 1440×900.
- `mobile` — one phone screen at 390×844.
- `pages` — full-length desktop captures at 1440 wide, home page first. With
  more than one, each is labelled on the project page.

## Notes on the design

Dark by default; the footer has a light-mode toggle, remembered in
`localStorage`. Quiet on purpose, so the screenshots carry the colour, with a
faint grain over everything so the flat background doesn't feel like a
template. One typeface, [Archivo](https://fonts.google.com/specimen/Archivo),
with a touch of its width axis on headings. Everything lives in
`src/styles/global.css`.

Hovering a title in the hero's work list shows that site trailing the pointer.
It only runs with a mouse; on touch screens the list is just links.
