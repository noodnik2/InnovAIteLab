import { describe, expect, it, vi } from 'vitest';
import { searchItunesSongs } from '../src/search/itunes.js';

function fakeFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.fn(async () => ({ ok: init.ok ?? true, status: init.status ?? 200, json: async () => body }) as Response);
}

describe('searchItunesSongs', () => {
  it('builds the request and maps songs', async () => {
    const fetch = fakeFetch({
      resultCount: 3,
      results: [
        {
          kind: 'song',
          trackId: 158617575,
          trackName: 'Piano Man',
          artistName: 'Billy Joel',
          collectionName: 'Piano Man',
          trackTimeMillis: 336_600,
          artworkUrl100: 'http://art',
        },
        { kind: 'music-video', trackId: 2, trackName: 'Video' },
        { wrapperType: 'collection', collectionId: 3 },
      ],
    });
    const songs = await searchItunesSongs('piano man', { limit: 5, country: 'US', fetch });

    const url = (fetch.mock.calls[0] as unknown as [URL])[0];
    expect(url.origin + url.pathname).toBe('https://itunes.apple.com/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      term: 'piano man',
      media: 'music',
      entity: 'song',
      limit: '5',
      country: 'US',
    });
    expect(songs).toEqual([
      { trackId: 158617575, title: 'Piano Man', artist: 'Billy Joel', album: 'Piano Man', durationSeconds: 337, artworkUrl: 'http://art' },
    ]);
  });

  it('accepts songs without optional fields', async () => {
    const songs = await searchItunesSongs('x', { limit: 1, country: 'US', fetch: fakeFetch({ resultCount: 1, results: [{ trackId: 1, trackName: 'T' }] }) });
    expect(songs).toEqual([{ trackId: 1, title: 'T', artist: undefined, album: undefined, durationSeconds: undefined, artworkUrl: undefined }]);
  });

  it('throws on HTTP errors', async () => {
    await expect(searchItunesSongs('x', { limit: 1, country: 'US', fetch: fakeFetch({}, { ok: false, status: 503 }) })).rejects.toThrow(
      'iTunes search failed: HTTP 503',
    );
  });

  it('throws on malformed responses', async () => {
    await expect(searchItunesSongs('x', { limit: 1, country: 'US', fetch: fakeFetch({ nope: true }) })).rejects.toThrow();
  });
});
