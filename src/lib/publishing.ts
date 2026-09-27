export function isPublished(entry: { data: Record<string, any> }, now = new Date()) {
  const d = entry.data;
  if (d.draft || (d.status && d.status !== 'published')) return false;
  const scheduled = d.publishAt || d.date;
  return !scheduled || (!Number.isNaN(new Date(scheduled).getTime()) && new Date(scheduled) <= now);
}

export const siteOrigin = 'https://www.mteng.ltd';
export const canonicalPath = (p: string) => p === '/' ? '/' : `${p.replace(/\/+$/, '')}/`;
export const absolute = (p: string) => new URL(p, siteOrigin).href;
export const entrySlug = (entry: { id: string; data: Record<string, any> }) => entry.data.slug || entry.id;
export const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
export function publicDocument(d: Record<string, any>) {
  return d.visibility === 'public' && d.status === 'current' && d.number && d.date && d.scope &&
    (!d.expiry || new Date(d.expiry) >= new Date()) && (d.url || d.file);
}
