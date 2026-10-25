import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

const EnvSchema = z.object({
  /** IP/hostname of any Sonos player; skips SSDP discovery when set. */
  SONOS_HOST: optionalString,
  SONOS_PORT: z.coerce.number().int().positive().default(1400),
  /** Room used when a tool call doesn't name one. */
  SONOS_DEFAULT_ROOM: optionalString,
  SONOS_DISCOVERY_TIMEOUT: z.coerce.number().int().positive().default(5),
  /** Sonos account serial ("sn=") for Apple Music; auto-detected when unset. */
  SONOS_APPLE_MUSIC_SN: z.coerce.number().int().nonnegative().optional(),
  /** iTunes storefront used for Apple Music catalog search. */
  ITUNES_COUNTRY: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'must be a two-letter country code')
    .default('US'),
});

export interface Config {
  host?: string;
  port: number;
  defaultRoom?: string;
  discoveryTimeoutSeconds: number;
  appleMusicSerial?: number;
  itunesCountry: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${issues}`);
  }
  const e = parsed.data;
  return {
    host: e.SONOS_HOST,
    port: e.SONOS_PORT,
    defaultRoom: e.SONOS_DEFAULT_ROOM,
    discoveryTimeoutSeconds: e.SONOS_DISCOVERY_TIMEOUT,
    appleMusicSerial: e.SONOS_APPLE_MUSIC_SN,
    itunesCountry: e.ITUNES_COUNTRY.toUpperCase(),
  };
}
