/**
 * Interface for a universal URL extractor
 */
export interface UrlExtractorInterface {
  /**
   * Register a platform with its URL patterns
   * @param platform Platform name (e.g., "yandex", "spotify")
   * @param patterns Array of URL patterns for the platform
   */
  registerPlatform(platform: string, patterns: UrlPattern[]): void;

  /**
   * Extract an entity ID or related info from a URL
   * @param url URL to extract from
   * @param entity Entity type ("track", "album", "artist", "playlist", etc.)
   * @param platform Platform name that has been registered
   * @returns Record of extracted values (keys depend on the pattern)
   */
  extractId<T extends string | number>(
    url: string,
    entity: string,
    platform: string,
  ): Record<string, T>;
}

/**
 * Defines a URL extraction pattern for a platform
 */
export interface UrlPattern<T extends string = string> {
  /** Entity type this pattern applies to (track, album, artist, playlist, etc.) */
  entity: string;

  /** Regex with named capturing groups to extract IDs or info */
  regex: RegExp;

  /** Names of the capturing groups to extract */
  groupNames: T[];
}

export * from "./request";
