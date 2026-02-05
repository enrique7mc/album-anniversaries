# Project State: Album Anniversaries - Apple Music Integration

**Last updated:** 2026-02-05
**Current phase:** 3 of 4 (Apple Music Integration)
**Status:** Phase Complete - Verified

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-01-31)

**Core value:** Users can celebrate album anniversaries for music they actually listen to — regardless of whether they use Spotify or Apple Music.

**Current focus:** Phase 3 complete - Ready for Phase 4 (Production Validation)

**Milestone:** Apple Music Integration (4 phases total)

---

## Current Position

**Phase:** 3 of 4 (Apple Music Integration) - COMPLETE & VERIFIED
**Plan:** 4 of 4 complete (03-04-SUMMARY.md)
**Status:** Phase 3 complete - Apple Music integration verified working
**Last activity:** 2026-02-05 - Completed Plan 03-04 (Integration Verification)

### Progress Bar
```
[█████████░] 90% (9/10 plans across 4 phases)
Phase 1: [███] 3/3 plans - COMPLETE
Phase 2: [██] 2/2 plans - COMPLETE
Phase 3: [████] 4/4 plans - COMPLETE & VERIFIED
Phase 4: ○ Pending
```

---

## Performance Metrics

**Phases completed:** 3 / 4 (Phase 1, 2 & 3)
**Requirements completed:** 9 / 9 (All v1 requirements complete)
**Plans executed:** 9 / ~10

**Plan 01-01 duration:** 2 min
**Plan 01-02 duration:** 2 min
**Plan 01-03 duration:** 3 min
**Plan 02-01 duration:** 4 min
**Plan 02-02 duration:** 15 min (including troubleshooting)
**Plan 03-01 duration:** 3 min
**Plan 03-02 duration:** 3 min
**Plan 03-03 duration:** 6 min
**Plan 03-04 duration:** 20 min (verification + bug fixes)
**Velocity:** 6.4 min/plan (sample size: 9)

---

## Accumulated Context

### Decisions

**2026-02-05: Direct AppleMusicService injection alongside MUSIC_SERVICE token**
- Inject AppleMusicService directly for initialize/authorize calls
- MUSIC_SERVICE provides default service (Spotify)
- Enables calling Apple Music-specific methods not in MusicService interface

**2026-02-05: setupArtistsObservables extraction**
- Moved artist/album observable setup into reusable method
- Both Spotify and Apple Music flows use same transformation logic
- Reduces code duplication and ensures consistent filtering

**2026-02-05: activeProvider tracking**
- Added `activeProvider: 'spotify' | 'apple' | null` property
- Set during login flow to track which service is active
- Cleared on logout for clean state reset

**2026-02-05: Custom TypeScript declarations for MusicKit v3**
- @types/musickit-js only supports v1 and conflicts with v3 API
- Created custom declarations in src/typings.d.ts
- Includes Window extension, MusicKitStatic, MusicKitInstance, MusicKitConfiguration, MusicKitError

**2026-02-05: AppleMusicService design decisions**
- Hardcoded 'us' storefront for catalog API - acceptable for v1
- Artist popularity always 0 - Apple Music doesn't provide this metric
- release_date_precision always 'day' - Apple provides full dates
- Music User Token in sessionStorage with 6-month expiry
- Rate limiting: 5 requests per batch, 200ms delay between batches

**2026-02-05: Singleton promise pattern for script loading**
- MusicKitLoaderService caches loadPromise to prevent duplicate script injections
- Reset on error to allow retry
- musickitloaded event listener registered before script injection to avoid race conditions

**2026-02-05: PEM key normalization in Firebase Functions**
- Firebase secrets can mangle newlines in multiline content
- Added `normalizePemKey()` function to handle literal `\n` strings
- Reconstructs proper PEM format before parsing

**2026-02-05: Apple Developer credentials configured**
- Team ID: BLS68A8QS3
- Key ID: BJJQKRM296
- Private key stored in Secret Manager
- Token validates successfully against Apple Music API (HTTP 200)

**2026-02-01: JWT payload structure for Apple Music tokens**
- Only required claims: iss (Team ID), iat (issued at), exp (expiry)
- kid (Key ID) in header, not payload
- Empty payload object - Apple rejects tokens with extra claims (aud, sub)

**2026-02-01: Global scope token caching in Firebase Functions**
- Firebase Functions v2 preserves global state across invocations
- 180-day token expiry (Apple's maximum)
- 1-hour buffer before expiry ensures fresh tokens
- Reduces API calls and improves performance

**2026-02-01: jose library for ES256 signing**
- ESM-native, works with NodeNext module resolution
- Async/await API cleaner than jsonwebtoken
- Built-in support for ES256 algorithm

**2026-02-01: defineSecret over functions.config()**
- functions.config() deprecated March 2027
- defineSecret is 2nd gen standard for sensitive credentials
- Automatic Secret Manager API integration

**2026-02-01: Factory provider pattern for MUSIC_SERVICE**
- Using `useFactory` with deps enables future runtime switching between providers
- Factory currently returns SpotifyService, will support AppleMusicService selection

**2026-02-01: Static methods on concrete class**
- Static utility methods (albumHadBirthdayPastWeek, etc.) stay on SpotifyService
- Not part of MusicService interface - they are pure date utility functions
- AppComponent imports SpotifyService for static access, injects MUSIC_SERVICE for instance methods

**2026-02-01: Minimal MusicService interface**
- Only includes `artists` Observable and `loadArtistsWithAlbums` method
- Static utility methods (albumHadBirthdayPastWeek, etc.) stay on concrete classes
- Enables both Spotify and Apple Music services to be interchangeable

**2026-02-01: Separate token file from interface**
- `music-service.interface.ts` defines contract
- `music-service.token.ts` defines InjectionToken
- Prevents circular dependencies when configuring providers

**2026-01-31: Service abstraction via interface**
- Components will inject MUSIC_SERVICE token, not concrete service classes
- Both SpotifyService and AppleMusicService implement common MusicService interface
- Enables future service additions without component changes

**2026-01-31: Library fallback for Apple Music**
- Apple Music lacks "top artists" endpoint equivalent to Spotify
- Will use /v1/me/library/artists (all library artists, alphabetical)
- UX difference from Spotify's personalized top 50 is acceptable

**2026-01-31: Client-side auth for both services**
- Matches existing Spotify approach
- Apple Music requires backend component for JWT signing, but Music User Token managed client-side
- No server-side token storage needed

**2026-02-01: Quick depth with 4 phases**
- Compressed research's 6-phase suggestion to fit "quick" depth configuration
- Combined architectural prep into Phase 1
- Isolated backend prerequisite as Phase 2
- Consolidated Apple Music work in Phase 3
- Separated production validation as Phase 4

### Open Questions

**Mobile Safari authentication fallbacks:**
- Privacy features break MusicKit popup authentication
- Fallback strategies unclear from research
- **Decision:** TBD during Phase 4 planning

### Active Blockers

None - Phase 3 complete, ready for Phase 4.

### Todos

- [x] Execute Plan 01-01 (MusicService interface)
- [x] Execute Plan 01-02 (provider wiring in app.module/app.component)
- [x] Execute Plan 01-03 (landing page UI)
- [x] Execute Plan 02-01 (Firebase Functions infrastructure)
- [x] Execute Plan 02-02 (Apple credential configuration & validation)
- [x] Enroll in Apple Developer Program
- [x] Obtain MusicKit credentials (Team ID, Key ID, .p8 key)
- [x] Set Firebase secrets for Apple Developer credentials
- [x] Deploy Firebase Functions with secrets configured
- [x] Plan Phase 3 (Apple Music Integration)
- [x] Execute Plan 03-01 (MusicKit JS loader infrastructure)
- [x] Execute Plan 03-02 (AppleMusicService implementation)
- [x] Execute Plan 03-03 (UI integration)
- [ ] Plan Phase 4 (Production Validation)
- [ ] Execute Phase 4 plans
- [ ] Obtain real iOS devices for Phase 4 testing

---

## Recent Activity

**2026-02-05:** Completed Plan 03-04 (Integration Verification)
- Fixed library vs catalog artist ID mismatch (added `&include=catalog`)
- Improved rate limiting: sequential requests, 500ms delay, exponential backoff
- Added 20 artist limit for development testing
- User verified Apple Music sign-in working end-to-end
- Phase 3 complete and verified
- Duration: 20 min

**2026-02-05:** Completed Plan 03-03 (UI Integration)
- Enabled Apple Music sign-in button with MusicKit popup authentication
- Implemented loginAppleMusic() method with proper initialization sequence
- Added activeProvider tracking for runtime provider identification
- Extracted setupArtistsObservables() for service-agnostic data binding
- Added 7 new unit tests for Apple Music login flow
- 170 total tests passing
- Phase 3 complete
- Duration: 6 min

**2026-02-05:** Completed Plan 03-02 (AppleMusicService Implementation)
- Created AppleMusicService implementing MusicService interface
- Developer token fetching, user authorization, library artist/album fetching
- Response mapping to Artist/Album/Image models
- Rate-limited batch processing (5 requests, 200ms delay)
- 33 new unit tests, 163 total tests passing
- Duration: 3 min

**2026-02-05:** Completed Plan 03-01 (MusicKit JS Loader Infrastructure)
- Created MusicKitLoaderService with singleton script loading pattern
- Added custom TypeScript declarations for MusicKit JS v3
- 6 new unit tests, 130 total tests passing
- Duration: 3 min

**2026-02-05:** Completed Plan 02-02 (Apple Credential Configuration & Token Validation)
- Configured APPLE_TEAM_ID (BLS68A8QS3), APPLE_KEY_ID (BJJQKRM296), APPLE_PRIVATE_KEY
- Added normalizePemKey() to handle Firebase secrets newline formatting
- Token validates against Apple Music API (HTTP 200)
- Phase 2 complete
- Duration: 15 min

**2026-02-01:** Completed Plan 02-01 (Firebase Functions Infrastructure)
- Upgraded Firebase Functions from v2 (1st gen) to v5 (2nd gen) with Node 20 runtime
- Implemented getAppleMusicToken callable function with ES256 JWT signing
- Configured token caching with 180-day expiry and 1-hour refresh buffer
- Duration: 4 min

**2026-02-01:** Completed Plan 01-02 (MUSIC_SERVICE Provider Wiring)
- Configured MUSIC_SERVICE factory provider in app.module.ts
- Refactored AppComponent to inject MUSIC_SERVICE token
- Updated test configuration to match app.module provider setup
- All 124 tests passing
- Duration: 2 min

**2026-02-01:** Completed Plan 01-03 (Dual Sign-in UI)
- Added dual sign-in buttons (Spotify and Apple Music) to landing page
- Styled with official brand colors (Spotify #1DB954, Apple Music #FA233B)
- Responsive layout: side-by-side on desktop, stacked on mobile
- Apple Music button disabled with "Coming Soon" badge
- All 124 tests passing
- Duration: 3 min

**2026-02-01:** Completed Plan 01-01 (MusicService Interface)
- Created MusicService interface in `src/app/services/music-service.interface.ts`
- Created MUSIC_SERVICE InjectionToken in `src/app/services/music-service.token.ts`
- Refactored SpotifyService to implement MusicService
- All 63 SpotifyService tests pass
- Duration: 2 min

**2026-02-01:** Roadmap created with 4 phases, 9 v1 requirements mapped

**2026-01-31:** Research completed & Project initialized

---

## Session Continuity

**Last session:** 2026-02-05
**Stopped at:** Completed Plan 03-04 (Integration Verification) - Phase 3 verified
**Resume file:** None

**For next session:**
1. Phase 3 complete and verified - Apple Music integration working
2. Next: Plan Phase 4 (Production Validation)
3. No blockers - ready for production testing

**Context to preserve:**
- Phases 1, 2 & 3 complete and verified
- Dual-provider login working (Spotify and Apple Music)
- 170 tests passing
- Rate limiting: sequential requests, 500ms delay, exponential backoff
- 20 artist limit in place for development (TODO: remove for production)
- Phase 4 focus: Mobile Safari testing, error handling, production deployment

**Files to reference:**
- `.planning/phases/03-apple-music-integration/03-04-SUMMARY.md` - Verification summary
- `src/app/services/apple-music.service.ts` - Apple Music service with rate limiting
- `.planning/ROADMAP.md` - Phase structure and success criteria

---

*State initialized: 2026-02-01*
*Last updated: 2026-02-05 (Phase 3 complete)*
