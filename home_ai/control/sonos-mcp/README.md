# Sonos MCP Server

An [MCP](https://modelcontextprotocol.io/) server for querying and controlling a Sonos system in natural language from
Claude Code (or any MCP client). It talks to the players directly over the local network (UPnP/SOAP on port 1400). It
needs no Sonos cloud account and no API keys.

## Tools

| Tool                 | What it does                                                                                                | Changes anything? |
|----------------------|-------------------------------------------------------------------------------------------------------------|-------------------|
| `sonos_list_rooms`   | Lists rooms (playback groups) and the speakers in each                                                      | No                |
| `sonos_now_playing`  | Track, artist, album, position, source, and queue position, for one room or all                             | No                |
| `sonos_stop`         | Stops a room; falls back to **pause** for sources that refuse Stop (radio, line-in)                         | Yes               |
| `sonos_search`       | Searches the **local music library** and/or the **Apple Music catalog**; each result has a `ref`            | No                |
| `sonos_add_to_queue` | Adds a `ref` to a room's queue: at the `end`, `next` (after the current track), or `now` (play immediately) | Yes               |

Example prompts:

- *"What's playing on the Sonos?"*
- *"Stop the music in the kitchen."*
- *"Find 'Piano Man' and play it next in the living room."*
- *"Queue up some Rippingtons from our library in the master bedroom."*

## Design notes and tradeoffs

- **Search uses the local library plus Apple Music.** Sonos has no general "search every music service" API on the local
  network. This household's Sonos uses **Apple Music** (service id 204) and a local library, so:
  - **Library search** uses the players' ContentDirectory. Sonos only matches **track titles**, so if
    `"walk away rippingtons"` finds nothing, the server drops trailing words and uses them to filter on artist and album.
  - **Apple Music search** uses Apple's public [iTunes Search API](https://performance-partners.apple.com/search-api)
    (no key needed). Its catalog track ids are the same ids Sonos uses, so results can be queued directly.
  - **Not supported:** Spotify (not linked to this Sonos), Amazon Music and TuneIn (no public search API). New sources
    can be added in `SonosService.search`.
- **The Apple Music account serial (`sn=`) is detected automatically.** Sonos URIs embed a per-household account
  serial. The server reads it from what's currently playing, then from the room's queue, then from favorites. You can
  override it with `SONOS_APPLE_MUSIC_SN`.
- **"Current playlist" means the room's Sonos queue.** If a room is playing radio, AirPlay, or Spotify Connect,
  adding to the queue isn't audible. The tool says so, and `mode: "now"` switches the room to its queue and plays.
- **`mode: "now"` confirms playback before reporting success.** Sonos accepts Play even for a track it can't load
  (e.g. a library file on an unreachable share), then silently skips ahead or stops. The tool polls for up to 4 seconds
  and reports `playingNow: true` only once the room is actually playing the new track; otherwise it explains what
  happened. The failed entry stays in the queue.
- **Commands go to the group coordinator**, so naming any speaker in a group works.
- **The server is stateless.** It reads group topology fresh on every call and never subscribes to Sonos events, so it
  opens no listening ports. The only state it keeps is a small in-memory cache of recent search results, which supplies
  track metadata when you queue a `ref`.
- **The `sonos_search` tool is the only one that leaves your network** (to query `itunes.apple.com`).

## Requirements

- Node.js 20 or newer (developed on Node 24)
- GNU Make (the macOS default 3.81 works)
- The computer running the server must be on the same network as the Sonos players

## Build, test, and run

```bash
make            # lint + type-check + tests with coverage + build (default target)
make help       # list all targets
make install    # npm ci
make build      # compile to dist/
make test       # unit tests
make coverage   # unit tests with coverage; fails below 80%
make run        # start the server on stdio (normally Claude Code does this)
make dev        # run from source via tsx, no build step
make clean      # remove dist/ and coverage/
```

The HTML coverage report is written to `coverage/index.html`.

## Install in Claude Code

Build first (`make`), then register the server. `-s user` makes it available in every project. Use `-s local`
(the default) to limit it to the current project:

```bash
claude mcp add sonos -s user \
  -e SONOS_HOST=192.168.4.30 \
  -- node "$(pwd)/dist/index.js"
```

Run that from this folder so that `$(pwd)` resolves to the absolute path. Then check it:

```bash
claude mcp list          # should show: sonos ... ✓ Connected
```

Inside Claude Code, `/mcp` shows the server and its tools. To remove it: `claude mcp remove sonos -s user`.

To share the server with a project instead, add it to that project's `.mcp.json`:

```json
{
  "mcpServers": {
    "sonos": {
      "command": "node",
      "args": ["/absolute/path/to/sonos-mcp/dist/index.js"],
      "env": { "SONOS_HOST": "192.168.4.30" }
    }
  }
}
```

## Configuration

All configuration is through environment variables. Every one is optional.

| Variable                  | Default            | Purpose                                                                                                       |
|---------------------------|--------------------|---------------------------------------------------------------------------------------------------------------|
| `SONOS_HOST`              | *(SSDP discovery)* | IP of any Sonos player. Setting it skips discovery, which is faster and works across subnets                  |
| `SONOS_PORT`              | `1400`             | Player UPnP port                                                                                              |
| `SONOS_DEFAULT_ROOM`      | —                  | Room used when a request doesn't name one. Otherwise the server picks the only playing room, or the only room |
| `SONOS_DISCOVERY_TIMEOUT` | `5`                | Seconds to wait for SSDP discovery                                                                            |
| `SONOS_APPLE_MUSIC_SN`    | *(auto-detected)*  | Apple Music account serial (the `sn=` value in a `…?sid=204&…&sn=N` URI)                                      |
| `ITUNES_COUNTRY`          | `US`               | Apple Music storefront used for catalog search                                                                |

Set `DEBUG=sonos*` to see the Sonos library's debug logging on stderr. stdout is reserved for the MCP protocol.

## Project layout

```text
src/
  index.ts           entrypoint: config, discovery, stdio transport
  server.ts          MCP tool definitions (zod schemas, result formatting)
  service.ts         domain logic: room resolution, stop fallback, search, queueing
  config.ts          environment parsing/validation
  search/itunes.ts   Apple Music catalog search
  sonos/gateway.ts   adapter over @svrooij/sonos (the only code that touches the network)
  sonos/uris.ts      Sonos URI classification and construction
  sonos/didl.ts      DIDL-Lite metadata builder (XML-escaped)
test/                vitest unit tests (fake gateway and fake devices; no network)
```

## Libraries

- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk): official MCP TypeScript SDK
- [`@svrooij/sonos`](https://github.com/svrooij/node-sonos-ts): typed Sonos UPnP client
- [`zod`](https://zod.dev): input and config validation
- Dev: TypeScript 6, Vitest 5 (V8 coverage), ESLint 10 with typescript-eslint, tsx

TypeScript is pinned to 6.0 because typescript-eslint doesn't support TypeScript 7 yet.

## Known issues

- `npm audit` reports a moderate finding in `fast-xml-parser`, which `@svrooij/sonos` pins at 3.x (no upstream fix).
  The parser only processes responses from your own Sonos players on the LAN, so the risk is accepted for this tool.
- Library search depends on the Sonos music-library index. Rescan it in the Sonos app if new files don't show up.
