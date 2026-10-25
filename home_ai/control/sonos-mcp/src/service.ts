import type { Track } from '@svrooij/sonos/lib/models/index.js';
import type { Config } from './config.js';
import type { CatalogSong } from './search/itunes.js';
import { APPLE_MUSIC_CDUDN, LOCAL_CDUDN, buildTrackDidl } from './sonos/didl.js';
import type { PlaybackInfo, SonosGateway, TrackInfo, ZoneGroupInfo } from './sonos/gateway.js';
import {
  APPLE_MUSIC_SID,
  appleSongRef,
  appleSongTrackUri,
  classifySource,
  describeSource,
  detectServiceSerial,
  parseAppleSongRef,
  type SourceKind,
} from './sonos/uris.js';

export type SearchSource = 'library' | 'apple-music' | 'all';
export type QueueMode = 'end' | 'next' | 'now';
export type PlayState = 'playing' | 'paused' | 'stopped' | 'transitioning' | 'unknown';

export interface Room {
  room: string;
  members: string[];
  host: string;
}

export interface RoomStatus {
  room: string;
  members: string[];
  state: PlayState;
  source: SourceKind;
  sourceDescription: string;
  track?: TrackInfo;
  position?: string;
  queuePosition?: number;
  queueLength: number;
}

export interface SearchResult {
  source: 'library' | 'apple-music';
  /** Pass this to `sonos_add_to_queue`. */
  ref: string;
  title: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
}

export interface SearchOutcome {
  results: SearchResult[];
  warnings: string[];
}

export interface StopOutcome {
  room: string;
  action: 'stopped' | 'paused' | 'already-stopped';
}

export interface AddOutcome {
  room: string;
  title?: string;
  queuePosition: number;
  queueLength: number;
  playingNow: boolean;
  note?: string;
}

export interface TrackHints {
  title?: string;
  artist?: string;
  album?: string;
}

export interface ServiceDeps {
  config: Pick<Config, 'defaultRoom' | 'appleMusicSerial'>;
  searchCatalog: (query: string, limit: number) => Promise<CatalogSong[]>;
}

interface CachedItem extends SearchResult {
  itemId?: string;
}

const RESULT_CACHE_LIMIT = 500;

const STATE_MAP: Record<string, PlayState> = {
  PLAYING: 'playing',
  PAUSED_PLAYBACK: 'paused',
  STOPPED: 'stopped',
  NO_MEDIA_PRESENT: 'stopped',
  TRANSITIONING: 'transitioning',
};

export function toPlayState(state: string): PlayState {
  return STATE_MAP[state] ?? 'unknown';
}

const normalize = (s: string): string => s.trim().toLocaleLowerCase();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class SonosService {
  private readonly cache = new Map<string, CachedItem>();
  private appleSerial?: number;

  constructor(
    private readonly gateway: SonosGateway,
    private readonly deps: ServiceDeps,
  ) {
    this.appleSerial = deps.config.appleMusicSerial;
  }

  async listRooms(): Promise<Room[]> {
    const groups = await this.gateway.getGroups();
    return groups.map((g) => ({ room: g.name, members: g.members, host: g.coordinator.host }));
  }

  /** Find the group a room name refers to; with no name, pick a sensible default. */
  async resolveGroup(room?: string): Promise<ZoneGroupInfo> {
    const groups = await this.gateway.getGroups();
    if (groups.length === 0) throw new Error('No Sonos players found on the network.');
    const wanted = room ?? this.deps.config.defaultRoom;
    if (wanted !== undefined) return this.matchGroup(groups, wanted);
    if (groups.length === 1) return groups[0]!;

    const states = await Promise.all(groups.map(async (g) => toPlayState((await this.gateway.getPlayback(g.coordinator)).state)));
    const playing = groups.filter((_, i) => states[i] === 'playing');
    if (playing.length === 1) return playing[0]!;
    throw new Error(
      `Please specify a room (${playing.length === 0 ? 'nothing is playing' : 'several rooms are playing'}). ` +
        `Rooms: ${groups.map((g) => g.name).join(', ')}.`,
    );
  }

  private matchGroup(groups: ZoneGroupInfo[], room: string): ZoneGroupInfo {
    const target = normalize(room);
    const names = (g: ZoneGroupInfo): string[] => [g.name, ...g.members].map(normalize);
    const exact = groups.find((g) => names(g).includes(target));
    if (exact) return exact;
    const partial = groups.filter((g) => names(g).some((n) => n.includes(target)));
    if (partial.length === 1) return partial[0]!;
    const known = groups.map((g) => g.name).join(', ');
    throw new Error(
      partial.length > 1 ? `Room "${room}" is ambiguous. Rooms: ${known}.` : `Unknown room "${room}". Rooms: ${known}.`,
    );
  }

  async nowPlaying(room?: string): Promise<RoomStatus[]> {
    const groups = room !== undefined ? [await this.resolveGroup(room)] : await this.gateway.getGroups();
    return Promise.all(groups.map(async (g) => this.status(g, await this.gateway.getPlayback(g.coordinator))));
  }

  private status(group: ZoneGroupInfo, playback: PlaybackInfo): RoomStatus {
    const source = classifySource(playback.sourceUri);
    return {
      room: group.name,
      members: group.members,
      state: toPlayState(playback.state),
      source,
      sourceDescription: describeSource(source),
      track: playback.track,
      position: playback.position,
      queuePosition: source === 'queue' ? playback.trackNumber : undefined,
      queueLength: playback.queueLength,
    };
  }

  async stop(room?: string): Promise<StopOutcome> {
    const group = await this.resolveGroup(room);
    const { state } = await this.gateway.getPlayback(group.coordinator);
    if (toPlayState(state) === 'stopped') return { room: group.name, action: 'already-stopped' };
    try {
      await this.gateway.stop(group.coordinator);
      return { room: group.name, action: 'stopped' };
    } catch {
      // Some sources (radio, line-in, app streams) reject Stop with UPnP 701; Pause works there.
      await this.gateway.pause(group.coordinator);
      return { room: group.name, action: 'paused' };
    }
  }

  async search(query: string, source: SearchSource = 'all', limit = 10): Promise<SearchOutcome> {
    const outcome: SearchOutcome = { results: [], warnings: [] };
    const tasks: Array<Promise<void>> = [];

    if (source === 'library' || source === 'all') {
      tasks.push(
        this.searchLibrary(query, limit).then(
          (tracks) => {
            for (const t of tracks) {
              if (!t.TrackUri) continue;
              outcome.results.push(
                this.remember({ source: 'library', ref: t.TrackUri, title: t.Title ?? t.TrackUri, artist: t.Artist, album: t.Album, itemId: t.ItemId }),
              );
            }
          },
          (err: unknown) => void outcome.warnings.push(`Music library search failed: ${errorMessage(err)}`),
        ),
      );
    }
    if (source === 'apple-music' || source === 'all') {
      tasks.push(
        this.deps.searchCatalog(query, limit).then(
          (songs) => {
            for (const s of songs) {
              outcome.results.push(
                this.remember({
                  source: 'apple-music',
                  ref: appleSongRef(s.trackId),
                  title: s.title,
                  artist: s.artist,
                  album: s.album,
                  durationSeconds: s.durationSeconds,
                }),
              );
            }
          },
          (err: unknown) => void outcome.warnings.push(`Apple Music search failed: ${errorMessage(err)}`),
        ),
      );
    }
    await Promise.all(tasks);
    // Library hits first: they're local and need no streaming account.
    outcome.results.sort((a, b) => (a.source === b.source ? 0 : a.source === 'library' ? -1 : 1));
    return outcome;
  }

  /**
   * Sonos library search only matches track titles, so for "walk away rippingtons" retry
   * with trailing words dropped and use those words to filter on artist/album instead.
   */
  private async searchLibrary(query: string, limit: number): Promise<Track[]> {
    const words = query.trim().split(/\s+/);
    for (let n = words.length; n >= 1; n--) {
      const rest = words.slice(n).map(normalize);
      const tracks = await this.gateway.searchLibrary(words.slice(0, n).join(' '), rest.length ? limit * 5 : limit);
      const matches = tracks.filter((t) => {
        const context = normalize(`${t.Artist ?? ''} ${t.Album ?? ''}`);
        return rest.every((w) => context.includes(w));
      });
      if (matches.length) return matches.slice(0, limit);
    }
    return [];
  }

  private remember(item: CachedItem): SearchResult {
    this.cache.delete(item.ref);
    this.cache.set(item.ref, item);
    if (this.cache.size > RESULT_CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value!);
    const { itemId: _itemId, ...result } = item;
    return result;
  }

  async addToQueue(ref: string, options: { room?: string; mode?: QueueMode } & TrackHints = {}): Promise<AddOutcome> {
    const mode = options.mode ?? 'end';
    const group = await this.resolveGroup(options.room);
    const player = group.coordinator;
    const cached = this.cache.get(ref);
    const hints: TrackHints = {
      title: options.title ?? cached?.title,
      artist: options.artist ?? cached?.artist,
      album: options.album ?? cached?.album,
    };
    const { uri, metadata } = await this.resolveTrack(ref, player, hints, cached?.itemId);

    const playback = await this.gateway.getPlayback(player);
    const source = classifySource(playback.sourceUri);
    const onQueue = source === 'queue';

    if (mode === 'now' && !onQueue) await this.gateway.switchToQueue(player);
    const insertNext = mode !== 'end' && onQueue;
    const added = await this.gateway.enqueue(player, {
      uri,
      metadata,
      position: insertNext ? playback.trackNumber + 1 : 0,
      asNext: insertNext,
    });

    const outcome: AddOutcome = {
      room: group.name,
      title: hints.title,
      queuePosition: added.firstTrackNumber,
      queueLength: added.queueLength,
      playingNow: false,
    };
    if (mode === 'now') {
      await this.gateway.seekTrack(player, added.firstTrackNumber);
      await this.gateway.play(player);
      outcome.playingNow = true;
    } else if (!onQueue) {
      outcome.note =
        `${group.name} is playing from ${describeSource(source)}, not its queue, so this track ` +
        `won't be heard until playback switches to the queue (use mode "now" to switch and play it).`;
    }
    return outcome;
  }

  private async resolveTrack(
    ref: string,
    player: ZoneGroupInfo['coordinator'],
    hints: TrackHints,
    itemId: string | undefined,
  ): Promise<{ uri: string; metadata: string }> {
    const appleId = parseAppleSongRef(ref);
    if (appleId !== undefined) {
      const serial = await this.appleMusicSerial(player);
      return {
        uri: appleSongTrackUri(appleId, serial),
        metadata: buildTrackDidl({ itemId: `10032020song%3a${appleId}`, ...hints, cdudn: APPLE_MUSIC_CDUDN }),
      };
    }
    if (!/^[a-z][a-z0-9+.-]*:\S/i.test(ref)) {
      throw new Error(`Unrecognized track reference "${ref}". Use a "ref" returned by sonos_search.`);
    }
    return { uri: ref, metadata: buildTrackDidl({ itemId: itemId ?? '-1', ...hints, cdudn: LOCAL_CDUDN }) };
  }

  /** Apple Music URIs need the household's account serial; learn it from what's already playing. */
  private async appleMusicSerial(player: ZoneGroupInfo['coordinator']): Promise<number> {
    if (this.appleSerial !== undefined) return this.appleSerial;
    const sources: Array<() => Promise<Array<string | undefined>>> = [
      async () => {
        const groups = await this.gateway.getGroups();
        const playbacks = await Promise.all(groups.map((g) => this.gateway.getPlayback(g.coordinator)));
        return playbacks.flatMap((p) => [p.track?.uri, p.sourceUri]);
      },
      () => this.gateway.getQueueUris(player),
      () => this.gateway.getFavoriteUris(),
    ];
    for (const load of sources) {
      const serial = detectServiceSerial(await load().catch(() => []), APPLE_MUSIC_SID);
      if (serial !== undefined) return (this.appleSerial = serial);
    }
    throw new Error(
      'Could not determine the Apple Music account on this Sonos system. Play any Apple Music song once, ' +
        'or set SONOS_APPLE_MUSIC_SN to the "sn=" value from an Apple Music track URI.',
    );
  }
}
