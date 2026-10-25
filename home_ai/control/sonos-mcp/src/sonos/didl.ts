import { APPLE_MUSIC_SERVICE_TYPE } from './uris.js';

const ENTITY_DECODE: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITY_DECODE[name] ?? '');
}

/** Escape for XML text/attributes; idempotent on values that were already escaped. */
export function escapeXml(value: string): string {
  return encodeXml(decodeXmlEntities(value));
}

/** Strictly encode a string (e.g. a whole DIDL document) for embedding in a SOAP argument. */
export function encodeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface DidlItem {
  itemId: string;
  parentId?: string;
  title?: string;
  artist?: string;
  album?: string;
  albumArtUri?: string;
  upnpClass?: string;
  /** Identifies the music service account; local files use the associated player. */
  cdudn?: string;
}

export const MUSIC_TRACK_CLASS = 'object.item.audioItem.musicTrack';
export const LOCAL_CDUDN = 'RINCON_AssociatedZPUDN';
export const APPLE_MUSIC_CDUDN = `SA_RINCON${APPLE_MUSIC_SERVICE_TYPE}_X_#Svc${APPLE_MUSIC_SERVICE_TYPE}-0-Token`;

/** Build the DIDL-Lite metadata Sonos expects alongside an enqueued URI. */
export function buildTrackDidl(item: DidlItem): string {
  const parent = item.parentId !== undefined ? ` parentID="${escapeXml(item.parentId)}"` : '';
  const parts = [
    '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"',
    ' xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">',
    `<item id="${escapeXml(item.itemId)}"${parent} restricted="true">`,
  ];
  if (item.title !== undefined) parts.push(`<dc:title>${escapeXml(item.title)}</dc:title>`);
  if (item.artist !== undefined) parts.push(`<dc:creator>${escapeXml(item.artist)}</dc:creator>`);
  if (item.album !== undefined) parts.push(`<upnp:album>${escapeXml(item.album)}</upnp:album>`);
  if (item.albumArtUri !== undefined) parts.push(`<upnp:albumArtURI>${escapeXml(item.albumArtUri)}</upnp:albumArtURI>`);
  parts.push(`<upnp:class>${item.upnpClass ?? MUSIC_TRACK_CLASS}</upnp:class>`);
  parts.push(`<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">${escapeXml(item.cdudn ?? LOCAL_CDUDN)}</desc>`);
  parts.push('</item></DIDL-Lite>');
  return parts.join('');
}
