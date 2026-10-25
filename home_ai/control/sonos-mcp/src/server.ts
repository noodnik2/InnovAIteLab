import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { RoomStatus, SonosService } from './service.js';

export const SERVER_NAME = 'sonos';
export const SERVER_VERSION = '0.1.0';

const roomArg = z
  .string()
  .min(1)
  .optional()
  .describe('Room name, e.g. "Kitchen". Defaults to SONOS_DEFAULT_ROOM, the only playing room, or the only room.');

function ok(summary: string, data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: `${summary}\n\n${JSON.stringify(data, null, 2)}` }] };
}

function fail(err: unknown): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] };
}

async function guarded(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (err) {
    return fail(err);
  }
}

export function describeStatus(s: RoomStatus): string {
  const where = s.members.length > 1 ? `${s.room} (with ${s.members.filter((m) => m !== s.room).join(', ')})` : s.room;
  const t = s.track;
  if (!t?.title) return `${where}: ${s.state}, ${s.sourceDescription}`;
  const by = t.artist ? ` by ${t.artist}` : '';
  const album = t.album ? ` (${t.album})` : '';
  const time = s.position && t.duration ? ` [${s.position} / ${t.duration}]` : '';
  const queue = s.queuePosition ? `, queue track ${s.queuePosition} of ${s.queueLength}` : '';
  return `${where}: ${s.state} "${t.title}"${by}${album}${time} from ${s.sourceDescription}${queue}`;
}

export function createServer(service: SonosService): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    'sonos_list_rooms',
    {
      title: 'List Sonos rooms',
      description: 'List Sonos rooms (playback groups) and the speakers grouped in each.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      guarded(async () => {
        const rooms = await service.listRooms();
        return ok(rooms.map((r) => `${r.room}: ${r.members.join(', ')}`).join('\n'), rooms);
      }),
  );

  server.registerTool(
    'sonos_now_playing',
    {
      title: "What's playing",
      description: 'Show what is playing (track, artist, album, position, source, queue position). Omit room for all rooms.',
      inputSchema: { room: z.string().min(1).optional().describe('Room name; omit to report every room.') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ room }) =>
      guarded(async () => {
        const statuses = await service.nowPlaying(room);
        return ok(statuses.map(describeStatus).join('\n'), statuses);
      }),
  );

  server.registerTool(
    'sonos_stop',
    {
      title: 'Stop playback',
      description: 'Stop playback in a room (falls back to pause for sources that cannot be stopped, like radio).',
      inputSchema: { room: roomArg },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    ({ room }) =>
      guarded(async () => {
        const r = await service.stop(room);
        const verb = r.action === 'already-stopped' ? 'was already stopped' : r.action;
        return ok(`${r.room} ${verb}.`, r);
      }),
  );

  server.registerTool(
    'sonos_search',
    {
      title: 'Search for songs',
      description:
        'Search for songs in the local Sonos music library and/or the Apple Music catalog. ' +
        'Each result has a "ref" to pass to sonos_add_to_queue.',
      inputSchema: {
        query: z.string().min(1).describe('Song title, artist, or both, e.g. "Piano Man Billy Joel".'),
        source: z.enum(['all', 'library', 'apple-music']).default('all').describe('Where to search.'),
        limit: z.number().int().min(1).max(50).default(10).describe('Maximum results per source.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ query, source, limit }) =>
      guarded(async () => {
        const { results, warnings } = await service.search(query, source, limit);
        const lines = results.map(
          (r, i) => `${i + 1}. "${r.title}"${r.artist ? ` by ${r.artist}` : ''}${r.album ? ` (${r.album})` : ''} [${r.source}]`,
        );
        const summary = [results.length ? `${results.length} result(s):` : `No results for "${query}".`, ...lines, ...warnings].join('\n');
        return ok(summary, { results, warnings });
      }),
  );

  server.registerTool(
    'sonos_add_to_queue',
    {
      title: 'Add song to queue',
      description:
        'Add a song (a "ref" from sonos_search) to a room\'s Sonos queue: at the end, next, or "now" ' +
        '(switches the room to its queue and plays the song immediately).',
      inputSchema: {
        ref: z.string().min(1).describe('The "ref" of a sonos_search result.'),
        room: roomArg,
        mode: z.enum(['end', 'next', 'now']).default('end').describe('"end" appends, "next" plays after the current track, "now" plays immediately.'),
        title: z.string().optional().describe('Track title, if the ref did not come from a recent search.'),
        artist: z.string().optional(),
        album: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ ref, room, mode, title, artist, album }) =>
      guarded(async () => {
        const r = await service.addToQueue(ref, { room, mode, title, artist, album });
        const what = r.title ? `"${r.title}"` : 'Track';
        const summary = r.playingNow
          ? `Now playing ${what} in ${r.room} (queue track ${r.queuePosition} of ${r.queueLength}).`
          : `Added ${what} to the ${r.room} queue at position ${r.queuePosition} of ${r.queueLength}.${r.note ? ` ${r.note}` : ''}`;
        return ok(summary, r);
      }),
  );

  return server;
}
