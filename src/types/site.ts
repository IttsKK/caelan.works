export type ExternalLinkKind = "github" | "linkedin" | "other";

export interface ExternalLink {
  label: string;
  href: string;
  kind: ExternalLinkKind;
}

export interface SiteMeta {
  name: string;
  tagline: string;
  intro: string;
  email: string;
  links: ExternalLink[];
}

export type ProjectCategory = "product" | "workflow" | "robotics" | "internal";
export type ProjectStatus = "active" | "ongoing" | "archive";
export type ProjectVisibility = "private" | "personal" | "selective";

export interface ProjectEntry {
  slug: string;
  title: string;
  summary: string;
  category: ProjectCategory;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  featured: boolean;
}
