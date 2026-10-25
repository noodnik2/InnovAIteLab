import type { BrowseResponse, Track, ZoneGroup } from '@svrooij/sonos/lib/models/index.js';
import { encodeXml } from './didl.js';

/** Address of one Sonos player. */
export interface PlayerRef {
  host: string;
  port: number;
  uuid: string;
  name: string;
}

export interface ZoneGroupInfo {
  id: string;
  /** Room name of the coordinator, e.g. "Living Room". */
  name: string;
  coordinator: PlayerRef;
  /** Visible member rooms (bonded subs/surrounds are omitted). */
  members: string[];
}

export interface TrackInfo {
  title?: string;
  artist?: string;
  album?: string;
  duration?: string;
  uri?: string;
}

export interface PlaybackInfo {
  /** Raw UPnP transport state, e.g. PLAYING, PAUSED_PLAYBACK, STOPPED, TRANSITIONING. */
  state: string;
  /** AVTransport CurrentURI: tells queue vs. radio vs. app stream. */
  sourceUri: string;
  track?: TrackInfo;
  /** 1-based position in the queue (meaningful only when playing from the queue). */
  trackNumber: number;
  position?: string;
  queueLength: number;
}

export interface EnqueueRequest {
  uri: string;
  metadata: string;
  /** 1-based position to insert at; 0 appends to the end. */
  position: number;
  asNext: boolean;
}

export interface EnqueueResult {
  firstTrackNumber: number;
  tracksAdded: number;
  queueLength: number;
}

export interface SonosGateway {
  getGroups(): Promise<ZoneGroupInfo[]>;
  getPlayback(player: PlayerRef): Promise<PlaybackInfo>;
  getQueueUris(player: PlayerRef): Promise<string[]>;
  getFavoriteUris(): Promise<string[]>;
  searchLibrary(query: string, limit: number): Promise<Track[]>;
  enqueue(player: PlayerRef, request: EnqueueRequest): Promise<EnqueueResult>;
  switchToQueue(player: PlayerRef): Promise<void>;
  seekTrack(player: PlayerRef, trackNumber: number): Promise<void>;
  play(player: PlayerRef): Promise<void>;
  stop(player: PlayerRef): Promise<void>;
  pause(player: PlayerRef): Promise<void>;
}

/** The subset of `SonosDevice` this server relies on (keeps the adapter testable). */
export interface DeviceLike {
  GetZoneGroupState(): Promise<ZoneGroup[]>;
  GetFavorites(): Promise<BrowseResponse>;
  GetQueue(): Promise<BrowseResponse>;
  SwitchToQueue(): Promise<boolean>;
  SeekTrack(trackNr: number): Promise<boolean>;
  Play(): Promise<boolean>;
  Stop(): Promise<boolean>;
  Pause(): Promise<boolean>;
  AVTransportService: {
    GetTransportInfo(): Promise<{ CurrentTransportState: string }>;
    GetMediaInfo(): Promise<{ CurrentURI: string; NrTracks: number }>;
    GetPositionInfo(): Promise<{ Track: number; TrackMetaData: Track | string; TrackURI: string; RelTime: string; TrackDuration: string }>;
    AddURIToQueue(input: {
      InstanceID: number;
      EnqueuedURI: string;
      EnqueuedURIMetaData: Track | string;
      DesiredFirstTrackNumberEnqueued: number;
      EnqueueAsNext: boolean;
    }): Promise<{ FirstTrackNumberEnqueued: number; NumTracksAdded: number; NewQueueLength: number }>;
  };
  ContentDirectoryService: {
    BrowseParsed(input: {
      ObjectID: string;
      BrowseFlag: string;
      Filter: string;
      StartingIndex: number;
      RequestedCount: number;
      SortCriteria: string;
    }): Promise<BrowseResponse>;
  };
}

export type DeviceFactory = (host: string, port: number, uuid?: string, name?: string) => DeviceLike;
export type SeedResolver = () => Promise<{ host: string; port: number }>;

export function browseTracks(response: BrowseResponse): Track[] {
  const { Result } = response;
  if (Array.isArray(Result)) return Result;
  // A single match may be returned as a bare object; an empty result as a string.
  if (Result !== null && typeof Result === 'object') return [Result as Track];
  return [];
}

function toTrackInfo(metadata: Track | string, uri: string, duration: string): TrackInfo | undefined {
  if (typeof metadata === 'string') return uri ? { uri } : undefined;
  return {
    title: metadata.Title,
    artist: metadata.Artist,
    album: metadata.Album,
    duration: metadata.Duration ?? (duration && duration !== 'NOT_IMPLEMENTED' ? duration : undefined),
    uri: uri || metadata.TrackUri,
  };
}

/** Talks to real players over UPnP via `@svrooij/sonos`, re-reading topology on every call. */
export class UpnpSonosGateway implements SonosGateway {
  private seed?: Promise<{ host: string; port: number }>;

  constructor(
    private readonly resolveSeed: SeedResolver,
    private readonly createDevice: DeviceFactory,
  ) {}

  private async seedDevice(): Promise<DeviceLike> {
    this.seed ??= this.resolveSeed().catch((err: unknown) => {
      this.seed = undefined; // allow a retry on the next call
      throw err;
    });
    const { host, port } = await this.seed;
    return this.createDevice(host, port);
  }

  private device(player: PlayerRef): DeviceLike {
    return this.createDevice(player.host, player.port, player.uuid, player.name);
  }

  async getGroups(): Promise<ZoneGroupInfo[]> {
    const groups = await (await this.seedDevice()).GetZoneGroupState();
    return groups
      .map((g) => ({
        id: g.groupId,
        name: g.coordinator.name,
        coordinator: { host: g.coordinator.host, port: g.coordinator.port, uuid: g.coordinator.uuid, name: g.coordinator.name },
        members: [...new Set(g.members.filter((m) => !m.Invisible).map((m) => m.name))],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPlayback(player: PlayerRef): Promise<PlaybackInfo> {
    const av = this.device(player).AVTransportService;
    const [transport, media, position] = await Promise.all([av.GetTransportInfo(), av.GetMediaInfo(), av.GetPositionInfo()]);
    return {
      state: transport.CurrentTransportState,
      sourceUri: media.CurrentURI,
      track: toTrackInfo(position.TrackMetaData, position.TrackURI, position.TrackDuration),
      trackNumber: position.Track,
      position: position.RelTime && position.RelTime !== 'NOT_IMPLEMENTED' ? position.RelTime : undefined,
      queueLength: media.NrTracks,
    };
  }

  async getQueueUris(player: PlayerRef): Promise<string[]> {
    return browseTracks(await this.device(player).GetQueue()).flatMap((t) => (t.TrackUri ? [t.TrackUri] : []));
  }

  async getFavoriteUris(): Promise<string[]> {
    return browseTracks(await (await this.seedDevice()).GetFavorites()).flatMap((t) => (t.TrackUri ? [t.TrackUri] : []));
  }

  async searchLibrary(query: string, limit: number): Promise<Track[]> {
    const device = await this.seedDevice();
    const response = await device.ContentDirectoryService.BrowseParsed({
      // @svrooij/sonos inserts plain string arguments into the SOAP body verbatim.
      ObjectID: `A:TRACKS:${encodeXml(query)}`,
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: 0,
      RequestedCount: limit,
      SortCriteria: '',
    });
    return browseTracks(response).slice(0, limit);
  }

  async enqueue(player: PlayerRef, request: EnqueueRequest): Promise<EnqueueResult> {
    const result = await this.device(player).AVTransportService.AddURIToQueue({
      InstanceID: 0,
      EnqueuedURI: request.uri,
      EnqueuedURIMetaData: encodeXml(request.metadata), // sent verbatim by the library, so encode here
      DesiredFirstTrackNumberEnqueued: request.position,
      EnqueueAsNext: request.asNext,
    });
    return {
      firstTrackNumber: result.FirstTrackNumberEnqueued,
      tracksAdded: result.NumTracksAdded,
      queueLength: result.NewQueueLength,
    };
  }

  async switchToQueue(player: PlayerRef): Promise<void> {
    await this.device(player).SwitchToQueue();
  }

  async seekTrack(player: PlayerRef, trackNumber: number): Promise<void> {
    await this.device(player).SeekTrack(trackNumber);
  }

  async play(player: PlayerRef): Promise<void> {
    await this.device(player).Play();
  }

  async stop(player: PlayerRef): Promise<void> {
    await this.device(player).Stop();
  }

  async pause(player: PlayerRef): Promise<void> {
    await this.device(player).Pause();
  }
}
