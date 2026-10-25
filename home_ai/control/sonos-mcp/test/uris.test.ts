import { describe, expect, it } from 'vitest';
import {
  APPLE_MUSIC_SERVICE_TYPE,
  appleSongRef,
  appleSongTrackUri,
  classifySource,
  describeSource,
  detectServiceSerial,
  parseAppleSongRef,
  serviceParams,
} from '../src/sonos/uris.js';

describe('classifySource', () => {
  it.each([
    ['x-rincon-queue:RINCON_000E58F7C49601400#0', 'queue'],
    ['x-rincon:RINCON_000E58F7C49601400', 'grouped'],
    ['x-rincon-stream:RINCON_000E58F7C49601400', 'line-in'],
    ['x-sonos-vli:RINCON_000E58F7C49601400:1,spotify:abc', 'app-stream'],
    ['x-sonos-htastream:RINCON_000E58F7C49601400:spdif', 'tv'],
    ['x-sonosapi-stream:s24889?sid=254&flags=8224&sn=0', 'radio'],
    ['x-sonosapi-radio:radio:ra.1378228869?sid=204&flags=8300&sn=6', 'radio'],
    ['x-rincon-mp3radio://example.com/stream', 'radio'],
    ['x-sonos-http:song:1.mp4?sid=204', 'stream'],
    ['', 'none'],
    [undefined, 'none'],
  ] as const)('%s -> %s', (uri, kind) => {
    expect(classifySource(uri)).toBe(kind);
  });

  it('describes every kind', () => {
    expect(describeSource('queue')).toBe('Sonos queue');
    expect(describeSource('none')).toBe('nothing loaded');
  });
});

describe('serviceParams', () => {
  it('parses sid and sn, including escaped ampersands', () => {
    expect(serviceParams('x-sonos-http:song:1.mp4?sid=204&flags=8224&sn=20')).toEqual({ sid: 204, sn: 20 });
    expect(serviceParams('x-sonos-spotify:x?sid=9&amp;flags=8224&amp;sn=7')).toEqual({ sid: 9, sn: 7 });
  });

  it('ignores missing or non-numeric values', () => {
    expect(serviceParams('x-file-cifs://NAS/a.mp3')).toEqual({});
    expect(serviceParams('x?sid=abc')).toEqual({ sid: undefined, sn: undefined });
  });
});

describe('detectServiceSerial', () => {
  it('returns the first serial for the requested service', () => {
    const uris = [undefined, 'x-file-cifs://NAS/a.mp3', 'x?sid=201&sn=3', 'x?sid=204&sn=20', 'x?sid=204&sn=11'];
    expect(detectServiceSerial(uris, 204)).toBe(20);
    expect(detectServiceSerial(uris, 201)).toBe(3);
  });

  it('returns undefined when absent', () => {
    expect(detectServiceSerial(['x?sid=204'], 204)).toBeUndefined();
    expect(detectServiceSerial([], 204)).toBeUndefined();
  });
});

describe('Apple Music refs', () => {
  it('round-trips refs', () => {
    expect(appleSongRef(158617575)).toBe('apple:song:158617575');
    expect(parseAppleSongRef('apple:song:158617575')).toBe('158617575');
    expect(parseAppleSongRef('apple:album:1')).toBeUndefined();
    expect(parseAppleSongRef('x-file-cifs://a')).toBeUndefined();
  });

  it('builds the Sonos URI the household uses', () => {
    expect(appleSongTrackUri('512986243', 20)).toBe('x-sonos-http:song:512986243.mp4?sid=204&flags=8224&sn=20');
    expect(APPLE_MUSIC_SERVICE_TYPE).toBe(52231);
  });
});
