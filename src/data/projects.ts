import type { WorkEntry } from "../types/site";

/**
 * The work list. Add an entry here and it shows up on /work; set
 * `featured: true` to also surface it on the home page.
 */
export const projects: WorkEntry[] = [
  {
    slug: "jv-copilot",
    title: "JV Copilot",
    summary:
      "Affiliate campaign management software — launches, partner coordination, and the platform integrations underneath them.",
    kind: "product",
    status: "active",
    period: "2024 —",
    role: "Product and engineering",
    stack: ["TypeScript", "React", "Postgres", "APIs"],
    href: "https://jvcopilot.ai",
    featured: true,
  },
  {
    slug: "jot",
    title: "Jot",
    summary:
      "A personal system for notes, tasks, and follow-ups, built because nothing off the shelf kept loose ends from drifting.",
    kind: "tool",
    status: "ongoing",
    period: "2023 —",
    role: "Design and build",
    stack: ["TypeScript", "Local-first"],
    note: "Private",
    featured: true,
  },
  {
    slug: "small-tools",
    title: "Small tools",
    summary:
      "A link shortener, an email deliverability tester, and a handful of utilities that quietly remove friction from a week.",
    kind: "tool",
    status: "ongoing",
    period: "Ongoing",
    role: "Build and maintain",
    stack: ["TypeScript", "Node", "Astro"],
    note: "Mostly private",
    featured: true,
  },
  {
    slug: "caelan-works",
    title: "This site",
    summary:
      "A small static site — a portfolio and a contact page, with a slow ASCII fluid sim for texture.",
    kind: "web",
    status: "shipped",
    period: "2025",
    role: "Design and build",
    stack: ["Astro", "CSS", "Canvas-free ASCII"],
    href: "https://github.com/ittskk/caelan.works",
    featured: false,
  },
  {
    slug: "vex-worlds-top-8",
    title: "VEX Worlds, top 8",
    summary:
      "Competitive robotics. A result worth keeping mostly for what it taught about iteration and working under a deadline.",
    kind: "robotics",
    status: "archive",
    period: "2022",
    role: "Build and strategy",
    stack: ["C++", "Mechanical design"],
    featured: false,
  },
];

export const featuredProjects = projects.filter((project) => project.featured);
