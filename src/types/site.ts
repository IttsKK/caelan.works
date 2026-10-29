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
  /** A quieter line under it: what I'm doing now. Leave empty to hide it. `[text](href)` makes a link. */
  now: string;
  /** About section copy. One string per paragraph; `[text](/path)` makes a link. */
  about: string[];
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
  /** Where to download it, for apps. Shown on the project page as "Get it". */
  download?: { label: string; href: string };
  /** For apps: the slug of its write-up in `src/data/apps.ts`, linked from the project page. */
  app?: string;
  /** App icon: shown beside links to `href` or the app's write-up in the home page's now line. Square, at least 64px. */
  icon?: ImageMetadata;
  /** Full width at the top of the Work grid. Give it to one project at a time. */
  featured?: boolean;
  /** The first screen of the site at 1440×900, used on the home page. */
  cover: WorkImage;
  /** One phone-sized screen, shown beside the pages. */
  mobile: WorkImage;
  /** Full-length desktop captures, home page first. */
  pages: WorkPage[];
}

export interface Figure extends WorkImage {
  caption: string;
}

export interface AppSection {
  title: string;
  /** One string per paragraph; `[text](href)` makes a link. */
  body?: string[];
  /** Short named points under the body: a feature, a date, a decision. */
  items?: { term: string; text: string }[];
  /** Groups of images under the words. "phones" sit side by side at phone size; "wide" are mockups and other landscape images. */
  figures?: { kind: "phones" | "wide"; images: Figure[] }[];
}

/** The write-up of an app at /apps/<slug>: the app itself, not its site. */
export interface AppBreakdown {
  slug: string;
  title: string;
  icon: ImageMetadata;
  /** One line for the page description and social cards. */
  summary: string;
  /** The opening, one string per paragraph. */
  intro: string[];
  facts: { label: string; value: string; href?: string }[];
  /** The row of screens under the opening, in the order you'd use the app. */
  screens: Figure[];
  sections: AppSection[];
  /** Where the page ends: usually the site's project page. */
  next: { label: string; href: string };
}
