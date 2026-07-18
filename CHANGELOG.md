# Changelog

All notable changes to this project will be documented in this file.

## [0.4.14] - 2026-07-18

### Changed
- Updated `@hyperttp/core` ^1.5.4 → ^1.5.5

## [0.4.13] - 2026-07-18

### Changed
- Updated `@hyperttp/core` ^1.5.3 → ^1.5.4

## [0.4.12] - 2026-06-22

### Changed
- Dependency updates: `@hyperttp/core` ^1.5.0 → ^1.5.3, `@hyperttp/types` ^0.2.4 → ^0.2.5
- Dev dependency updates: TypeScript ^6.0.3 → ^7.0.2, Vitest ^4.1.9 → ^4.1.10, oxfmt ^0.56.0 → ^0.59.0, oxlint ^1.71.0 → ^1.74.0, tsx ^4.22.4 → ^4.23.1, @types/node ^26.0.0 → ^26.1.1
- Removed `@vitest/ui` from devDependencies
- README.md and `lang/ru/README.md` refactored

## [0.4.11] - 2026-06-22

### Fixed
- `HyperClient._buildRequest` no longer duplicates query parameters when a `Request`/`PreparedRequest` object is passed. `Request.buildURL()` already bakes query params into the URL via the `url` getter, but `_buildRequest` was also reading `getQuery()` and appending them again, producing malformed URLs like `?ts=a&sign=b?ts=a&sign=b`. Added a guard — query appending is skipped for objects that have a `getURL` method (i.e., `Request`-like).

## [0.4.10] - 2026-06-22

### Added
- `HyperClient.request(url)` method — returns a `RequestBuilder` instance for fluent chainable API (`client.request(url).get().send()`)
- `RequestBuilder` is now publicly exported from the package entry point (`import { RequestBuilder } from "hyperttp"`)
- Test suite: 50 tests covering HyperClient, RequestBuilder, Request, UrlExtractor, and query utilities

### Fixed
- Removed `withSerializer` from pre-wired plugins (serialization moved to `@hyperttp/core`)
- Eliminated `any` types in `Request.ts`: `_meta`, constructor, and `meta` getter now use `Record<string, unknown>`
- Replaced unsafe `(this._engine as unknown as IHyperCore)` casts with a proper `HyperCoreEngine` interface
- Extracted duplicated query parameter encoding into shared `appendQueryToUrl()` utility
- Removed unused `IHyperCore` import from `HyperClient.ts`

### Changed
- Build: esbuild minify added after tsc — JS size reduced from 48KB to 11.6KB (gzip: 12.7KB → 4.9KB)

## [0.4.9] - 2026-06-??
- Various stability improvements and dependency updates
