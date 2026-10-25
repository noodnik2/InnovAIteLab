import { describe, expect, it, vi } from 'vitest';
import { SonosService, toPlayState, type ServiceDeps } from '../src/service.js';
import { fakeGateway, groups, kitchen, living, playback } from './fakes.js';

function setup(options: { gateway?: ReturnType<typeof fakeGateway>; config?: ServiceDeps['config']; catalog?: ServiceDeps['searchCatalog'] } = {}) {
  const gateway = options.gateway ?? fakeGateway();
  const searchCatalog = vi.fn(options.catalog ?? (async () => []));
  const service = new SonosService(gateway, { config: options.config ?? {}, searchCatalog });
  return { gateway, searchCatalog, service };
}

const radio = 'x-sonosapi-stream:s24889?sid=254&flags=8224&sn=0';

describe('toPlayState', () => {
  it('maps UPnP states', () => {
    expect(toPlayState('PLAYING')).toBe('playing');
    expect(toPlayState('PAUSED_PLAYBACK')).toBe('paused');
    expect(toPlayState('NO_MEDIA_PRESENT')).toBe('stopped');
    expect(toPlayState('TRANSITIONING')).toBe('transitioning');
    expect(toPlayState('WEIRD')).toBe('unknown');
  });
});

describe('listRooms', () => {
  it('lists rooms with members', async () => {
    const { service } = setup();
    expect(await service.listRooms()).toEqual([
      { room: 'Kitchen', members: ['Kitchen', 'Office'], host: '10.0.0.2' },
      { room: 'Living Room', members: ['Living Room'], host: '10.0.0.3' },
    ]);
  });
});

describe('resolveGroup', () => {
  it('matches rooms exactly, by member, and by unique partial name (case-insensitive)', async () => {
    const { service } = setup();
    expect((await service.resolveGroup(' living room ')).name).toBe('Living Room');
    expect((await service.resolveGroup('office')).name).toBe('Kitchen');
    expect((await service.resolveGroup('kitch')).name).toBe('Kitchen');
  });

  it('rejects unknown and ambiguous names', async () => {
    const { service } = setup();
    await expect(service.resolveGroup('Garage')).rejects.toThrow('Unknown room "Garage". Rooms: Kitchen, Living Room.');
    await expect(service.resolveGroup('i')).rejects.toThrow('Room "i" is ambiguous');
  });

  it('uses the configured default room', async () => {
    const { service } = setup({ config: { defaultRoom: 'Living Room' } });
    expect((await service.resolveGroup()).name).toBe('Living Room');
  });

  it('uses the only room, or the only playing room', async () => {
    const single = fakeGateway();
    single.getGroups.mockResolvedValue([groups[0]]);
    expect((await setup({ gateway: single }).service.resolveGroup()).name).toBe('Kitchen');

    const gateway = fakeGateway({ [living.host]: playback({ state: 'PLAYING' }) });
    expect((await setup({ gateway }).service.resolveGroup()).name).toBe('Living Room');
  });

  it('asks for a room when ambiguous', async () => {
    await expect(setup().service.resolveGroup()).rejects.toThrow('Please specify a room (nothing is playing). Rooms: Kitchen, Living Room.');
    const both = fakeGateway({ [living.host]: playback({ state: 'PLAYING' }), [kitchen.host]: playback({ state: 'PLAYING' }) });
    await expect(setup({ gateway: both }).service.resolveGroup()).rejects.toThrow('several rooms are playing');
  });

  it('fails when no players exist', async () => {
    const gateway = fakeGateway();
    gateway.getGroups.mockResolvedValue([]);
    await expect(setup({ gateway }).service.resolveGroup('Kitchen')).rejects.toThrow('No Sonos players found');
  });
});

describe('nowPlaying', () => {
  it('reports every room', async () => {
    const gateway = fakeGateway({ [living.host]: playback({ state: 'PLAYING', sourceUri: radio, track: { title: 'News' } }) });
    const statuses = await setup({ gateway }).service.nowPlaying();
    expect(statuses).toEqual([
      {
        room: 'Kitchen',
        members: ['Kitchen', 'Office'],
        state: 'paused',
        source: 'queue',
        sourceDescription: 'Sonos queue',
        track: playback().track,
        position: '0:01:00',
        queuePosition: 3,
        queueLength: 10,
      },
      {
        room: 'Living Room',
        members: ['Living Room'],
        state: 'playing',
        source: 'radio',
        sourceDescription: 'radio or station',
        track: { title: 'News' },
        position: '0:01:00',
        queuePosition: undefined,
        queueLength: 10,
      },
    ]);
  });

  it('reports one room', async () => {
    const statuses = await setup().service.nowPlaying('Living Room');
    expect(statuses.map((s) => s.room)).toEqual(['Living Room']);
  });
});

describe('stop', () => {
  it('stops playback', async () => {
    const { service, gateway } = setup();
    expect(await service.stop('Kitchen')).toEqual({ room: 'Kitchen', action: 'stopped' });
    expect(gateway.stop).toHaveBeenCalledWith(kitchen);
  });

  it('does nothing when already stopped', async () => {
    const gateway = fakeGateway({ [kitchen.host]: playback({ state: 'STOPPED' }) });
    const { service } = setup({ gateway });
    expect(await service.stop('Kitchen')).toEqual({ room: 'Kitchen', action: 'already-stopped' });
    expect(gateway.stop).not.toHaveBeenCalled();
  });

  it('falls back to pause when stop is rejected', async () => {
    const { service, gateway } = setup();
    gateway.stop.mockRejectedValue(new Error('UPnP 701'));
    expect(await service.stop('Kitchen')).toEqual({ room: 'Kitchen', action: 'paused' });
    expect(gateway.pause).toHaveBeenCalledWith(kitchen);
  });
});

describe('search', () => {
  const library = [
    { Title: '(I Watched Her) Walk Away', Artist: 'Rippingtons', Album: "Welcome to the St. James' Club", TrackUri: 'x-file-cifs://NAS/walk.mp3', ItemId: 'S://NAS/walk.mp3' },
    { Title: 'Walk Away', Artist: 'Someone Else', TrackUri: 'x-file-cifs://NAS/other.mp3' },
    { Title: 'No URI' },
  ];

  it('combines library and Apple Music results, library first', async () => {
    const { service, gateway, searchCatalog } = setup({
      catalog: async () => [{ trackId: 7, title: 'Walk Away', artist: 'X', album: 'Y', durationSeconds: 200 }],
    });
    gateway.searchLibrary.mockResolvedValue(library);
    const { results, warnings } = await service.search('walk away', 'all', 5);
    expect(warnings).toEqual([]);
    expect(results).toEqual([
      { source: 'library', ref: 'x-file-cifs://NAS/walk.mp3', title: '(I Watched Her) Walk Away', artist: 'Rippingtons', album: "Welcome to the St. James' Club" },
      { source: 'library', ref: 'x-file-cifs://NAS/other.mp3', title: 'Walk Away', artist: 'Someone Else', album: undefined },
      { source: 'apple-music', ref: 'apple:song:7', title: 'Walk Away', artist: 'X', album: 'Y', durationSeconds: 200 },
    ]);
    expect(gateway.searchLibrary).toHaveBeenCalledWith('walk away', 5);
    expect(searchCatalog).toHaveBeenCalledWith('walk away', 5);
  });

  it('retries the library with trailing words used as artist/album filters', async () => {
    const { service, gateway } = setup();
    gateway.searchLibrary.mockImplementation(async (q: string) => (q === 'walk away' ? library : []));
    const { results } = await service.search('walk away rippingtons', 'library', 3);
    expect(results.map((r) => r.ref)).toEqual(['x-file-cifs://NAS/walk.mp3']);
    expect(gateway.searchLibrary.mock.calls).toEqual([
      ['walk away rippingtons', 3],
      ['walk away', 15],
    ]);
  });

  it('returns nothing when no library prefix matches', async () => {
    const { service, gateway } = setup();
    expect((await service.search('zzz yyy', 'library')).results).toEqual([]);
    expect(gateway.searchLibrary).toHaveBeenCalledTimes(2);
  });

  it('honours the source filter', async () => {
    const { service, gateway, searchCatalog } = setup();
    await service.search('x', 'apple-music');
    expect(gateway.searchLibrary).not.toHaveBeenCalled();
    await service.search('x', 'library');
    expect(searchCatalog).toHaveBeenCalledTimes(1);
  });

  it('reports failures as warnings', async () => {
    const { service, gateway } = setup({ catalog: async () => Promise.reject(new Error('offline')) });
    gateway.searchLibrary.mockRejectedValue('no library');
    const outcome = await service.search('x');
    expect(outcome).toEqual({
      results: [],
      warnings: expect.arrayContaining(['Music library search failed: no library', 'Apple Music search failed: offline']),
    });
  });
});

describe('addToQueue', () => {
  const appleCatalog = async () => [{ trackId: 158617575, title: 'Piano Man', artist: 'Billy Joel', album: 'Piano Man' }];

  it('appends an Apple Music song using metadata from the search', async () => {
    const { service, gateway } = setup({ catalog: appleCatalog });
    await service.search('piano man', 'apple-music');
    const outcome = await service.addToQueue('apple:song:158617575', { room: 'Kitchen' });

    expect(outcome).toEqual({ room: 'Kitchen', title: 'Piano Man', queuePosition: 4, queueLength: 11, playingNow: false });
    const [player, request] = gateway.enqueue.mock.calls[0]!;
    expect(player).toEqual(kitchen);
    expect(request).toMatchObject({ uri: 'x-sonos-http:song:158617575.mp4?sid=204&flags=8224&sn=20', position: 0, asNext: false });
    expect(request.metadata).toContain('<item id="10032020song%3a158617575" restricted="true">');
    expect(request.metadata).toContain('<dc:creator>Billy Joel</dc:creator>');
    expect(request.metadata).toContain('SA_RINCON52231_X_#Svc52231-0-Token');
  });

  it('uses the configured Apple Music serial without probing', async () => {
    const { service, gateway } = setup({ config: { appleMusicSerial: 6 } });
    await service.addToQueue('apple:song:1', { room: 'Kitchen', title: 'T' });
    expect(gateway.enqueue.mock.calls[0]![1].uri).toContain('sn=6');
    expect(gateway.getQueueUris).not.toHaveBeenCalled();
  });

  it('detects the serial from the queue, then favorites, and caches it', async () => {
    const quiet = playback({ track: undefined });
    const gateway = fakeGateway({ [kitchen.host]: quiet, [living.host]: quiet });
    gateway.getQueueUris.mockRejectedValue(new Error('boom'));
    gateway.getFavoriteUris.mockResolvedValue(['x-sonos-http:song:2.mp4?sid=204&flags=8224&sn=11']);
    const { service } = setup({ gateway });
    await service.addToQueue('apple:song:1', { room: 'Kitchen' });
    await service.addToQueue('apple:song:2', { room: 'Kitchen' });
    expect(gateway.enqueue.mock.calls.map((c) => c[1].uri)).toEqual([
      'x-sonos-http:song:1.mp4?sid=204&flags=8224&sn=11',
      'x-sonos-http:song:2.mp4?sid=204&flags=8224&sn=11',
    ]);
    expect(gateway.getFavoriteUris).toHaveBeenCalledTimes(1);
  });

  it('explains how to fix an undetectable serial', async () => {
    const quiet = playback({ track: undefined });
    const gateway = fakeGateway({ [kitchen.host]: quiet, [living.host]: quiet });
    await expect(setup({ gateway }).service.addToQueue('apple:song:1', { room: 'Kitchen' })).rejects.toThrow(/SONOS_APPLE_MUSIC_SN/);
    expect(gateway.enqueue).not.toHaveBeenCalled();
  });

  it('queues a library track after the current one', async () => {
    const { service, gateway } = setup();
    gateway.searchLibrary.mockResolvedValue([{ Title: "Walk & Talk", TrackUri: 'x-file-cifs://NAS/w.mp3', ItemId: 'S://NAS/w.mp3' }]);
    await service.search('walk', 'library');
    const outcome = await service.addToQueue('x-file-cifs://NAS/w.mp3', { room: 'Kitchen', mode: 'next', artist: 'Override' });
    expect(outcome.playingNow).toBe(false);
    const request = gateway.enqueue.mock.calls[0]![1];
    expect(request).toMatchObject({ uri: 'x-file-cifs://NAS/w.mp3', position: 4, asNext: true });
    expect(request.metadata).toContain('<item id="S://NAS/w.mp3" restricted="true">');
    expect(request.metadata).toContain('<dc:title>Walk &amp; Talk</dc:title>');
    expect(request.metadata).toContain('<dc:creator>Override</dc:creator>');
    expect(request.metadata).toContain('RINCON_AssociatedZPUDN');
  });

  it('plays immediately in "now" mode', async () => {
    const { service, gateway } = setup();
    const outcome = await service.addToQueue('x-file-cifs://NAS/w.mp3', { room: 'Kitchen', mode: 'now' });
    expect(outcome).toMatchObject({ playingNow: true, queuePosition: 4 });
    expect(gateway.switchToQueue).not.toHaveBeenCalled();
    expect(gateway.seekTrack).toHaveBeenCalledWith(kitchen, 4);
    expect(gateway.play).toHaveBeenCalledWith(kitchen);
    expect(gateway.enqueue.mock.calls[0]![1].metadata).toContain('<item id="-1" restricted="true">');
  });

  it('switches to the queue first when playing something else', async () => {
    const gateway = fakeGateway({ [kitchen.host]: playback({ sourceUri: radio }) });
    const { service } = setup({ gateway });
    await service.addToQueue('x-file-cifs://NAS/w.mp3', { room: 'Kitchen', mode: 'now' });
    expect(gateway.switchToQueue).toHaveBeenCalledWith(kitchen);
    expect(gateway.enqueue.mock.calls[0]![1]).toMatchObject({ position: 0, asNext: false });
    expect(gateway.switchToQueue.mock.invocationCallOrder[0]).toBeLessThan(gateway.enqueue.mock.invocationCallOrder[0]!);
  });

  it('warns that queued tracks are inaudible while another source plays', async () => {
    const gateway = fakeGateway({ [kitchen.host]: playback({ sourceUri: radio }) });
    const outcome = await setup({ gateway }).service.addToQueue('x-file-cifs://NAS/w.mp3', { room: 'Kitchen', mode: 'next' });
    expect(outcome.note).toMatch(/playing from radio or station, not its queue/);
    expect(gateway.enqueue.mock.calls[0]![1]).toMatchObject({ position: 0, asNext: false });
  });

  it('rejects references it does not understand', async () => {
    await expect(setup().service.addToQueue('Piano Man', { room: 'Kitchen' })).rejects.toThrow('Unrecognized track reference "Piano Man"');
  });

  it('keeps the result cache bounded', async () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ trackId: i, title: `Song ${i}` }));
    const { service, gateway } = setup({ catalog: async () => many, config: { appleMusicSerial: 1 } });
    await service.search('song', 'apple-music', 50);
    await service.addToQueue('apple:song:0', { room: 'Kitchen' });
    await service.addToQueue('apple:song:500', { room: 'Kitchen' });
    const metadata = gateway.enqueue.mock.calls.map((c) => c[1].metadata);
    expect(metadata[0]).not.toContain('<dc:title>'); // evicted
    expect(metadata[1]).toContain('<dc:title>Song 500</dc:title>');
  });
});
