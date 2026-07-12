// Raw Open Library response shapes, captured from the live API on 2026-07-10.
// These types describe what the WIRE gives us; the app never touches them
// outside src/api - everything is normalised into the domain Book model.

export interface OLSearchDoc {
  key: string; // "/works/OL110971W"
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  ratings_average?: number; // sparse; unused under D2 (hash synthesis)
}

export interface OLSearchResponse {
  numFound: number;
  start: number;
  docs: OLSearchDoc[];
}

// Live API returns description as a plain string OR {type:'/type/text', value}.
export type OLWorkDescription = string | { type?: string; value: string };

export interface OLWorkAuthorRef {
  author?: { key?: string }; // "/authors/OL4327046A"
}

export interface OLWork {
  key: string;
  title: string;
  description?: OLWorkDescription;
  covers?: number[];
  subjects?: string[];
  authors?: OLWorkAuthorRef[];
  // Present when the work is a redirect stub: type.key === '/type/redirect'.
  type?: { key?: string };
  location?: string;
}

export interface OLAuthor {
  name?: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function isOLSearchResponse(x: unknown): x is OLSearchResponse {
  return (
    isRecord(x) &&
    typeof x.numFound === 'number' &&
    Array.isArray(x.docs) &&
    x.docs.every((d) => isRecord(d) && typeof d.key === 'string' && typeof d.title === 'string')
  );
}

export function isOLWork(x: unknown): x is OLWork {
  if (!isRecord(x) || typeof x.key !== 'string') return false;
  // A redirect stub has no title; a real work must have one.
  const isRedirectStub =
    isRecord(x.type) && x.type.key === '/type/redirect' && typeof x.location === 'string';
  return isRedirectStub || typeof x.title === 'string';
}

export function isRedirect(work: OLWork): boolean {
  return work.type?.key === '/type/redirect' && typeof work.location === 'string';
}

export function isOLAuthor(x: unknown): x is OLAuthor {
  return typeof x === 'object' && x !== null;
}
