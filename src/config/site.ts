import type { SiteMeta } from "../types/site";

export const siteMeta: SiteMeta = {
  name: "Caelan Redekopp",
  tagline: "Design and development",
  intro: "I design and build websites.",
  now: "Currently building JV Copilot.",
  about: [
    "Most of what I make is for the web: marketing sites, product pages, and the small tools behind them. I do the design and the build myself.",
    "I got here through competitive robotics, which is a good school for taking things apart, testing them honestly, and putting them back together properly. That's still roughly how I work.",
  ],
  photography: "",
  email: "caelan@caelan.works",
  links: [
    { label: "GitHub", href: "https://github.com/ittskk", kind: "github" },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/caelan-redekopp",
      kind: "linkedin",
    },
  ],
  nav: [
    { label: "Work", href: "/#work" },
    { label: "About", href: "/#about" },
    { label: "Contact", href: "#contact" },
  ],
};
