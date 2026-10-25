/** Sonos music-service id for Apple Music. */
export const APPLE_MUSIC_SID = 204;
/** Sonos "service type" for Apple Music (sid * 256 + 7), used in DIDL cdudn tokens. */
export const APPLE_MUSIC_SERVICE_TYPE = APPLE_MUSIC_SID * 256 + 7;

export type SourceKind =
  | 'queue'
  | 'grouped'
  | 'app-stream'
  | 'line-in'
  | 'tv'
  | 'radio'
  | 'stream'
  | 'none';

const SOURCE_DESCRIPTIONS: Record<SourceKind, string> = {
  queue: 'Sonos queue',
  grouped: 'following another room (grouped)',
  'app-stream': 'streamed from an app (AirPlay / Spotify Connect)',
  'line-in': 'line-in',
  tv: 'TV / HDMI',
  radio: 'radio or station',
  stream: 'direct stream',
  none: 'nothing loaded',
};

/** Classify what a player is playing from its AVTransport "CurrentURI". */
export function classifySource(uri: string | undefined): SourceKind {
  if (!uri) return 'none';
  if (uri.startsWith('x-rincon-queue:')) return 'queue';
  if (uri.startsWith('x-rincon-stream:')) return 'line-in';
  if (uri.startsWith('x-rincon:')) return 'grouped';
  if (uri.startsWith('x-sonos-vli:')) return 'app-stream';
  if (uri.startsWith('x-sonos-htastream:')) return 'tv';
  if (/^(x-sonosapi-stream|x-sonosapi-radio|x-rincon-mp3radio|aac|x-sonosapi-hls):/.test(uri)) return 'radio';
  return 'stream';
}

export function describeSource(kind: SourceKind): string {
  return SOURCE_DESCRIPTIONS[kind];
}

/** Extract the music-service id ("sid") and account serial ("sn") from a Sonos URI. */
export function serviceParams(uri: string): { sid?: number; sn?: number } {
  const query = uri.split('?')[1];
  if (!query) return {};
  const params = new URLSearchParams(query.replace(/&amp;/g, '&'));
  const num = (key: string): number | undefined => {
    const value = params.get(key);
    return value !== null && /^\d+$/.test(value) ? Number(value) : undefined;
  };
  return { sid: num('sid'), sn: num('sn') };
}

/**
 * Find the account serial Sonos uses for a music service, from URIs the household
 * already plays. URIs are expected in priority order (e.g. current track first).
 */
export function detectServiceSerial(uris: Iterable<string | undefined>, sid: number): number | undefined {
  for (const uri of uris) {
    if (!uri) continue;
    const p = serviceParams(uri);
    if (p.sid === sid && p.sn !== undefined) return p.sn;
  }
  return undefined;
}

const APPLE_REF = /^apple:song:(\d+)$/;

/** The opaque reference this server hands out for Apple Music catalog songs. */
export function appleSongRef(trackId: number | string): string {
  return `apple:song:${trackId}`;
}

export function parseAppleSongRef(ref: string): string | undefined {
  return APPLE_REF.exec(ref)?.[1];
}

export function appleSongTrackUri(trackId: string, serial: number): string {
  return `x-sonos-http:song:${trackId}.mp4?sid=${APPLE_MUSIC_SID}&flags=8224&sn=${serial}`;
}
