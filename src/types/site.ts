import type { ImageMetadata } from "astro";

export type ExternalLinkKind = "github" | "linkedin" | "instagram" | "email" | "other";

export interface ExternalLink {
  label: string;
  href: string;
  kind: ExternalLinkKind;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteMeta {
  name: string;
  /** One plain sentence for <title> fallbacks and social cards. */
  tagline: string;
  /** The line at the top of the home page. */
  intro: string;
  /** A quieter line under it: what I'm doing now. Leave empty to hide it. */
  now: string;
  /** About section copy. One string per paragraph. */
  about: string[];
  /** The separate photography site. Shown as one quiet footer link; leave empty to hide it. */
  photography: string;
  email: string;
  links: ExternalLink[];
  nav: NavLink[];
}

export interface WorkImage {
  src: ImageMetadata;
  alt: string;
}

export interface WorkPage extends WorkImage {
  /** Which page of the site this is, e.g. "Home" or "Lookbook". */
  label: string;
}

export interface WorkEntry {
  slug: string;
  title: string;
  /** One line: what it is and who it's for. */
  summary: string;
  /** Longer copy for the project page. One string per paragraph. */
  description: string[];
  year: string;
  /** What I actually did on it. */
  role: string;
  /** e.g. "Live" or "Unreleased". */
  status: string;
  stack: string[];
  /** Public link. Omit for unreleased or private work. */
  href?: string;
  /** The first screen of the site at 1440×900, used on the home page. */
  cover: WorkImage;
  /** One phone-sized screen, shown beside the pages. */
  mobile: WorkImage;
  /** Full-length desktop captures, home page first. */
  pages: WorkPage[];
}
