/**
 * WordPress REST API client. Used at BUILD TIME only (static output) to pull
 * all content from the headless WordPress at `WP_API_URL`. No client-side calls.
 */

const API = import.meta.env.WP_API_URL;

if (!API) {
  throw new Error(
    'WP_API_URL is not set. Copy .env.example to .env and fill it in.',
  );
}

/** Minimal shape of a WP post/page we rely on. Extend as Phases need more. */
export interface WpEntity {
  id: number;
  slug: string;
  link: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  /** Raw Yoast <head> markup — injected verbatim for SEO parity in Phase 5. */
  yoast_head?: string;
  yoast_head_json?: Record<string, unknown>;
  _embedded?: Record<string, unknown>;
}

/** Fetch one JSON page from the WP REST API with clear build-time errors. */
async function getJson<T>(path: string): Promise<{ data: T; totalPages: number }> {
  const url = `${API}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WP API ${res.status} ${res.statusText} for ${url}`);
  }
  const totalPages = Number(res.headers.get('x-wp-totalpages') ?? '1');
  return { data: (await res.json()) as T, totalPages };
}

/** Fetch every item of a collection, walking pagination. */
async function getAll<T>(collection: 'posts' | 'pages'): Promise<T[]> {
  const perPage = 100;
  const first = await getJson<T[]>(`/${collection}?per_page=${perPage}&page=1&_embed`);
  const all = [...first.data];
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await getJson<T[]>(
      `/${collection}?per_page=${perPage}&page=${page}&_embed`,
    );
    all.push(...next.data);
  }
  return all;
}

export const getAllPosts = () => getAll<WpEntity>('posts');
export const getAllPages = () => getAll<WpEntity>('pages');

/** Lightweight connectivity check used by the build smoke test. */
export async function wpHealthCheck(): Promise<{ posts: number; pages: number }> {
  const p = await getJson<unknown[]>('/posts?per_page=1');
  const g = await getJson<unknown[]>('/pages?per_page=1');
  return { posts: p.totalPages, pages: g.totalPages };
}
