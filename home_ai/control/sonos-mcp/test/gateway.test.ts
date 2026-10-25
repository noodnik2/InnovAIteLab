import type { ZoneGroup } from '@svrooij/sonos/lib/models/index.js';
import { describe, expect, it, vi } from 'vitest';
import { UpnpSonosGateway, browseTracks, type DeviceLike } from '../src/sonos/gateway.js';

const player = { host: '10.0.0.2', port: 1400, uuid: 'RINCON_B', name: 'Kitchen' };

function member(name: string, host: string, uuid: string, Invisible = false) {
  return { name, host, port: 1400, uuid, Invisible } as ZoneGroup['members'][number];
}

function fakeDevice(): DeviceLike {
  return {
    GetZoneGroupState: vi.fn(async () => [
      {
        groupId: 'g2',
        name: 'Living Room + 1',
        coordinator: member('Living Room', '10.0.0.3', 'RINCON_C'),
        members: [member('Living Room', '10.0.0.30', 'RINCON_C2', true), member('Living Room', '10.0.0.3', 'RINCON_C')],
      },
      {
        groupId: 'g1',
        name: 'Kitchen + 1',
        coordinator: member('Kitchen', '10.0.0.2', 'RINCON_B'),
        members: [member('Kitchen', '10.0.0.2', 'RINCON_B'), member('Office', '10.0.0.4', 'RINCON_D')],
      },
    ]),
    GetFavorites: vi.fn(async () => ({ Result: [{ TrackUri: 'x?sid=204&sn=11' }, { Title: 'Folder' }], NumberReturned: 2, TotalMatches: 2, UpdateID: 1 })),
    GetQueue: vi.fn(async () => ({ Result: { TrackUri: 'x?sid=204&sn=20' } as never, NumberReturned: 1, TotalMatches: 1, UpdateID: 1 })),
    SwitchToQueue: vi.fn(async () => true),
    SeekTrack: vi.fn(async () => true),
    Play: vi.fn(async () => true),
    Stop: vi.fn(async () => true),
    Pause: vi.fn(async () => true),
    AVTransportService: {
      GetTransportInfo: vi.fn(async () => ({ CurrentTransportState: 'PLAYING' })),
      GetMediaInfo: vi.fn(async () => ({ CurrentURI: 'x-rincon-queue:RINCON_B#0', NrTracks: 13 })),
      GetPositionInfo: vi.fn(async () => ({
        Track: 3,
        TrackMetaData: { Title: 'Shanghai Gumbo', Artist: 'Spyro Gyra', Album: 'Rites of Summer' },
        TrackURI: 'x-sonos-http:librarytrack:i.abc.mp4?sid=204&flags=8224&sn=20',
        RelTime: '0:01:00',
        TrackDuration: '0:04:33',
      })),
      AddURIToQueue: vi.fn(async () => ({ FirstTrackNumberEnqueued: 4, NumTracksAdded: 1, NewQueueLength: 14 })),
    },
    ContentDirectoryService: {
      BrowseParsed: vi.fn(async () => ({
        Result: [{ Title: 'A' }, { Title: 'B' }, { Title: 'C' }],
        NumberReturned: 3,
        TotalMatches: 3,
        UpdateID: 1,
      })),
    },
  };
}

function setup() {
  const device = fakeDevice();
  const factory = vi.fn(() => device);
  const seed = vi.fn(async () => ({ host: '10.0.0.1', port: 1400 }));
  return { device, factory, seed, gateway: new UpnpSonosGateway(seed, factory) };
}

describe('browseTracks', () => {
  it('normalizes array, single-object and empty results', () => {
    const base = { NumberReturned: 0, TotalMatches: 0, UpdateID: 0 };
    expect(browseTracks({ ...base, Result: [{ Title: 'a' }] })).toEqual([{ Title: 'a' }]);
    expect(browseTracks({ ...base, Result: { Title: 'a' } as never })).toEqual([{ Title: 'a' }]);
    expect(browseTracks({ ...base, Result: '' })).toEqual([]);
  });
});

describe('UpnpSonosGateway', () => {
  it('maps zone groups, hiding invisible bonded members and sorting by name', async () => {
    const { gateway, factory, seed } = setup();
    const groups = await gateway.getGroups();
    expect(groups).toEqual([
      { id: 'g1', name: 'Kitchen', coordinator: player, members: ['Kitchen', 'Office'] },
      { id: 'g2', name: 'Living Room', coordinator: { host: '10.0.0.3', port: 1400, uuid: 'RINCON_C', name: 'Living Room' }, members: ['Living Room'] },
    ]);
    expect(factory).toHaveBeenCalledWith('10.0.0.1', 1400);
    await gateway.getGroups();
    expect(seed).toHaveBeenCalledTimes(1); // seed resolution is cached
  });

  it('retries seed resolution after a failure', async () => {
    const { device, factory } = setup();
    const seed = vi.fn().mockRejectedValueOnce(new Error('no players')).mockResolvedValue({ host: '10.0.0.1', port: 1400 });
    const gateway = new UpnpSonosGateway(seed, factory);
    await expect(gateway.getGroups()).rejects.toThrow('no players');
    await expect(gateway.getGroups()).resolves.toHaveLength(2);
    expect(device.GetZoneGroupState).toHaveBeenCalledTimes(1);
  });

  it('reads playback from the given player', async () => {
    const { gateway, factory } = setup();
    expect(await gateway.getPlayback(player)).toEqual({
      state: 'PLAYING',
      sourceUri: 'x-rincon-queue:RINCON_B#0',
      track: {
        title: 'Shanghai Gumbo',
        artist: 'Spyro Gyra',
        album: 'Rites of Summer',
        duration: '0:04:33',
        uri: 'x-sonos-http:librarytrack:i.abc.mp4?sid=204&flags=8224&sn=20',
      },
      trackNumber: 3,
      position: '0:01:00',
      queueLength: 13,
    });
    expect(factory).toHaveBeenCalledWith('10.0.0.2', 1400, 'RINCON_B', 'Kitchen');
  });

  it('handles unparsed metadata and unimplemented positions', async () => {
    const { gateway, device } = setup();
    const av = device.AVTransportService;
    vi.mocked(av.GetPositionInfo).mockResolvedValue({ Track: 0, TrackMetaData: '', TrackURI: '', RelTime: 'NOT_IMPLEMENTED', TrackDuration: '' });
    expect(await gateway.getPlayback(player)).toMatchObject({ track: undefined, position: undefined });

    vi.mocked(av.GetPositionInfo).mockResolvedValue({ Track: 0, TrackMetaData: 'raw', TrackURI: 'x-uri', RelTime: '', TrackDuration: '' });
    expect((await gateway.getPlayback(player)).track).toEqual({ uri: 'x-uri' });

    vi.mocked(av.GetPositionInfo).mockResolvedValue({
      Track: 1,
      TrackMetaData: { Title: 'Radio', TrackUri: 'x-meta-uri' },
      TrackURI: '',
      RelTime: '',
      TrackDuration: 'NOT_IMPLEMENTED',
    });
    expect((await gateway.getPlayback(player)).track).toEqual({ title: 'Radio', artist: undefined, album: undefined, duration: undefined, uri: 'x-meta-uri' });
  });

  it('lists queue and favorite URIs', async () => {
    const { gateway } = setup();
    expect(await gateway.getQueueUris(player)).toEqual(['x?sid=204&sn=20']);
    expect(await gateway.getFavoriteUris()).toEqual(['x?sid=204&sn=11']);
  });

  it('searches the library by track title', async () => {
    const { gateway, device } = setup();
    expect(await gateway.searchLibrary('rock & roll', 2)).toEqual([{ Title: 'A' }, { Title: 'B' }]);
    expect(device.ContentDirectoryService.BrowseParsed).toHaveBeenCalledWith({
      ObjectID: 'A:TRACKS:rock &amp; roll',
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: 0,
      RequestedCount: 2,
      SortCriteria: '',
    });
  });

  it('enqueues with the given metadata and position', async () => {
    const { gateway, device } = setup();
    const metadata = '<DIDL-Lite><item id="1"><dc:title>Rock &amp; Roll</dc:title></item></DIDL-Lite>';
    const result = await gateway.enqueue(player, { uri: 'x-uri', metadata, position: 4, asNext: true });
    expect(result).toEqual({ firstTrackNumber: 4, tracksAdded: 1, queueLength: 14 });
    expect(device.AVTransportService.AddURIToQueue).toHaveBeenCalledWith({
      InstanceID: 0,
      EnqueuedURI: 'x-uri',
      EnqueuedURIMetaData: '&lt;DIDL-Lite&gt;&lt;item id=&quot;1&quot;&gt;&lt;dc:title&gt;Rock &amp;amp; Roll&lt;/dc:title&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;',
      DesiredFirstTrackNumberEnqueued: 4,
      EnqueueAsNext: true,
    });
  });

  it('passes transport commands through', async () => {
    const { gateway, device } = setup();
    await gateway.switchToQueue(player);
    await gateway.seekTrack(player, 4);
    await gateway.play(player);
    await gateway.stop(player);
    await gateway.pause(player);
    expect(device.SwitchToQueue).toHaveBeenCalled();
    expect(device.SeekTrack).toHaveBeenCalledWith(4);
    expect(device.Play).toHaveBeenCalled();
    expect(device.Stop).toHaveBeenCalled();
    expect(device.Pause).toHaveBeenCalled();
  });
});
