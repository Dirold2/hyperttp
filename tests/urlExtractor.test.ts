import { describe, it, expect } from "vitest";
import { UrlExtractor } from "../src";
import type { UrlPattern } from "../src";

describe("UrlExtractor", () => {
  const extractor = new UrlExtractor();

  const yandexPatterns: UrlPattern[] = [
    {
      entity: "track",
      regex: /music\.yandex\.ru\/track\/(?<id>\d+)/,
      groupNames: ["id"],
    },
    {
      entity: "album",
      regex: /music\.yandex\.ru\/album\/(?<id>\d+)/,
      groupNames: ["id"],
    },
    {
      entity: "artist",
      regex: /music\.yandex\.ru\/artist\/(?<id>\d+)/,
      groupNames: ["id"],
    },
    {
      entity: "playlist",
      regex:
        /music\.yandex\.ru\/users\/(?<user>[\w\d\-_\.]+)\/playlists\/(?<id>\d+)/,
      groupNames: ["id", "user"],
    },
    {
      entity: "playlist",
      regex: /music\.yandex\.ru\/playlists?\/(?<uid>(?:ar\.)?[A-Za-z0-9\-]+)/,
      groupNames: ["uid"],
    },
  ];

  extractor.registerPlatform("yandex", yandexPatterns);

  it("should extract track ID", () => {
    const url = "https://music.yandex.ru/track/25063569";
    const result = extractor.extractId<number>(url, "track", "yandex");
    expect(result.id).toBe(25063569);
  });

  it("should extract album ID", () => {
    const url = "https://music.yandex.ru/album/14457044";
    const result = extractor.extractId<number>(url, "album", "yandex");
    expect(result.id).toBe(14457044);
  });

  it("should extract artist ID", () => {
    const url = "https://music.yandex.ru/artist/12345";
    const result = extractor.extractId<number>(url, "artist", "yandex");
    expect(result.id).toBe(12345);
  });

  it("should extract playlist with user", () => {
    const url = "https://music.yandex.ru/users/testuser/playlists/67890";
    const result = extractor.extractId<number | string>(
      url,
      "playlist",
      "yandex",
    );
    expect(result.id).toBe(67890);
    expect(result.user).toBe("testuser");
  });

  it("should extract playlist with UID", () => {
    const url = "https://music.yandex.ru/playlists/ar123456";
    const result = extractor.extractId<string | number>(
      url,
      "playlist",
      "yandex",
    );
    expect(result.uid).toBe("ar123456");
    expect(result.user).toBeUndefined();
  });

  it("should throw error for invalid URL", () => {
    const url = "https://music.yandex.ru/track/invalid";
    expect(() => extractor.extractId<number>(url, "track", "yandex")).toThrow();
  });

  it("should throw error if no patterns registered", () => {
    const url = "https://music.example.com/track/123";
    expect(() =>
      extractor.extractId<number>(url, "track", "nonexistent"),
    ).toThrow();
  });

  it("should extract ID as string when castNumbers is false", () => {
    const url = "https://music.yandex.ru/track/25063569";
    const result = extractor.extractId<string>(url, "track", "yandex", false);
    expect(result.id).toBe("25063569");
    expect(typeof result.id).toBe("string");
  });

  it("should not cast to number if string is not numeric", () => {
    const url = "https://music.yandex.ru/playlists/my-cool-playlist";
    const result = extractor.extractId<string>(url, "playlist", "yandex");
    expect(result.uid).toBe("my-cool-playlist");
    expect(typeof result.uid).toBe("string");
  });

  it("should throw error if named group is missing in regex match", () => {
    extractor.registerPlatform("broken", [
      {
        entity: "track",
        regex: /track\/(?<id>\d+)?/,
        groupNames: ["id"] as any,
      },
    ]);

    const url = "https://example.com/track/";

    expect(() => extractor.extractId(url, "track", "broken")).toThrow(
      /Invalid track URL for platform "broken"/,
    );
  });

  it("should throw error if url doesn't match any registered pattern for the platform", () => {
    const url = "https://completely-different-url.com";
    expect(() => extractor.extractId(url, "track", "yandex")).toThrow(
      "Invalid track URL",
    );
  });

  it("should not cast to number if string contains letters", () => {
    extractor.registerPlatform("strings", [
      { entity: "item", regex: /(?<name>[a-z]+)/, groupNames: ["name"] },
    ]);
    const result = extractor.extractId("apple", "item", "strings");
    expect(typeof result.name).toBe("string");
    expect(result.name).toBe("apple");
  });
});
