import type { SiteMeta } from "../types/site";

export const siteMeta: SiteMeta = {
  name: "Caelan Redekopp",
  role: "Web development & photography",
  tagline: "Web development and photography",
  intro: "I build websites and software, and I take photographs.",
  about: [
    "I'm a developer. Most of what I make is for the web — product interfaces, internal tools, and the unglamorous plumbing that keeps a small team's day from turning into copy-paste. I like problems where the fix is a clearer process rather than more features.",
    "I got here through competitive robotics, which is a good school for taking things apart, testing them honestly, and putting them back together properly. That's still roughly how I work.",
    "The rest of the time I'm out with a camera. Those photos live on their own page.",
  ],
  current: {
    label: "JV Copilot",
    href: "https://jvcopilot.ai",
    description: "affiliate campaign management software",
  },
  location: "",
  email: "caelan@caelan.works",
  availability: "Open to small web projects and freelance work.",
  links: [
    { label: "GitHub", href: "https://github.com/ittskk", kind: "github" },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/caelan-redekopp",
      kind: "linkedin",
    },
  ],
  nav: [
    { label: "Work", href: "/work" },
    { label: "Photography", href: "/photography" },
    { label: "Contact", href: "/#contact" },
  ],
};
