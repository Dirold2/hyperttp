# Changelog

All notable changes to this project will be documented in this file.

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
