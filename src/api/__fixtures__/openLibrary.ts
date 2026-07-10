// Fixtures trimmed from LIVE Open Library responses captured 2026-07-10.
// If the upstream shape drifts, these are the blessed reference payloads.

export const searchResponseFixture = {
  numFound: 1728130,
  start: 0,
  numFoundExact: true,
  docs: [
    {
      author_name: ['Jorge Luis Borges'],
      cover_i: 10832290,
      first_publish_year: 1945,
      key: '/works/OL110971W',
      title: 'Ficciones',
    },
    {
      // No cover_i and no author_name — both really occur in live data.
      first_publish_year: 1980,
      key: '/works/OL59681W',
      title: 'Great Sf Heinlein Bxs',
    },
  ],
};

export const workFixture = {
  key: '/works/OL110971W',
  title: 'Ficciones',
  description: {
    type: '/type/text',
    value: 'A collection of short stories in which Borges often uses the labyrinth as a motif.',
  },
  covers: [10832290, 4667891],
  subjects: ['Argentine Short stories', 'Translations into English'],
  authors: [{ author: { key: '/authors/OL4327046A' } }],
};

export const workStringDescriptionFixture = {
  key: '/works/OL999W',
  title: 'Plain Description',
  description: 'Just a string, straight from the wire.',
};

// Captured live: /works/OL45883W redirects to /works/OL45804W.
export const redirectWorkFixture = {
  key: '/works/OL45883W',
  type: { key: '/type/redirect' },
  location: '/works/OL45804W',
};

export const authorFixture = { name: 'Jorge Luis Borges' };
