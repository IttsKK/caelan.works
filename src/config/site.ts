import type { SiteMeta } from "../types/site";

export const siteMeta: SiteMeta = {
  name: "Caelan Redekopp",
  tagline: "Websites, apps and photographs",
  intro: "I design and build websites and apps, and I take photographs.",
  now: "Just released [Reader](/apps/reader), a reading app for iPhone, Mac and Android.",
  about: [
    "Most of what I make is for the web: marketing sites and landing pages, online software tools and SaaS platforms, and small tools. Lately that includes native apps, like [Reader](/apps/reader) for iPhone, Mac and Android, and some hardware projects.",
    "Started with competitive robotics, which taught me a lot about how low-level systems are designed and built, how to build things quickly and efficiently, as well as how to work with a team especially under pressure.",
    "I also love [photography](/photography) (both film and digital), music, art, movies, and travelling.",
  ],
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
    { label: "Photography", href: "/photography" },
    { label: "About", href: "/#about" },
    { label: "Contact", href: "#contact" },
  ],
};
