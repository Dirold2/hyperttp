import { describe, it, expect } from "vitest";
import UrlExtractor from "../src/Hyperttp/UrlExtractor.js";

describe("UrlExtractor", () => {
  const yandexPatterns = [
    { entity: "track", regex: /music\.yandex\.ru\/track\/(?<id>\d+)/, groupNames: ["id"] },
    { entity: "album", regex: /music\.yandex\.ru\/album\/(?<id>\d+)/, groupNames: ["id"] },
    { entity: "artist", regex: /music\.yandex\.ru\/artist\/(?<id>\d+)/, groupNames: ["id"] },
    {
      entity: "playlist",
      regex: /music\.yandex\.ru\/users\/(?<user>[\w\d\-_\.]+)\/playlists\/(?<id>\d+)/,
      groupNames: ["id", "user"],
    },
    {
      entity: "playlist",
      regex: /music\.yandex\.ru\/playlists?\/(?<uid>(?:ar\.)?[A-Za-z0-9\-]+)/,
      groupNames: ["uid"],
    },
  ];

  it("extracts track ID from Yandex Music URL", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId("https://music.yandex.ru/track/25063569", "track", "yandex");
    expect(result.id).toBe(25063569);
  });

  it("extracts album ID", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId("https://music.yandex.ru/album/123456", "album", "yandex");
    expect(result.id).toBe(123456);
  });

  it("extracts artist ID", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId("https://music.yandex.ru/artist/789", "artist", "yandex");
    expect(result.id).toBe(789);
  });

  it("extracts playlist ID with user", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId(
      "https://music.yandex.ru/users/dirold2/playlists/42",
      "playlist",
      "yandex",
    );
    expect(result.id).toBe(42);
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

  it("returns string values when castNumbers=false", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    const result = extractor.extractId<string>(
      "https://music.yandex.ru/track/25063569",
      "track",
      "yandex",
      false,
    );
    expect(result.id).toBe("25063569");
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

  it("throws when URL does not match any pattern for entity", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);

    expect(() => {
      extractor.extractId("https://example.com/some/url", "track", "yandex");
    }).toThrow();
  });

  it("supports multiple platforms", () => {
    const extractor = new UrlExtractor();
    extractor.registerPlatform("yandex", yandexPatterns);
    extractor.registerPlatform("spotify", [
      { entity: "track", regex: /open\.spotify\.com\/track\/(?<id>[A-Za-z0-9]+)/, groupNames: ["id"] },
    ]);

    const yandexResult = extractor.extractId("https://music.yandex.ru/track/123", "track", "yandex");
    expect(yandexResult.id).toBe(123);

    const spotifyResult = extractor.extractId(
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      "track",
      "spotify",
    );
    expect(spotifyResult.id).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });
});
