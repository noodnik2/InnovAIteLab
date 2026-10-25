import { z } from 'zod';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

const ItunesSong = z.object({
  kind: z.string().optional(),
  trackId: z.number(),
  trackName: z.string(),
  artistName: z.string().optional(),
  collectionName: z.string().optional(),
  trackTimeMillis: z.number().optional(),
  artworkUrl100: z.string().optional(),
});

const ItunesResponse = z.object({
  resultCount: z.number(),
  results: z.array(z.unknown()),
});

export interface CatalogSong {
  trackId: number;
  title: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
  artworkUrl?: string;
}

export interface ItunesSearchOptions {
  limit: number;
  country: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Search the public Apple Music / iTunes catalog (no API key needed).
 * Catalog track ids are the same ids Sonos uses for Apple Music songs.
 */
export async function searchItunesSongs(query: string, options: ItunesSearchOptions): Promise<CatalogSong[]> {
  const doFetch = options.fetch ?? fetch;
  const url = new URL(ITUNES_SEARCH_URL);
  url.search = new URLSearchParams({
    term: query,
    media: 'music',
    entity: 'song',
    limit: String(options.limit),
    country: options.country,
  }).toString();

  const response = await doFetch(url, { signal: AbortSignal.timeout(options.timeoutMs ?? 10_000) });
  if (!response.ok) {
    throw new Error(`iTunes search failed: HTTP ${response.status}`);
  }
  const body = ItunesResponse.parse(await response.json());
  return body.results.flatMap((raw) => {
    const song = ItunesSong.safeParse(raw);
    if (!song.success || (song.data.kind !== undefined && song.data.kind !== 'song')) return [];
    const s = song.data;
    return [
      {
        trackId: s.trackId,
        title: s.trackName,
        artist: s.artistName,
        album: s.collectionName,
        durationSeconds: s.trackTimeMillis !== undefined ? Math.round(s.trackTimeMillis / 1000) : undefined,
        artworkUrl: s.artworkUrl100,
      },
    ];
  });
}
