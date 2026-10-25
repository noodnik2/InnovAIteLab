import { vi } from 'vitest';
import type { PlaybackInfo, PlayerRef, SonosGateway, ZoneGroupInfo } from '../src/sonos/gateway.js';

export const kitchen: PlayerRef = { host: '10.0.0.2', port: 1400, uuid: 'RINCON_K', name: 'Kitchen' };
export const living: PlayerRef = { host: '10.0.0.3', port: 1400, uuid: 'RINCON_L', name: 'Living Room' };

export const groups: ZoneGroupInfo[] = [
  { id: 'gk', name: 'Kitchen', coordinator: kitchen, members: ['Kitchen', 'Office'] },
  { id: 'gl', name: 'Living Room', coordinator: living, members: ['Living Room'] },
];

export function playback(overrides: Partial<PlaybackInfo> = {}): PlaybackInfo {
  return {
    state: 'PAUSED_PLAYBACK',
    sourceUri: 'x-rincon-queue:RINCON_K#0',
    track: { title: 'Piano Man', artist: 'Billy Joel', album: 'Piano Man', duration: '0:05:36', uri: 'x-sonos-http:song:1.mp4?sid=204&flags=8224&sn=20' },
    trackNumber: 3,
    position: '0:01:00',
    queueLength: 10,
    ...overrides,
  };
}

/** A fully mocked gateway; tweak behaviour per test with `vi.mocked(...)`. */
export function fakeGateway(byHost: Record<string, PlaybackInfo> = {}): SonosGateway & { [K in keyof SonosGateway]: ReturnType<typeof vi.fn> } {
  return {
    getGroups: vi.fn(async () => groups),
    getPlayback: vi.fn(async (p: PlayerRef) => byHost[p.host] ?? playback()),
    getQueueUris: vi.fn(async () => []),
    getFavoriteUris: vi.fn(async () => []),
    searchLibrary: vi.fn(async () => []),
    enqueue: vi.fn(async () => ({ firstTrackNumber: 4, tracksAdded: 1, queueLength: 11 })),
    switchToQueue: vi.fn(async () => undefined),
    seekTrack: vi.fn(async () => undefined),
    play: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    pause: vi.fn(async () => undefined),
  };
}

/** Make `play` leave the room reporting `after` from then on (default: playing queue track 4, the fake enqueue's slot). */
export function onPlay(gateway: ReturnType<typeof fakeGateway>, after: Partial<PlaybackInfo> = { state: 'PLAYING', trackNumber: 4 }): void {
  gateway.play.mockImplementation(async () => {
    gateway.getPlayback.mockResolvedValue(playback(after));
  });
}
