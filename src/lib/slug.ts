export function toSlug(name: string, id: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îí]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${id}`;
}

export function idFromSlug(slug: string): number {
  const parts = slug.split('-');
  return parseInt(parts[parts.length - 1], 10);
}
