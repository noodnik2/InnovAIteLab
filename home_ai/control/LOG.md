# Home Control AI — Session Log

A running log of planning sessions with Claude; newest entries at the bottom.

---

## 2026-10-24 — Initial vision & network discovery

### Direction agreed

- **Hub:** [Home Assistant](https://www.home-assistant.io/) (HA) as the integration layer, rather than writing per-device integrations.
- **Natural language:** connect Claude to HA's built-in **MCP Server** integration first, to see what works out of the box.
- **Custom MCP servers:** focus where HA's MCP falls short:
  - History & analytics queries (e.g., "how much more heating this October vs. last?")
  - Higher-level "house" tools (`house_summary()`, `leaving_home()`, `whats_unusual()`)
  - Gaps HA covers poorly (network inventory / new-device alerts, computer monitoring)
  - Safety: read vs. write tiers, confirmation for risky actions (locks, oven, garage), audit log
- **Learning path:** standalone MCP server for **Sonos** (clean local API) → MCP server wrapping HA's REST/WebSocket API.

### Network discovery (passive: ARP + Bonjour/mDNS)

Network: `192.168.4.0/22`, gateway `192.168.4.1`

| Device | Identified as | Outlook | Notes |
|---|---|---|---|
| `eero`, `eero #2` | **eero** mesh router (main + 1 extender) | ⭐⭐ | No official API; community HA integration (HACS, cloud). Good for presence and the device list. |
| `envoy` (fw 8.3) | **Enphase Envoy** (solar) | ⭐⭐⭐ | Local API; official HA integration (needs an Enlighten account token). Natural dashboard centerpiece. |
| `Alfred` (`ecobee-ares`, ECB601) | **ecobee** thermostat, paired to Apple Home | ⭐⭐⭐ | HA HomeKit Controller needs it unpaired from Apple Home first. Alternatives: HA ecobee cloud integration, or Matter if supported. |
| 5 × `Sonos-…` | **Sonos** speakers (4 with Spotify Connect) | ⭐⭐⭐ | Local API; ideal first custom-MCP target. |
| `חדר טלוויזיה` (AppleTV5,3) | **Apple TV HD**, likely the Apple home hub | ⭐⭐ | HA Apple TV integration (playback, power). |
| HP Color LaserJet Pro MFP 3301 | Printer / scanner | ⭐⭐ | Toner and status via IPP. |
| `CrMac`, `RRR iPad`, `Rachel's iPhone` | Mac, iPad, iPhone | ⭐⭐ | HA Companion app gives Mac sensors and phone presence. |

### Not yet discovered

- **Cloud-only devices** (kitchen appliances, car): brands and models needed.
- **Silent devices:** only about 9 hosts were in the ARP table. The eero app's device list is the most complete inventory.

### Next steps

- [ ] List brands/models for kitchen appliances, car, and any other devices
- [ ] Export or review the device list in the eero app
- [ ] Decide whether to run an **active scan** (ping sweep + MAC vendor lookup)
- [ ] Query the Sonos speakers for their room names
- [ ] Choose HA hardware (HA Green, Raspberry Pi 5, or Docker/VM on an always-on machine) and install
- [ ] Connect Claude to HA's MCP Server integration and note the gaps
- [ ] Pick a lighting ecosystem (Lutron Caséta, Matter/Thread, or Zigbee)

---

## 2026-10-24 — Sonos MCP server (`sonos-mcp/`)

### What the Sonos probe found (read-only)

| Room           | Notes                                                                            |
|----------------|----------------------------------------------------------------------------------|
| Kitchen        | Has a bonded speaker (sub or stereo pair); was paused on its queue (Apple Music) |
| Living Room    | Has a bonded speaker (sub or stereo pair); was paused on its queue (Apple Music) |
| Master Bedroom | On `192.168.5.100`; was paused on an Amazon Music station (not its queue)        |

- **Music services:** Apple Music (sid 204, current account `sn=20`), Amazon Music (201), TuneIn (254), sid 160 (likely SoundCloud), and a local library on `SFR062` (1,000+ tracks). **Spotify is not linked.**

### What was built

A TypeScript MCP server with five tools: `sonos_list_rooms`, `sonos_now_playing`, `sonos_stop`, `sonos_search`, `sonos_add_to_queue`. See [`sonos-mcp/README.md`](sonos-mcp/README.md).

| Decision                                                                  | Why                                                                                       |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Search = local library + Apple Music (public iTunes Search API)           | Matches the household's services; no API keys; iTunes catalog ids = Sonos Apple Music ids |
| Build Apple Music URIs/metadata ourselves; auto-detect `sn`               | The library's helpers hard-code another household's values                                |
| "Current playlist" = the room's Sonos queue; `mode: "now"` switches to it | Queue additions are inaudible while radio/AirPlay plays                                   |
| Stop → falls back to Pause                                                | Some sources reject Stop                                                                  |
| Stateless; no event subscriptions                                         | Keeps stdio clean and opens no ports                                                      |

### Verified

- `make` passes: lint, type-check, 79 unit tests, **100% line / 96.6% branch coverage**, build.
- Live and read-only: rooms, now playing, library search, and Apple Music search all work against the real system.
- **Not yet verified live:** `sonos_add_to_queue` and `sonos_stop`. These change playback state, so they need a deliberate test.

### Next steps

- [ ] Live-test `sonos_add_to_queue` (Apple Music and library tracks) and `sonos_stop`
- [ ] Register in Claude Code: `claude mcp add sonos -s user -e SONOS_HOST=192.168.4.30 -- node <abs>/sonos-mcp/dist/index.js`
- [ ] Possible additions: play/pause/next, volume, grouping, favorites search, Amazon Music via favorites
