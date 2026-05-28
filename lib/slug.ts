import { customAlphabet } from "nanoid";

const shortId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 6);

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "podcast";
}

export function makePodcastSlug(title: string): string {
  return `${slugifyTitle(title)}-${shortId()}`;
}
