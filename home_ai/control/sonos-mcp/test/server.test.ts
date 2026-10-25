import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer, describeStatus } from '../src/server.js';
import { SonosService, type RoomStatus } from '../src/service.js';
import { fakeGateway, kitchen, living, playback } from './fakes.js';

let client: Client | undefined;

async function connect(gateway = fakeGateway(), catalog = async () => [{ trackId: 1, title: 'Piano Man', artist: 'Billy Joel' }]) {
  const service = new SonosService(gateway, { config: { appleMusicSerial: 20 }, searchCatalog: catalog });
  const server = createServer(service);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, gateway };
}

async function call(c: Client, name: string, args: Record<string, unknown> = {}) {
  const result = (await c.callTool({ name, arguments: args })) as CallToolResult;
  const text = result.content.map((p) => (p.type === 'text' ? p.text : '')).join('');
  return { isError: result.isError === true, text, summary: text.split('\n\n')[0] ?? '' };
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe('MCP server', () => {
  it('advertises the tools with annotations', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['sonos_add_to_queue', 'sonos_list_rooms', 'sonos_now_playing', 'sonos_search', 'sonos_stop']);
    expect(tools.find((t) => t.name === 'sonos_now_playing')?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find((t) => t.name === 'sonos_add_to_queue')?.inputSchema.required).toEqual(['ref']);
  });

  it('lists rooms', async () => {
    const { client } = await connect();
    const r = await call(client, 'sonos_list_rooms');
    expect(r.summary).toBe('Kitchen: Kitchen, Office\nLiving Room: Living Room');
    expect(JSON.parse(r.text.slice(r.summary.length))).toHaveLength(2);
  });

  it("reports what's playing", async () => {
    const { client } = await connect(fakeGateway({ [living.host]: playback({ state: 'STOPPED', track: undefined, sourceUri: '' }) }));
    const r = await call(client, 'sonos_now_playing');
    expect(r.summary).toBe(
      'Kitchen (with Office): paused "Piano Man" by Billy Joel (Piano Man) [0:01:00 / 0:05:36] from Sonos queue, queue track 3 of 10\n' +
        'Living Room: stopped, nothing loaded',
    );
  });

  it('stops playback', async () => {
    const { client, gateway } = await connect();
    expect((await call(client, 'sonos_stop', { room: 'Kitchen' })).summary).toBe('Kitchen stopped.');
    expect(gateway.stop).toHaveBeenCalledWith(kitchen);

    gateway.getPlayback.mockResolvedValue(playback({ state: 'STOPPED' }));
    expect((await call(client, 'sonos_stop', { room: 'Kitchen' })).summary).toBe('Kitchen was already stopped.');
  });

  it('searches', async () => {
    const { client } = await connect();
    const r = await call(client, 'sonos_search', { query: 'piano man', source: 'apple-music' });
    expect(r.summary).toBe('1 result(s):\n1. "Piano Man" by Billy Joel [apple-music]');
    expect(r.text).toContain('"ref": "apple:song:1"');
  });

  it('reports empty searches with warnings', async () => {
    const { client } = await connect(fakeGateway(), async () => Promise.reject(new Error('offline')));
    const r = await call(client, 'sonos_search', { query: 'nothing' });
    expect(r.summary).toBe('No results for "nothing".\nApple Music search failed: offline');
  });

  it('adds to the queue and plays now', async () => {
    const { client } = await connect();
    await call(client, 'sonos_search', { query: 'piano man', source: 'apple-music' });
    expect((await call(client, 'sonos_add_to_queue', { ref: 'apple:song:1', room: 'Kitchen' })).summary).toBe(
      'Added "Piano Man" to the Kitchen queue at position 4 of 11.',
    );
    expect((await call(client, 'sonos_add_to_queue', { ref: 'apple:song:1', room: 'Kitchen', mode: 'now' })).summary).toBe(
      'Now playing "Piano Man" in Kitchen (queue track 4 of 11).',
    );
  });

  it('includes the off-queue note and handles untitled tracks', async () => {
    const { client } = await connect(fakeGateway({ [kitchen.host]: playback({ sourceUri: 'x-sonos-vli:RINCON_K:1' }) }));
    const r = await call(client, 'sonos_add_to_queue', { ref: 'x-file-cifs://NAS/a.mp3', room: 'Kitchen' });
    expect(r.summary).toMatch(/^Added Track to the Kitchen queue at position 4 of 11\. Kitchen is playing from streamed from an app/);
  });

  it('returns tool errors instead of throwing', async () => {
    const { client } = await connect();
    const r = await call(client, 'sonos_now_playing', { room: 'Garage' });
    expect(r).toMatchObject({ isError: true, text: 'Unknown room "Garage". Rooms: Kitchen, Living Room.' });
  });

  it('stringifies non-Error failures', async () => {
    const gateway = fakeGateway();
    gateway.getGroups.mockRejectedValue('network down');
    const { client } = await connect(gateway);
    expect(await call(client, 'sonos_list_rooms')).toMatchObject({ isError: true, text: 'network down' });
  });
});

describe('describeStatus', () => {
  const base: RoomStatus = { room: 'Kitchen', members: ['Kitchen'], state: 'playing', source: 'radio', sourceDescription: 'radio or station', queueLength: 0 };

  it('describes minimal track info', () => {
    expect(describeStatus({ ...base, track: { title: 'News' } })).toBe('Kitchen: playing "News" from radio or station');
    expect(describeStatus({ ...base, track: { uri: 'x' } })).toBe('Kitchen: playing, radio or station');
  });
});
