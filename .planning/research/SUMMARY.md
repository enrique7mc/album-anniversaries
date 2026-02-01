# Research Summary: Apple Music Integration

**Project:** Album Anniversaries - Apple Music Integration
**Domain:** Music streaming service integration (web application)
**Researched:** January 31, 2026
**Confidence:** MEDIUM-HIGH

## Executive Summary

Integrating Apple Music into the existing Angular 17 application requires a fundamentally different approach than Spotify. While Spotify uses pure client-side OAuth 2.0 with PKCE, Apple Music mandates a **backend component** for JWT token generation and lacks a direct equivalent to Spotify's "top artists" API. The integration centers on **MusicKit JS v3** (CDN-loaded library) with a two-token authentication system: a server-generated Developer Token and a client-obtained Music User Token.

The recommended approach uses a **provider-agnostic architecture** where both music services implement a common `MusicService` interface, with Angular's dependency injection providing the correct service at runtime. This allows components to remain completely decoupled from specific provider implementations. The existing codebase's `Artist` and `Album` models already represent provider-neutral data structures, so transformation happens at the service boundary.

Key risks center on authentication complexity (15 distinct pitfalls identified), the absence of "top artists" data (must use full library instead), and mobile Safari authentication failures with privacy features enabled. Backend infrastructure is mandatory—Firebase Cloud Functions (already in the stack) will handle ES256-signed JWT generation. The Apple Developer Program membership ($99/year) and HTTPS-even-for-localhost requirement add overhead compared to Spotify's zero-infrastructure approach.

## Key Findings

### Recommended Stack

**From STACK.md:** MusicKit JS v3 is the production-ready choice despite beta status, offering a single passthrough API method instead of fragmented endpoints. No npm package exists—CDN loading from `https://js-cdn.music.apple.com/musickit/v3/musickit.js` is mandatory. TypeScript support requires custom type definitions since community packages only support v1.

**Core technologies:**
- **MusicKit JS v3 (CDN)**: Client-side music API access — Apple's actively maintained version with recent 2025 documentation updates, eliminates v1's "bandaid logic"
- **Firebase Cloud Functions + jsonwebtoken**: Server-side Developer Token generation — Required for ES256 JWT signing with private keys, fits existing infrastructure with zero new deployment complexity
- **Custom TypeScript types**: Type safety for MusicKit v3 API — No official or community types exist for v3; manual `src/types/musickit.d.ts` required
- **Angular factory provider pattern**: Multi-provider dependency injection — InjectionToken with factory function to provide SpotifyService or AppleMusicService at runtime based on user selection

**Critical infrastructure requirements:**
- Apple Developer Program membership ($99/year, no free tier)
- Backend server for JWT signing (cannot be done client-side securely)
- HTTPS for localhost development (due to Encrypted Media Extensions requirements)

### Expected Features

**From FEATURES.md:** Apple Music API provides library-based access but fundamentally lacks listening-history analytics. The biggest gap: **no "top artists" endpoint equivalent**. Spotify's `/v1/me/top/artists?limit=50` returns algorithmically-ranked artists by listening patterns. Apple Music only offers `/v1/me/library/artists` which returns ALL library artists alphabetically with no personalization ranking.

**Must have (table stakes):**
- User library artist access (`/v1/me/library/artists`) — all saved artists, not ranked
- Artist album fetching via catalog IDs — requires library-to-catalog ID mapping step
- Album anniversary filtering by release date — same date filtering logic works for both providers
- Authentication with Music User Token — popup-based flow, no redirect option

**Should have (competitive):**
- Graceful UX around "all library artists" vs "top 50 artists" — set user expectations clearly
- Recently played tracks aggregation (`/v1/me/recent/played/tracks`) — limited to 50 unique songs, no frequency data, but provides some recency context
- Clear subscription requirement messaging — `/me/` endpoints require active Apple Music subscription

**Defer (v2+):**
- Heavy rotation data (API endpoint returns empty arrays in practice)
- Play count or listening statistics (not exposed to third-party developers)
- Direct feature parity with Spotify's algorithmic "top artists" (impossible with current API)

**Critical limitation:** Apple Music shows album anniversaries for ALL library artists (potentially hundreds), not just frequently-played ones. This is a UX difference users must understand. Documentation suggests setting expectations: "Spotify: Your Top 50 Artists' Album Anniversaries" vs "Apple Music: Album Anniversaries from Your Library."

### Architecture Approach

**From ARCHITECTURE.md:** Create a service-agnostic architecture using Angular's factory provider pattern. Define an abstract `MusicService` class with shared interface methods (`loadArtistsWithAlbums()`, `artists` observable, static date filtering methods). Both `SpotifyService` and `AppleMusicService` extend this base class, implementing provider-specific data transformation logic internally. Components inject the `MUSIC_SERVICE` InjectionToken instead of concrete service classes, with a factory function selecting the correct service based on `MusicProviderSelectionService` state.

**Major components:**
1. **MusicService abstract class** — Defines contract for all providers, includes shared date filtering static methods (albumHadBirthdayPastWeek, albumReleasedPastYear)
2. **Provider-specific services** — SpotifyService and AppleMusicService extend MusicService, handle authentication, API calls, and transformation to shared Artist/Album models
3. **Factory provider with InjectionToken** — MusicProviderModule.forRoot() provides MUSIC_SERVICE token using factory that selects service based on user's provider choice
4. **State management services** — MusicProviderSelectionService (tracks current provider in sessionStorage), AuthStateService (separate token storage per provider in localStorage)
5. **Data transformation layer** — Each service implements private mapping methods to transform provider-specific API responses to shared Artist/Album interfaces

**Key architectural decisions:**
- Abstract class (not interface) for shared utility methods
- Factory provider pattern for type-safe dependency injection
- sessionStorage for provider selection (per-session choice), localStorage for tokens (persistent)
- Existing Artist/Album models remain unchanged (already provider-agnostic)

### Critical Pitfalls

**From PITFALLS.md — 15 pitfalls identified, top 5 critical:**

1. **Developer Token JWT Misconfiguration (Phase 1)** — Adding extra claims like `aud` or `sub` causes "UNABLE TO VERIFY JWT" errors. Only include required claims: `iss` (Team ID), `iat`, `exp`, and header with `kid` (Key ID). Do NOT use Sign in with Apple claims. Test with curl before proceeding.

2. **No Token Refresh Mechanism (Phase 2)** — Music User Tokens expire after ~6 months with NO refresh token. Unlike Spotify's automatic refresh, MusicKit requires manual re-authentication. Implement proactive token expiration detection and graceful re-auth prompts—don't silently fail.

3. **HTTPS Required for Localhost Development (Phase 1)** — MusicKit requires HTTPS even for localhost due to Encrypted Media Extensions (EME) security. Use `ng serve --ssl --host 127.0.0.1` and configure `https://127.0.0.1:4200` redirect URI in Apple Developer Dashboard. Set up self-signed certificates immediately—this blocks all other work.

4. **CDN Script Loading Race Conditions (Phase 1)** — Using `async` attribute on MusicKit script tag causes intermittent failures (~25% success rate). Remove `async`, wait for `musickitloaded` event before calling `MusicKit.configure()`. Add script to `angular.json` scripts array for better control.

5. **Mobile Safari Authentication Failures (Phase 3)** — Desktop authentication works, mobile iOS Safari fails, especially with Private Browsing or Advanced Privacy Protection. MusicKit uses `document.referrer` for popup verification which breaks with privacy features. Test on real iOS devices early, implement fallback strategies, show clear messaging for privacy-protected browsers.

**Additional high-impact pitfalls:**
- **Sign in with Apple confusion:** MusicKit requires separate Music User Token via `MusicKit.authorize()`, NOT Apple ID OAuth tokens
- **OnPush change detection:** MusicKit events occur outside Angular's zone; use `NgZone.run()` and `ChangeDetectorRef.markForCheck()` in OnPush components
- **Dual provider state management:** Namespace all localStorage keys (`spotify_token` vs `apple_music_token`), test all combinations of logged-in states
- **Missing subscription check:** `/me/` endpoints require active Apple Music subscription; check explicitly and show clear messaging for non-subscribers

## Spotify vs Apple Music Comparison

| Aspect | Spotify (Current) | Apple Music (New) |
|--------|-------------------|-------------------|
| **Auth Flow** | OAuth 2.0 PKCE (client-side only) | Two-token system (Developer Token + Music User Token) |
| **Backend Required** | No (pure client-side) | Yes (JWT signing with ES256) |
| **Cost** | Free API access | $99/year Apple Developer Program |
| **Top Artists Endpoint** | `/v1/me/top/artists?limit=50` (algorithmic ranking) | No equivalent (use `/v1/me/library/artists` - all artists, alphabetical) |
| **Token Refresh** | Automatic with refresh token | Manual re-auth required (no refresh token) |
| **Token Lifetime** | 1 hour (auto-refresh) | ~6 months Music User Token, 180 days Developer Token (manual rotation) |
| **User Flow** | Redirect-based | Popup window |
| **Token Storage** | localStorage (app manages) | MusicKit manages Music User Token |
| **Localhost Setup** | HTTP allowed | HTTPS required (EME security) |
| **Library vs Catalog** | Single ID system | Separate library IDs and catalog IDs (requires mapping) |
| **Mobile Testing** | Standard OAuth | Privacy features break authentication; requires real device testing |
| **TypeScript Support** | Good community packages | No official types; custom definitions required |
| **Rate Limits** | Documented in headers | Undocumented, no headers provided |
| **API Data Access** | Listening history analytics | Library-focused, no listening frequency data |

## Impact on Implementation

### What's Harder Than Expected

1. **Backend requirement contradicts current architecture** — Spotify integration is 100% client-side. Apple Music mandates Firebase Cloud Functions for JWT signing. This adds deployment complexity, environment variable management, and backend testing.

2. **No "top artists" equivalent fundamentally changes UX** — Can't replicate Spotify's personalized experience. Must show ALL library artists or manually aggregate from 50 recent songs (poor data quality). Users will see more artists, less personalization.

3. **Authentication lifecycle management** — Spotify tokens auto-refresh transparently. Apple Music requires manual re-auth every 6 months with no automatic refresh mechanism. Must implement proactive expiration detection and user prompts.

4. **Library-to-catalog ID mapping adds API call overhead** — Spotify uses single artist ID system. Apple Music requires: (1) fetch library artists, (2) map to catalog IDs via `/library/artists/{id}/catalog`, (3) fetch albums from catalog. Triple the API calls per artist.

5. **Mobile Safari as critical path blocker** — Desktop browsers work reliably. iOS Safari authentication fails with privacy features enabled. Must test on real devices (not emulators) during development, not at the end.

6. **HTTPS localhost requirement** — Development setup complexity increases. Need SSL certificates for local development, HTTPS dev server configuration, Apple Developer Dashboard redirect URI updates.

### What's Straightforward

1. **Shared data models already compatible** — Existing `Artist` and `Album` interfaces are provider-agnostic. Both APIs provide release dates, images, names, external URLs in similar formats. Transformation layer can map cleanly.

2. **Date filtering logic reusable** — `albumHadBirthdayPastWeek()`, `albumReleasedPastYear()` methods work identically for both providers. Move to static methods on `MusicService` base class.

3. **Angular dependency injection handles provider switching cleanly** — Factory provider pattern with InjectionToken is built for this use case. Components don't need modification once refactored to inject `MUSIC_SERVICE` instead of `SpotifyService`.

4. **Firebase Cloud Functions already in stack** — Backend requirement isn't introducing new infrastructure. Just need to add `jsonwebtoken` npm package and create token generation function.

5. **Testing infrastructure in place** — Existing Jasmine/Karma setup with OnPush mocking patterns (124 tests, 100% passing) can be replicated for AppleMusicService. Just need to mock global `MusicKit` object.

## Recommendations

### Phase 1: Refactor for Multi-Provider Architecture (1 week)

**Do this FIRST** — Refactor SpotifyService to abstract architecture before touching Apple Music. This validates the abstraction approach with working code.

**Actions:**
- Create `MusicService` abstract class with interface definition
- Move `SpotifyService` to `src/app/services/spotify/` directory
- Extract Spotify-specific interfaces to `spotify-response.types.ts`
- Update `SpotifyService` to extend `MusicService`
- Move date filtering methods to `MusicService` as static methods
- Create `MusicProviderSelectionService` and `AuthStateService`
- Run full test suite (124 tests must pass)
- **Research flag:** LOW — refactoring existing working code with established patterns

### Phase 2: Factory Provider Setup (1 week)

**Dependency injection layer** — Make DI dynamic before adding second provider.

**Actions:**
- Create `MUSIC_SERVICE` InjectionToken
- Implement `MusicProviderModule.forRoot()` with factory provider
- Update `AppComponent` to inject `MUSIC_SERVICE` instead of concrete `SpotifyService`
- Update authentication flow to use `AuthStateService`
- Add provider selection UI (Spotify only initially, validates factory logic)
- Verify application works end-to-end with new architecture
- **Research flag:** LOW — standard Angular pattern, well-documented

### Phase 3: Backend Infrastructure (3-5 days)

**Apple Developer setup and Firebase Functions** — This is the prerequisite blocker for Phase 4.

**Actions:**
- Enroll in Apple Developer Program ($99/year payment)
- Create MusicKit Identifier in Apple Developer Portal
- Generate Media Identifier Private Key (.p8 file, downloadable only once)
- Record Team ID and Key ID
- Store .p8 content in Firebase environment config (never commit to git)
- Create Firebase Function for Developer Token generation using `jsonwebtoken`
- Implement 180-day expiration with rotation logic
- Test JWT generation: `curl -H 'Authorization: Bearer [token]' https://api.music.apple.com/v1/test`
- **Research flag:** MEDIUM — Need to research Firebase Functions environment variable best practices and JWT token rotation strategies

### Phase 4: MusicKit JS Integration (2 weeks)

**Add Apple Music as second provider** — Now the architecture and backend are ready.

**Actions:**
- Set up HTTPS localhost: `ng serve --ssl --host 127.0.0.1`
- Generate self-signed certificates
- Add MusicKit v3 script to `angular.json` scripts array (no `async` attribute)
- Create custom TypeScript definitions in `src/types/musickit.d.ts`
- Create `AppleMusicService` extending `MusicService`
- Implement two-token authentication flow (Developer Token fetch + Music User Token authorization)
- Implement data fetching: library artists, catalog mapping, albums
- Create transformation methods from Apple Music API responses to `Artist`/`Album` models
- Handle NgZone integration for MusicKit events in OnPush components
- Register `AppleMusicService` in `MusicProviderModule` factory
- Test provider switching between Spotify and Apple Music
- **Research flag:** HIGH — Complex integration with 15+ known pitfalls, mobile testing critical

### Phase 5: Mobile Testing & Edge Cases (1 week)

**Mobile Safari is a different platform** — Desktop success doesn't predict mobile success.

**Actions:**
- Test on real iPhone/iPad devices (not emulators)
- Test with Safari Private Browsing mode enabled
- Test with Advanced Privacy Protection enabled
- Implement fallback authentication strategies for privacy-protected browsers
- Test browser language settings (non-English configurations)
- Verify subscription detection and show clear non-subscriber messaging
- Test token expiration and re-authentication flows
- Implement error handling for mobile-specific failures
- **Research flag:** MEDIUM — Need to research mobile authentication fallback strategies and privacy feature detection

### Phase 6: Polish & Production Readiness (3-5 days)

**UX improvements and production hardening**

**Actions:**
- Add provider icons/branding to login screen
- Add current provider indicator in header
- Implement "Switch Provider" functionality with clear logout flow
- Add loading states when switching providers
- Document "all library artists" vs "top 50 artists" difference in UI
- Implement client-side rate limiting and request throttling
- Add comprehensive error logging for debugging
- Write integration tests for multi-provider scenarios
- Update CLAUDE.md and README with Apple Music setup instructions
- **Research flag:** LOW — Standard production polish patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | MusicKit v3, Firebase Functions, custom TypeScript types all verified with official Apple docs and community examples |
| **Features** | **MEDIUM-HIGH** | Library access endpoints confirmed, "top artists" gap is well-documented limitation, workarounds researched |
| **Architecture** | **HIGH** | Factory provider pattern is standard Angular approach, existing codebase structure supports abstraction, shared models already provider-agnostic |
| **Pitfalls** | **MEDIUM-HIGH** | 15 pitfalls identified from Apple Developer Forums and community reports; mobile Safari issues need real-device validation |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

**"Top artists" replacement strategy needs validation** — Research identified the limitation but didn't test real-world UX impact. During Phase 4 implementation, need to:
- Prototype library artist display to assess UI/performance with 100+ artists
- Test recently-played aggregation approach with real user data
- Gather user feedback on "all library" vs "top 50" experience
- Potentially implement client-side ranking by recency if needed

**Mobile Safari authentication workarounds need prototyping** — Pitfall #6 identified privacy feature authentication failures, but solutions are unclear. During Phase 5, need to:
- Research if server-side token generation bypasses popup issues
- Test redirect-based auth as fallback for privacy-protected browsers
- Investigate if WebView detection allows alternative flows
- File Apple bug reports if issues persist

**Rate limiting strategy needs empirical testing** — Apple doesn't document limits or provide headers. During Phase 4/6, need to:
- Implement request tracking and measure actual limits in development
- Test with large libraries (500+ artists) to identify breaking points
- Implement exponential backoff and retry logic
- Cache aggressively to minimize API calls

**Token rotation automation needs design** — Developer Token expires in 180 days, Music User Token in ~6 months. Need to:
- Design Firebase Function cron job for automatic Developer Token rotation
- Implement Music User Token expiration detection (no explicit API)
- Create user notification system for re-authentication requirements
- Test token lifecycle edge cases (expired during active session, etc.)

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Abstraction Layer (Week 1)

**Rationale:** Validate the multi-provider architecture with working Spotify code before adding Apple Music complexity. De-risks the abstraction approach and establishes patterns for Phase 4.

**Delivers:**
- Refactored codebase with `MusicService` abstraction
- SpotifyService extending base class
- State management services (MusicProviderSelectionService, AuthStateService)
- All existing functionality working with new architecture

**Addresses:**
- Architecture foundation from ARCHITECTURE.md
- Dual provider state management (Pitfall #14)
- Preparation for OnPush change detection issues (Pitfall #15)

**Avoids:**
- Attempting architecture changes while adding new provider (too many moving pieces)
- Discovering abstraction doesn't work after Apple Music implementation started

**Research flag:** LOW (refactoring existing working code)

### Phase 2: Factory Provider Pattern (Week 2)

**Rationale:** Establish dynamic dependency injection before adding second provider. Validates that components can remain provider-agnostic.

**Delivers:**
- MusicProviderModule with InjectionToken factory
- AppComponent and other components using MUSIC_SERVICE injection
- Provider selection UI (Spotify only, validates factory logic)
- End-to-end functionality with factory pattern

**Uses:**
- Angular factory provider pattern from STACK.md
- Dependency injection best practices from ARCHITECTURE.md

**Implements:**
- Factory provider with InjectionToken (Architecture component #3)

**Avoids:**
- Adding second provider before DI layer works correctly
- Hard-coding provider selection logic in components

**Research flag:** LOW (standard Angular pattern)

### Phase 3: Backend Infrastructure (Week 3, Days 1-3)

**Rationale:** Backend is prerequisite blocker for Apple Music. Must be working before MusicKit integration can start. Keep separate from client integration for clear testing.

**Delivers:**
- Apple Developer Program enrollment completed
- MusicKit credentials (Team ID, Key ID, private key .p8)
- Firebase Function generating valid Developer Tokens
- Environment variable configuration for production/development
- JWT token generation tested and verified

**Uses:**
- Firebase Cloud Functions + jsonwebtoken from STACK.md
- ES256 JWT signing pattern from authentication flow

**Addresses:**
- Backend requirement gap vs Spotify
- Developer Token generation infrastructure

**Avoids:**
- Developer Token JWT misconfiguration (Pitfall #1 - most critical)
- Exposing private keys in client code
- 12-hour token expiration without rotation strategy

**Research flag:** MEDIUM (Firebase Functions environment config and JWT rotation)

### Phase 4: MusicKit Integration (Week 3-4, Days 4-14)

**Rationale:** With backend working and architecture proven, now integrate MusicKit JS as second provider. This is the highest-risk phase with most pitfalls.

**Delivers:**
- HTTPS localhost development environment
- MusicKit v3 script loaded correctly
- Custom TypeScript type definitions
- AppleMusicService implementing MusicService interface
- Two-token authentication flow working
- Library artists and albums fetching
- Data transformation to shared models
- Provider switching between Spotify and Apple Music

**Uses:**
- MusicKit JS v3 CDN from STACK.md
- Custom TypeScript types approach
- Data transformation layer from ARCHITECTURE.md
- NgZone integration for OnPush components

**Addresses:**
- Apple Music integration (core requirement)
- Library-based "top artists" alternative from FEATURES.md
- Data transformation to shared Artist/Album models

**Avoids (critical pitfalls from PITFALLS.md):**
- HTTPS localhost requirement (Pitfall #3)
- CDN script loading race conditions (Pitfall #4)
- Sign in with Apple confusion (Pitfall #5)
- No token refresh mechanism (Pitfall #2 - implement detection)
- TypeScript type definition issues (Pitfall #7)
- OnPush change detection (Pitfall #15)
- Dual provider state management (Pitfall #14)

**Research flag:** HIGH (15+ identified pitfalls, complex integration, mobile unknowns)

### Phase 5: Mobile Testing (Week 5, Days 1-3)

**Rationale:** Mobile Safari is fundamentally different platform per research. Must test early enough to pivot if authentication fails.

**Delivers:**
- Verified authentication on real iOS devices
- Safari privacy feature handling
- Browser language setting compatibility
- Subscription detection and messaging
- Token expiration/re-authentication flows
- Mobile-specific error handling

**Addresses:**
- Mobile Safari authentication failures (Pitfall #6)
- Browser language issues (Pitfall #10)
- Missing subscription check (Pitfall #11)

**Avoids:**
- Discovering mobile breaks days before launch
- Privacy feature authentication failures without fallback

**Research flag:** MEDIUM (authentication fallback strategies unclear)

### Phase 6: Production Polish (Week 5, Days 4-7)

**Rationale:** With both providers working on all platforms, polish UX and harden for production.

**Delivers:**
- Provider selection UI with branding
- Current provider indicator
- Provider switching functionality
- Loading states and error handling
- Rate limiting and request throttling
- Documentation updates (CLAUDE.md, README)
- Integration tests for multi-provider scenarios

**Addresses:**
- Rate limiting (Pitfall #8)
- Testing infrastructure (Pitfall #12)
- Production UX improvements

**Avoids:**
- Undocumented rate limits causing production failures
- Poor UX around provider differences

**Research flag:** LOW (standard production patterns)

### Phase Ordering Rationale

**Why Phase 1-2 before backend:** Validate abstraction approach with working code before adding new provider complexity. If factory pattern doesn't work, discover early without wasting time on backend setup.

**Why backend (Phase 3) before MusicKit (Phase 4):** Backend is hard prerequisite. MusicKit can't authenticate without Developer Token. Separating these phases allows focused testing and clearer debugging.

**Why mobile testing (Phase 5) before polish (Phase 6):** Mobile Safari failures could require authentication flow redesign (e.g., redirect instead of popup). Must discover this before final polish, not after.

**Why not parallel backend + MusicKit:** Developer Token JWT misconfiguration (Pitfall #1) is the #1 critical pitfall. Testing JWT generation in isolation before mixing with MusicKit client code prevents "is it backend or client?" debugging loops.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Backend Infrastructure):** Firebase Functions environment variable best practices, JWT token rotation automation strategies, Developer Token caching/distribution
- **Phase 4 (MusicKit Integration):** Library artist display performance testing, OnPush change detection patterns with MusicKit events, catalog ID mapping optimization
- **Phase 5 (Mobile Testing):** Authentication fallback strategies for privacy-protected browsers, WebView detection approaches, server-side token generation as popup alternative

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Abstraction Layer):** Refactoring existing working code, established Angular patterns
- **Phase 2 (Factory Provider):** Well-documented Angular DI pattern, multiple official examples
- **Phase 6 (Production Polish):** Standard production hardening, existing testing infrastructure

## Sources

### Primary (HIGH confidence - Official Documentation)
- [MusicKit - Apple Developer](https://developer.apple.com/musickit/)
- [MusicKit JS v3 Documentation](https://js-cdn.music.apple.com/musickit/v3/docs/index.html)
- [Apple Music API Reference](https://developer.apple.com/documentation/applemusicapi)
- [Generating Developer Tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)
- [User Authentication for MusicKit](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)
- [Get All Library Artists](https://developer.apple.com/documentation/applemusicapi/get-all-library-artists)
- [Get Recently Played Tracks](https://developer.apple.com/documentation/applemusicapi/get_recently_played_tracks)
- [Angular Dependency Injection Guide](https://angular.dev/guide/di)
- [Defining Dependency Providers - Angular](https://angular.dev/guide/di/defining-dependency-providers)

### Secondary (MEDIUM confidence - Community consensus)
- [Apple Music Token Generator (GitHub)](https://github.com/pelauimagineering/apple-music-token-generator) — JWT generation examples
- [Angular + MusicKit JS Example Project](https://github.com/svkozak/music-player) — Full working implementation
- [Building an iPod: Part 3 — MusicKit JS](https://krisztian-seres.medium.com/building-an-ipod-part-3-integrating-apple-musickit-js-281f050321c0) — Integration patterns
- [Storing Apple Music User Token (Medium)](https://medium.com/@gavinkasdorf/apples-musickit-js-allows-you-to-access-an-apple-music-user-s-playlists-and-library-listen-to-32f77ff54d48) — Token lifecycle
- [Apple Developer Forums - MusicKit tag](https://developer.apple.com/forums/tags/apple-music-api) — Real-world pitfall reports
- [The Hidden Power of InjectionToken Factory Functions](https://medium.com/netanelbasal/the-hidden-power-of-injectiontoken-factory-functions-in-angular-d42d5575859b) — Angular patterns
- [Strategy Pattern the Angular Way](https://www.angularspace.com/strategy-pattern-the-angular-way-di-and-runtime-flexibility/) — Factory provider examples

### Tertiary (LOW confidence - Single sources, needs validation)
- [Does Apple Music have an API? (Musicfetch)](https://musicfetch.io/services/apple-music/api) — Rate limit estimates (unconfirmed by Apple)
- [Reverse engineering MusicKitJS (DEV)](https://dev.to/jurooravec/reverse-engineering-apple-s-musickitjs-to-create-apple-music-strategy-for-passportjs-12h) — Authentication flow internals
- [Displaying listening data from Apple Music](https://www.coryd.dev/posts/2023/displaying-listening-data-from-apple-music-using-musickitjs) — Library access patterns
- Individual Apple Developer Forum threads on specific issues (403 errors, mobile failures, etc.)

### Pitfall Sources (HIGH confidence - Multiple corroborating reports)
- 15 distinct pitfalls sourced from 40+ Apple Developer Forum threads, GitHub issues, and community blog posts
- Each pitfall verified with multiple independent reports except mobile Safari issues (needs real-device validation)

---

**Research completed:** January 31, 2026
**Ready for roadmap:** Yes
**Next step:** Use this summary to create `.planning/ROADMAP.md` with detailed phase breakdown

**Key decision for roadmapper:** Accept "all library artists" UX difference from Spotify, or invest Phase 4 research time exploring recently-played aggregation as alternative? Research recommends accepting the difference and setting clear user expectations.
