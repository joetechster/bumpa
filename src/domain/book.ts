import { priceKoboForBook, ratingForBook } from './price';
import type { OLSearchDoc, OLWork } from '../api/upstream';

// The internal domain model. Upstream (Open Library) shapes never leave
// src/api - this decoupling is deliberate: swapping the book API rewrites the
// normalisers below and nothing else.

export interface Book {
  id: string; // "OL110971W" - the works key without the "/works/" prefix
  title: string;
  authors: string[];
  coverUrl: string | null; // null → UI renders a placeholder, never undefined
  firstPublishYear: number | null;
  priceKobo: number; // synthesised, integer kobo (D2)
  rating: number; // synthesised, 3.0–5.0 (D2)
}

export interface BookDetails extends Book {
  description: string | null;
  subjects: string[];
}

export function workIdFromKey(key: string): string {
  return key.replace(/^\/works\//, '');
}

export function coverUrlFromId(coverId: number | undefined, size: 'M' | 'L'): string | null {
  return coverId === undefined ? null : `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function bookFromSearchDoc(doc: OLSearchDoc): Book {
  const id = workIdFromKey(doc.key);
  return {
    id,
    title: doc.title,
    authors: doc.author_name ?? [],
    coverUrl: coverUrlFromId(doc.cover_i, 'M'),
    firstPublishYear: doc.first_publish_year ?? null,
    priceKobo: priceKoboForBook(id),
    rating: ratingForBook(id),
  };
}

// Live API returns description as string | {value} | absent.
function normaliseDescription(description: OLWork['description']): string | null {
  if (description === undefined) return null;
  if (typeof description === 'string') return description;
  return typeof description.value === 'string' ? description.value : null;
}

export function bookDetailsFromWork(work: OLWork, authorNames: string[]): BookDetails {
  const id = workIdFromKey(work.key);
  return {
    id,
    title: work.title,
    authors: authorNames,
    coverUrl: coverUrlFromId(work.covers?.[0], 'L'),
    firstPublishYear: null,
    priceKobo: priceKoboForBook(id),
    rating: ratingForBook(id),
    description: normaliseDescription(work.description),
    subjects: work.subjects ?? [],
  };
}
