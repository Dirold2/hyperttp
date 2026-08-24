import { describe, expect, it } from "vitest";
import UrlExtractor from "../src/Hyperttp/UrlExtractor.js";
import type { UrlExtractorInterface } from "../src/Types/url-extractor.js";

const yandexPatterns = [
  { entity: "track", regex: /music\.yandex\.ru\/track\/(?<id>\d+)/, groupNames: ["id"] },
  { entity: "album", regex: /music\.yandex\.ru\/album\/(?<id>\d+)/, groupNames: ["id"] },
  { entity: "artist", regex: /music\.yandex\.ru\/artist\/(?<id>\d+)/, groupNames: ["id"] },
  {
    entity: "playlist",
    regex: /music\.yandex\.ru\/users\/(?<user>[\w.-]+)\/playlists\/(?<id>\d+)/,
    groupNames: ["id", "user"],
  },
  {
    entity: "playlist",
    regex: /music\.yandex\.ru\/playlists?\/(?<uid>(?:ar\.)?[A-Za-z0-9-]+)/,
    groupNames: ["uid"],
  },
];

describe("UrlExtractor", () => {
  it("extracts IDs as strings by default", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    expect(
      extractor.extractId("https://music.yandex.ru/track/25063569", "track", "yandex").id,
    ).toBe("25063569");
    expect(extractor.extractId("https://music.yandex.ru/album/123456", "album", "yandex").id).toBe(
      "123456",
    );
    expect(extractor.extractId("https://music.yandex.ru/artist/789", "artist", "yandex").id).toBe(
      "789",
    );
  });

  it("extracts playlist ID with user", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId(
      "https://music.yandex.ru/users/dirold2/playlists/42",
      "playlist",
      "yandex",
    );
    expect(result.id).toBe("42");
    expect(result.user).toBe("dirold2");
  });

  it("extracts playlist UID", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId(
      "https://music.yandex.ru/playlists/ar123456",
      "playlist",
      "yandex",
    );
    expect(result.uid).toBe("ar123456");
  });

  it("converts safe decimal values only when explicitly enabled", () => {
    const extractor: UrlExtractorInterface = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId(
      "https://music.yandex.ru/track/25063569",
      "track",
      "yandex",
      true,
    );
    expect(result.id).toBe(25063569);
  });

  it("preserves opaque numeric-looking identifiers", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("example", [
      { entity: "track", regex: /example\.com\/track\/(?<id>\d+)/, groupNames: ["id"] },
    ]);

    expect(
      extractor.extractId("https://example.com/track/00123", "track", "example", true).id,
    ).toBe("00123");
    expect(
      extractor.extractId("https://example.com/track/9007199254740993", "track", "example", true)
        .id,
    ).toBe("9007199254740993");
  });

  it("supports global regex patterns repeatedly", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("example", [
      { entity: "track", regex: /example\.com\/track\/(?<id>\d+)/g, groupNames: ["id"] },
    ]);

    expect(extractor.extractId("https://example.com/track/123", "track", "example").id).toBe("123");
    expect(extractor.extractId("https://example.com/track/456", "track", "example").id).toBe("456");
  });

  it("supports sticky regex patterns", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("example", [
      { entity: "track", regex: /https:\/\/example\.com\/track\/(?<id>\d+)/y, groupNames: ["id"] },
    ]);

    expect(extractor.extractId("https://example.com/track/123", "track", "example").id).toBe("123");
  });

  it("throws for unknown platform", () => {
    const extractor = new UrlExtractor();

    expect(() => {
      extractor.extractId("https://example.com", "track", "nonexistent");
    }).toThrow('No patterns registered for "track" on platform "nonexistent"');
  });

  it("throws when no pattern matches", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    expect(() => {
      extractor.extractId("https://music.yandex.ru/unknown/123", "track", "yandex");
    }).toThrow('Invalid track URL for platform "yandex"');
  });

  it("does not hide malformed pattern configuration", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("example", [
      { entity: "track", regex: /example\.com\/track\/(?<id>\d+)/, groupNames: ["missing"] },
    ]);

    expect(() => {
      extractor.extractId("https://example.com/track/123", "track", "example");
    }).toThrow('Missing "missing" in track URL pattern');
  });

  it("supports multiple platforms", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);
    extractor.registerPlatform("spotify", [
      {
        entity: "track",
        regex: /open\.spotify\.com\/track\/(?<id>[A-Za-z0-9]+)/,
        groupNames: ["id"],
      },
    ]);

    const yandexResult = extractor.extractId(
      "https://music.yandex.ru/track/123",
      "track",
      "yandex",
    );
    expect(yandexResult.id).toBe("123");

    const spotifyResult = extractor.extractId(
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      "track",
      "spotify",
    );
    expect(spotifyResult.id).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });
});
