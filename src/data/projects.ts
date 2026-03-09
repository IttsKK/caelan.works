import type { ProjectEntry } from "../types/site";

export const projects: ProjectEntry[] = [
  {
    slug: "jv-copilot",
    title: "JV Copilot",
    summary:
      "Affiliate campaign management tooling for launches, partner coordination, and platform integrations.",
    category: "product",
    status: "active",
    visibility: "private",
    featured: true,
  },
  {
    slug: "jot",
    title: "Jot",
    summary: "A personal workflow system for notes, tasks, follow-ups, and keeping loose ends from drifting.",
    category: "workflow",
    status: "ongoing",
    visibility: "personal",
    featured: true,
  },
  {
    slug: "vex-worlds-top-8",
    title: "VEX Worlds top 8",
    summary: "A straightforward robotics result that still says something useful about iteration, systems, and pressure.",
    category: "robotics",
    status: "archive",
    visibility: "selective",
    featured: true,
  },
  {
    slug: "small-tools",
    title: "Small tools",
    summary: "A link shortener, an email deliverability tester, and the internal utilities that quietly remove friction.",
    category: "internal",
    status: "ongoing",
    visibility: "private",
    featured: false,
  },
];
