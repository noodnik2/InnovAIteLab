#!/usr/bin/env node
// This server never subscribes to Sonos events; make sure the library doesn't open a listener.
process.env.SONOS_DISABLE_EVENTS ??= '1';
process.env.SONOS_DISABLE_LISTENER ??= '1';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SonosDevice, SonosDeviceDiscovery } from '@svrooij/sonos';
import { loadConfig } from './config.js';
import { searchItunesSongs } from './search/itunes.js';
import { createServer } from './server.js';
import { SonosService } from './service.js';
import { UpnpSonosGateway } from './sonos/gateway.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const gateway = new UpnpSonosGateway(
    async () => {
      if (config.host) return { host: config.host, port: config.port };
      const player = await new SonosDeviceDiscovery().SearchOne(config.discoveryTimeoutSeconds);
      console.error(`sonos-mcp: discovered Sonos player at ${player.host}:${player.port}`);
      return { host: player.host, port: player.port };
    },
    (host, port, uuid, name) => new SonosDevice(host, port, uuid, name),
  );
  const service = new SonosService(gateway, {
    config,
    searchCatalog: (query, limit) => searchItunesSongs(query, { limit, country: config.itunesCountry }),
  });

  const server = createServer(service);
  await server.connect(new StdioServerTransport());
  console.error('sonos-mcp: ready on stdio');
}

main().catch((err: unknown) => {
  console.error('sonos-mcp: fatal:', err);
  process.exit(1);
});
