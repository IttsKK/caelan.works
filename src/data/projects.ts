import type { WorkEntry } from "../types/site";

import jvCover from "../assets/work/jv-cover.webp";
import jvMobile from "../assets/work/jv-mobile.webp";
import jvPage from "../assets/work/jv-page.webp";
import komsCover from "../assets/work/koms-cover.webp";
import komsMobile from "../assets/work/koms-mobile.webp";
import komsPage from "../assets/work/koms-page.webp";
import komsProduct from "../assets/work/koms-product.webp";
import komsLookbook from "../assets/work/koms-lookbook.webp";

/**
 * The work list, in the order it appears on the home page. Each entry also
 * gets its own page at /work/<slug>.
 *
 * Screenshots live in `src/assets/work/`, all at 2x: the cover is the first
 * 1440×900 screen, pages are full length at 1440 wide, phones are 390×844.
 */
export const projects: WorkEntry[] = [
  {
    slug: "jv-copilot",
    title: "JV Copilot",
    summary: "Marketing site for software that runs joint-venture and affiliate launches.",
    description: [
      "JV Copilot helps marketers run partner launches: who's promoting, what they've committed to, which assets they need, and who still hasn't mailed. The people it's for already know the space well, so the site had to skip the hype and get to the point quickly.",
      "I designed and built the marketing site: the landing page, pricing, how it works, the partner programme and the seasonal offer pages.",
    ],
    year: "2025–26",
    role: "Design and development",
    status: "Live",
    stack: ["Next.js", "Tailwind"],
    href: "https://jvcopilot.ai",
    cover: { src: jvCover, alt: "JV Copilot landing page, first screen" },
    mobile: { src: jvMobile, alt: "JV Copilot landing page on a phone" },
    pages: [{ label: "Home", src: jvPage, alt: "The full JV Copilot landing page" }],
  },
  {
    slug: "koms",
    title: "KOMS",
    summary: "Site for a small-batch ski outerwear brand, built around one drop a season.",
    description: [
      "KOMS is my brother's outerwear brand — snowpants and tuques, made to order in small batches. The site is meant to feel like a clothing brand rather than a shop: big condensed type, photography first, and a presale flow that stays out of the way.",
      "It covers the home page, a lookbook, product pages with add-ons and a size guide, and a reservation flow for the current drop. It hasn't launched yet, and the photography is placeholder until the season shoot.",
    ],
    year: "2026",
    role: "Design and development",
    status: "Unreleased",
    stack: ["Astro"],
    cover: { src: komsCover, alt: "KOMS home page, a snowboarder in a cloud of powder under the line Made for snow" },
    mobile: { src: komsMobile, alt: "KOMS home page on a phone" },
    pages: [
      { label: "Home", src: komsPage, alt: "The full KOMS home page" },
      { label: "Product", src: komsProduct, alt: "KOMS product page for The Snowpant" },
      { label: "Lookbook", src: komsLookbook, alt: "KOMS lookbook page" },
    ],
  },
];
