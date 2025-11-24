"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Universal URL Extractor
 *
 * Allows extraction of entity IDs (track, album, artist, playlist, etc.)
 * from URLs of multiple platforms using configurable regex patterns.
 *
 * @example
 * ```ts
 * const extractor = new UrlExtractor();
 *
 * // Register Yandex Music patterns
 * extractor.registerPlatform("yandex", [
 *   { entity: "track", regex: /music\.yandex\.ru\/track\/(?<id>\d+)/, groupNames: ["id"] },
 *   { entity: "album", regex: /music\.yandex\.ru\/album\/(?<id>\d+)/, groupNames: ["id"] },
 *   { entity: "artist", regex: /music\.yandex\.ru\/artist\/(?<id>\d+)/, groupNames: ["id"] },
 *   { entity: "playlist", regex: /music\.yandex\.ru\/users\/(?<user>[\w\d\-_\.]+)\/playlists\/(?<id>\d+)/, groupNames: ["id", "user"] },
 *   { entity: "playlist", regex: /music\.yandex\.ru\/playlists?\/(?<uid>(?:ar\.)?[A-Za-z0-9\-]+)/, groupNames: ["uid"] },
 * ]);
 *
 * // Extract track ID
 * const trackId = extractor.extractId<number>(
 *   "https://music.yandex.ru/track/25063569",
 *   "track",
 *   "yandex"
 * ).id;
 *
 * // Extract playlist info
 * const playlist = extractor.extractId<string | number>(
 *   "https://music.yandex.ru/playlists/ar123456",
 *   "playlist",
 *   "yandex"
 * );
 * ```
 */
class UrlExtractor {
    patterns = {};
    /**
     * Register a platform with its URL patterns.
     *
     * Each pattern should specify:
     * - `entity`: the type of entity this pattern extracts (e.g., "track", "album")
     * - `regex`: a regular expression with named capture groups
     * - `groupNames`: array of the named groups to extract from the regex
     *
     * @param platform - Platform name (e.g., "yandex", "spotify")
     * @param patterns - Array of URL patterns for this platform
     *
     * @example
     * ```ts
     * extractor.registerPlatform("yandex", [
     *   { entity: "track", regex: /music\.yandex\.ru\/track\/(?<id>\d+)/, groupNames: ["id"] }
     * ]);
     * ```
     */
    registerPlatform(platform, patterns) {
        this.patterns[platform] = patterns;
    }
    /**
     * Extract named groups from a URL using a specific pattern
     * @param url URL to extract from
     * @param pattern UrlPattern containing regex and group names
     * @throws Will throw if the URL does not match the pattern or required groups are missing
     * @returns Object with extracted group values
     */
    extractGroups(url, pattern) {
        const match = url.match(pattern.regex)?.groups;
        if (!match)
            throw new Error(`Invalid ${pattern.entity} URL: ${url}`);
        return pattern.groupNames.reduce((acc, name) => {
            const value = match[name];
            if (!value)
                throw new Error(`Missing "${name}" in ${pattern.entity} URL: ${url}`);
            acc[name] = value;
            return acc;
        }, {});
    }
    /**
     * Extract an entity ID from a URL.
     *
     * This method tries all registered patterns for the given entity and platform.
     * The returned values are always strings. If you expect numeric IDs, you should
     * convert them using `Number()`.
     *
     * @param url - URL to extract from
     * @param entity - Entity type ("track", "album", "artist", "playlist", etc.)
     * @param platform - Platform name registered with `registerPlatform`
     * @throws Will throw if no matching pattern is found or extraction fails
     * @returns Record<string, string> containing extracted values (keys depend on the pattern)
     *
     * @example
     * ```ts
     * const result = extractor.extractId('https://music.yandex.ru/track/25063569', 'track', 'yandex');
     * console.log(result.id); // "25063569" (string)
     * const numericId = Number(result.id); // 25063569
     * ```
     */
    extractId(url, entity, platform, castNumbers = true) {
        const patterns = this.patterns[platform]?.filter((p) => p.entity === entity);
        if (!patterns?.length)
            throw new Error(`No patterns registered for "${entity}" on platform "${platform}"`);
        for (const pattern of patterns) {
            try {
                const extracted = this.extractGroups(url, pattern);
                const result = {};
                for (const key in extracted) {
                    const value = extracted[key];
                    // Если ожидаем число и включен castNumbers, конвертируем
                    if (castNumbers && !isNaN(Number(value))) {
                        result[key] = Number(value);
                    }
                    else {
                        result[key] = value;
                    }
                }
                return result;
            }
            catch {
                // continue searching for a matching pattern
            }
        }
        throw new Error(`Invalid ${entity} URL for platform "${platform}": ${url}`);
    }
}
exports.default = UrlExtractor;
//# sourceMappingURL=UrlExtractor.js.map