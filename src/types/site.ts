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

export interface CurrentWork {
  label: string;
  href: string;
  /** What it is, in a few words. Rendered after the label. */
  description: string;
}

export interface SiteMeta {
  name: string;
  /** One plain sentence for <title> fallbacks and social cards. */
  tagline: string;
  /** What I do, in the fewest words that are still true. */
  role: string;
  /** Short intro used on the home page and as the default meta description. */
  intro: string;
  /** Longer first-person copy for the About section. One string per paragraph. */
  about: string[];
  /** What I'm mostly working on right now. Set to null to hide the line. */
  current: CurrentWork | null;
  location: string;
  email: string;
  /** Optional line about current availability. Leave empty to hide it. */
  availability: string;
  links: ExternalLink[];
  nav: NavLink[];
}

/** Broad buckets so the same list can hold client sites and personal tools. */
export type WorkKind = "web" | "product" | "tool" | "robotics";
export type WorkStatus = "active" | "ongoing" | "shipped" | "archive";

export interface WorkEntry {
  slug: string;
  title: string;
  /** One line: what it is and who it's for. */
  summary: string;
  kind: WorkKind;
  status: WorkStatus;
  /** e.g. "2024 —" or "2023". Free text so ranges stay readable. */
  period: string;
  /** What I actually did on it. */
  role: string;
  /** Short list of the main tools. Keep it to four or five. */
  stack: string[];
  /** Optional public link. Omit for private work. */
  href?: string;
  /** Shown when there's no link, e.g. "Private repo". */
  note?: string;
  featured: boolean;
}

export interface Photo {
  /** Path under /public, e.g. "/photos/coast-01.jpg". */
  src: string;
  alt: string;
  /** Optional caption shown under the photo. */
  caption?: string;
  /** Intrinsic size, used to reserve space before the image loads. */
  width: number;
  height: number;
  /** Let a standout frame take two columns in the grid. */
  wide?: boolean;
}

export interface PhotoSet {
  slug: string;
  title: string;
  /** Where and when, roughly. */
  meta: string;
  description: string;
  photos: Photo[];
}
