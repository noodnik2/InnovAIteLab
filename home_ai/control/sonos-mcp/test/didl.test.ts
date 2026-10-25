import { describe, expect, it } from 'vitest';
import { APPLE_MUSIC_CDUDN, buildTrackDidl, decodeXmlEntities, escapeXml } from '../src/sonos/didl.js';

describe('escapeXml', () => {
  it('escapes markup characters', () => {
    expect(escapeXml(`Crosby, Stills & Nash <"live"> 'Déjà Vu'`)).toBe(
      'Crosby, Stills &amp; Nash &lt;&quot;live&quot;&gt; &apos;Déjà Vu&apos;',
    );
  });

  it('does not double-escape already-escaped values', () => {
    expect(escapeXml('St. James&apos; Club &amp; more')).toBe('St. James&apos; Club &amp; more');
  });

  it('decodes the predefined entities', () => {
    expect(decodeXmlEntities('&lt;a&gt; &quot;b&quot; &apos;c&apos; &amp;')).toBe(`<a> "b" 'c' &`);
  });
});

describe('buildTrackDidl', () => {
  it('builds full metadata', () => {
    const didl = buildTrackDidl({
      itemId: '10032020song%3a1',
      parentId: 'p',
      title: 'Rock & Roll',
      artist: 'A',
      album: 'B',
      albumArtUri: 'http://x/y?a=1&b=2',
      cdudn: APPLE_MUSIC_CDUDN,
    });
    expect(didl).toContain('<item id="10032020song%3a1" parentID="p" restricted="true">');
    expect(didl).toContain('<dc:title>Rock &amp; Roll</dc:title>');
    expect(didl).toContain('<dc:creator>A</dc:creator>');
    expect(didl).toContain('<upnp:album>B</upnp:album>');
    expect(didl).toContain('<upnp:albumArtURI>http://x/y?a=1&amp;b=2</upnp:albumArtURI>');
    expect(didl).toContain('<upnp:class>object.item.audioItem.musicTrack</upnp:class>');
    expect(didl).toContain('>SA_RINCON52231_X_#Svc52231-0-Token</desc>');
    expect(didl.endsWith('</item></DIDL-Lite>')).toBe(true);
  });

  it('builds minimal metadata with local defaults', () => {
    const didl = buildTrackDidl({ itemId: '-1', upnpClass: 'object.item' });
    expect(didl).toContain('<item id="-1" restricted="true">');
    expect(didl).not.toContain('dc:title');
    expect(didl).toContain('<upnp:class>object.item</upnp:class>');
    expect(didl).toContain('>RINCON_AssociatedZPUDN</desc>');
  });
});
