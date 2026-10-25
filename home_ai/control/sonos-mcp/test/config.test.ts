import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({})).toEqual({
      host: undefined,
      port: 1400,
      defaultRoom: undefined,
      discoveryTimeoutSeconds: 5,
      appleMusicSerial: undefined,
      itunesCountry: 'US',
    });
  });

  it('reads and coerces values', () => {
    const config = loadConfig({
      SONOS_HOST: ' 192.168.4.30 ',
      SONOS_PORT: '1401',
      SONOS_DEFAULT_ROOM: 'Kitchen',
      SONOS_DISCOVERY_TIMEOUT: '3',
      SONOS_APPLE_MUSIC_SN: '20',
      ITUNES_COUNTRY: 'il',
    });
    expect(config).toEqual({
      host: '192.168.4.30',
      port: 1401,
      defaultRoom: 'Kitchen',
      discoveryTimeoutSeconds: 3,
      appleMusicSerial: 20,
      itunesCountry: 'IL',
    });
  });

  it('treats blank strings as unset', () => {
    expect(loadConfig({ SONOS_HOST: '  ', SONOS_DEFAULT_ROOM: '' })).toMatchObject({ host: undefined, defaultRoom: undefined });
  });

  it('rejects invalid values with a readable message', () => {
    expect(() => loadConfig({ SONOS_PORT: 'abc' })).toThrow(/Invalid configuration: SONOS_PORT/);
    expect(() => loadConfig({ ITUNES_COUNTRY: 'USA' })).toThrow(/two-letter country code/);
  });
});
