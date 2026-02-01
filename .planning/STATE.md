# Project State: Album Anniversaries - Apple Music Integration

**Last updated:** 2026-02-01
**Current phase:** 2 of 4 (Backend Infrastructure)
**Status:** In Progress

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-01-31)

**Core value:** Users can celebrate album anniversaries for music they actually listen to — regardless of whether they use Spotify or Apple Music.

**Current focus:** Phase 2 in progress - Backend infrastructure for Apple Music

**Milestone:** Apple Music Integration (4 phases total)

---

## Current Position

**Phase:** 2 of 4 (Backend Infrastructure) - IN PROGRESS
**Plan:** 1 of 1 complete (02-01)
**Status:** Phase 2 complete - Ready for Phase 3 (pending user setup)
**Last activity:** 2026-02-01 - Completed 02-01-PLAN.md

### Progress Bar
```
[████○] 33% (4/12 plans across 4 phases)
Phase 1: [███] 3/3 plans - COMPLETE
Phase 2: [█] 1/1 plan - COMPLETE (pending user credentials)
Phase 3: ○ Pending
Phase 4: ○ Pending
```

---

## Performance Metrics

**Phases completed:** 2 / 4 (Phase 1 & 2)
**Requirements completed:** 4 / 9 (ABST-01, ABST-02, UI-01, AUTH-02)
**Plans executed:** 4 / 12

**Plan 01-01 duration:** 2 min
**Plan 01-02 duration:** 2 min
**Plan 01-03 duration:** 3 min
**Plan 02-01 duration:** 4 min
**Velocity:** 2.8 min/plan (sample size: 4)
**Estimated completion:** TBD

---

## Accumulated Context

### Decisions

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

**Apple Music "top artists" UX:**
- Accept "all library artists" difference, or invest Phase 3 research time exploring recently-played aggregation?
- Research recommends accepting the difference and setting clear user expectations
- **Decision:** TBD during Phase 3 planning

**Mobile Safari authentication fallbacks:**
- Privacy features break MusicKit popup authentication
- Fallback strategies unclear from research
- **Decision:** TBD during Phase 4 planning

### Active Blockers

**Phase 3 requires Apple Developer credentials**
- Phase 2 backend complete but cannot deploy until secrets configured
- Need Team ID, Key ID, and .p8 private key for MusicKit JWT signing
- Must enable Secret Manager API in Google Cloud Console
- Must set Firebase secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
- Cannot test getAppleMusicToken function until credentials configured

### Todos

- [x] Execute Plan 01-01 (MusicService interface)
- [x] Execute Plan 01-02 (provider wiring in app.module/app.component)
- [x] Execute Plan 01-03 (landing page UI)
- [x] Execute Plan 02-01 (Firebase Functions infrastructure)
- [ ] Enroll in Apple Developer Program before Phase 3
- [ ] Obtain MusicKit credentials (Team ID, Key ID, .p8 key) before Phase 3
- [ ] Enable Secret Manager API in Google Cloud Console
- [ ] Set Firebase secrets for Apple Developer credentials
- [ ] Deploy Firebase Functions with secrets configured
- [ ] Set up HTTPS localhost before Phase 3
- [ ] Obtain real iOS devices for Phase 4 testing

---

## Recent Activity

**2026-02-01:** Completed Plan 02-01 (Firebase Functions Infrastructure)
- Upgraded Firebase Functions from v2 (1st gen) to v5 (2nd gen) with Node 20 runtime
- Implemented getAppleMusicToken callable function with ES256 JWT signing
- Configured token caching with 180-day expiry and 1-hour refresh buffer
- Deployment ready but requires Apple Developer credentials and Secret Manager API enablement
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
- Phase 1: Service Abstraction & UI Foundation (ABST-01, ABST-02, UI-01)
- Phase 2: Backend Infrastructure (AUTH-02)
- Phase 3: Apple Music Integration (AUTH-01, AUTH-03, DATA-01, DATA-02, DATA-03)
- Phase 4: Production Validation (cross-platform testing)

**2026-01-31:** Research completed
- Comprehensive research findings in .planning/research/SUMMARY.md
- 15 critical pitfalls identified
- 6-phase structure suggested (compressed to 4 for quick depth)

**2026-01-31:** Project initialized
- PROJECT.md created with core value and constraints
- REQUIREMENTS.md created with 9 v1 requirements
- Research phase completed

---

## Session Continuity

**Last session:** 2026-02-01
**Stopped at:** Completed Plan 02-01-PLAN.md - Phase 2 Complete (pending user credentials)
**Resume file:** None

**For next session:**
1. Phase 2 complete - Firebase Functions infrastructure ready
2. Before Phase 3: User must enroll in Apple Developer Program, obtain credentials, and configure secrets
3. Phase 3 focuses on Apple Music client-side integration (MusicKit JS)

**Context to preserve:**
- Phase 1 & 2 complete
- Firebase Functions v2 infrastructure upgraded (Node 20, firebase-functions@5.0.0)
- getAppleMusicToken function implemented with ES256 JWT signing and token caching
- Function uses defineSecret for APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
- Deployment requires Secret Manager API enablement and secret configuration
- Quick depth = 3-5 phases, critical path only
- Phase 3 cannot start until credentials configured

**Files to reference:**
- `.planning/phases/02-backend-infrastructure/02-01-SUMMARY.md` - Firebase Functions infrastructure summary
- `functions/src/index.ts` - getAppleMusicToken callable function
- `functions/package.json` - Firebase Functions v2 dependencies
- `firebase.json` - Functions deployment configuration
- `.planning/phases/01-service-abstraction-ui-foundation/01-01-SUMMARY.md` - MusicService interface summary
- `.planning/ROADMAP.md` - Phase structure and success criteria

---

*State initialized: 2026-02-01*
