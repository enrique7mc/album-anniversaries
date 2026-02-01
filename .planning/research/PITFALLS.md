# Pitfalls Research: MusicKit Integration

## Critical Pitfalls

### 1. Developer Token JWT Misconfiguration
**What goes wrong:** Adding extra JWT claims (like `aud` and `sub`) causes "UNABLE TO VERIFY JWT" errors during authorization. Developer tokens become invalid after 12 hours, but unlike access tokens, this is rarely documented clearly.

**Warning signs:**
- Authentication redirects to Apple but immediately returns with "UNABLE TO VERIFY JWT" in URL
- 401 errors from Apple Music API after working for hours
- Different behavior between local development and production environments

**Prevention:**
- Only include required JWT claims: `iss` (Team ID), `iat`, `exp`, and header with `kid` (Key ID)
- Do NOT add `aud` or `sub` claims (these are for Sign in with Apple, not MusicKit)
- Set up monitoring for 401 errors and implement token rotation before 12-hour expiration
- Test developer token with: `curl -v -H 'Authorization: Bearer [token]' "https://api.music.apple.com/v1/test"`

**Phase:** Phase 1 (Authentication Setup) - Must be correct before any API calls work

**Sources:**
- [MusicKit User Token Issues | Apple Developer Forums](https://developer.apple.com/forums/thread/703942)
- [MusicKit JS Authentication Issues | Apple Developer Forums](https://developer.apple.com/forums/thread/103790)
- [Token Only Valid for 12 Hours · Issue #2](https://github.com/pelauimagineering/apple-music-token-generator/issues/2)

### 2. No Token Refresh Mechanism
**What goes wrong:** Music User Tokens expire after approximately 6 months (sometimes 1-2 days) with NO refresh token provided. Unlike Spotify's OAuth flow with automatic refresh tokens, MusicKit requires users to re-authenticate manually. This creates a poor UX for long-lived sessions.

**Warning signs:**
- 403 "Invalid authentication" errors from `/me/` endpoints after successful authorization
- Tokens that work initially but fail after days/weeks without clear errors
- User complaints about being logged out unexpectedly

**Prevention:**
- Implement token expiration detection and graceful re-authentication prompts
- Store token timestamp and proactively prompt re-auth before expiration
- Consider implementing a "keep-alive" mechanism that periodically validates the token
- Show clear messaging when re-authentication is required (don't silently fail)

**Phase:** Phase 2 (User Authentication Flow) - Critical for production UX

**Sources:**
- [When does a Music User token expire | Apple Developer Forums](https://developer.apple.com/forums/thread/654814)
- [Apple Music: Use MusicKit for the Web to Authorise Media Tokens · Discussion #3897](https://github.com/orgs/music-assistant/discussions/3897)
- [Storing the Apple Music User Token with MusicKit JS | Medium](https://medium.com/@gavinkasdorf/apples-musickit-js-allows-you-to-access-an-apple-music-user-s-playlists-and-library-listen-to-32f77ff54d48)

### 3. HTTPS Required for Localhost Development
**What goes wrong:** MusicKit requires HTTPS even for localhost due to Encrypted Media Extensions (EME) security requirements. Developers get "EME use is not allowed on unique origins" errors when testing on `http://localhost`.

**Warning signs:**
- "MEDIA_KEY: NotSupportedError: Failed to execute 'createMediaKeys'" errors
- "EME use is not allowed on unique origins" console errors
- Music playback fails even though authentication succeeds

**Prevention:**
- Set up local HTTPS development environment with SSL certificates from day one
- Use `https://127.0.0.1:4200` instead of `http://localhost:4200`
- Add HTTPS redirect URI to Apple Developer configuration: `https://127.0.0.1:4200`
- Configure Angular dev server with SSL: `ng serve --ssl --host 127.0.0.1`
- Generate self-signed certificates for local development

**Phase:** Phase 1 (Development Environment Setup) - Block all other work until resolved

**Sources:**
- [MusicKit JS webplayer | Apple Developer Forums](https://developer.apple.com/forums/thread/698191)
- [Introduction to Encrypted Media Extensions | web.dev](https://web.dev/articles/eme-basics)
- [Apple Music JavaScript integration guide](https://areknawo.com/apple-music-javascript-integration-guide/)

### 4. CDN Script Loading Race Conditions
**What goes wrong:** Using the `async` attribute on the MusicKit CDN script tag causes intermittent loading failures (works only ~25% of the time on page reload). MusicKit must be loaded via `<script>` tag from Apple's CDN - there's no npm package.

**Warning signs:**
- `MusicKit is not defined` errors on page load
- Inconsistent behavior between page refreshes
- Works in development but fails in production randomly
- TypeScript errors about missing `MusicKit` global

**Prevention:**
- Remove `async` attribute from MusicKit script tag in `index.html`
- Wait for `musickitloaded` event before calling `MusicKit.configure()`
- Add script loading verification in initialization code
- Use correct CDN URL for your version (v1 vs v3 have different URLs)
- Consider adding script to `angular.json` scripts array for better control

**Phase:** Phase 1 (Integration Setup) - Required before any MusicKit code can run

**Sources:**
- [MusicKit JS not playing | Apple Developer Forums](https://developer.apple.com/forums/thread/108376)
- [Apple Music JavaScript integration guide](https://areknawo.com/apple-music-javascript-integration-guide/)
- [Getting Started • MusicKit on the Web](https://js-cdn.music.apple.com/musickit/v3/docs/index.html?path=/story/get-started--page)

### 5. Confusing Sign in with Apple vs MusicKit Authorization
**What goes wrong:** Developers assume "Sign in with Apple" OAuth provides access to Apple Music data. It doesn't. MusicKit requires a separate Music User Token obtained through `MusicKit.authorize()`, not Apple ID OAuth tokens.

**Warning signs:**
- Trying to use `access_token` or `id_token` from Sign in with Apple as `userToken` in MusicKit
- 403 errors when accessing `/me/` endpoints despite successful Apple ID authentication
- Documentation confusion between Apple Login and MusicKit flows

**Prevention:**
- Treat MusicKit authentication as completely separate from Apple ID OAuth
- Use `MusicKit.authorize()` for music access, not Sign in with Apple
- Don't attempt to combine or reuse tokens between the two systems
- Clearly document that these are two different authentication flows
- Apple Music subscription is required for `/me/` endpoints to work

**Phase:** Phase 2 (Authentication Flow) - Conceptual error that can derail entire implementation

**Sources:**
- [Reverse engineering Apple's MusicKitJS | DEV Community](https://dev.to/jurooravec/reverse-engineering-apple-s-musickitjs-to-create-apple-music-strategy-for-passportjs-12h)
- [User Authentication for MusicKit | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)

### 6. Mobile Safari Authentication Failures
**What goes wrong:** MusicKit authentication works perfectly on desktop browsers but fails on iOS Safari mobile, especially with Private Browsing or Advanced Privacy Protection enabled. MusicKit uses `document.referrer` to verify popup window opener identity, which breaks with privacy features.

**Warning signs:**
- Desktop authentication succeeds, mobile authentication fails
- "Cannot parse response" errors from `authorize.music.apple.com` on mobile
- Authentication redirects cause app reload in InAppBrowser/WebView
- Different behavior in mobile emulators vs real devices
- Errors only appear with Safari privacy features enabled

**Prevention:**
- Test on real iOS devices early, not just emulators
- Implement fallback authentication strategies for privacy-protected browsers
- Consider detecting Safari privacy mode and showing informative messages
- Test with Safari's Private Browsing mode during development
- File bug reports with Apple when encountering mobile-specific issues
- Avoid third-party libraries like `pwacompat` that interfere with authentication

**Phase:** Phase 3 (Mobile Testing) - Critical before production launch

**Sources:**
- [MusicKitJS won't work on browsers | Apple Developer Forums](https://developer.apple.com/forums/thread/120290)
- [Apple Music (MusicKit SDK) authentication fails | webkit-changes](https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg224676.html)
- [MusicKit JS v3 authentication fail | Apple Developer Forums](https://developer.apple.com/forums/thread/709241)

## Common Mistakes

### 7. TypeScript Type Definition Issues
**What goes wrong:** MusicKit JS has no official TypeScript types. The community package `musickit-typescript` was last updated in 2020 and may be outdated. Types must be manually added to `tsconfig.json` typeRoots.

**Warning signs:**
- `Property 'MusicKit' does not exist on type 'Window'` errors
- No autocomplete for MusicKit API in IDE
- Type errors when accessing MusicKit instance methods

**Prevention:**
- Install `musickit-typescript` package: `npm i -D musickit-typescript`
- Add `node_modules/musickit-typescript` to `tsconfig.json` typeRoots
- Declare global `MusicKit` interface if types are missing features
- Be prepared to create custom type definitions for newer API features
- Consider using `// @ts-ignore` sparingly for known type gaps

**Phase:** Phase 1 (Development Setup) - Quality of life improvement

**Sources:**
- [GitHub - wsmd/musickit-typescript](https://github.com/wsmd/musickit-typescript)
- [musickit-typescript - npm](https://www.npmjs.com/package/musickit-typescript)
- [Building an iPod: Part 3 — Integrating Apple MusicKit JS | Medium](https://krisztian-seres.medium.com/building-an-ipod-part-3-integrating-apple-musickit-js-281f050321c0)

### 8. Rate Limiting and Missing Headers
**What goes wrong:** Apple Music API has rate limits but doesn't include rate limit information in response headers. iTunes Search API is limited to ~20 calls/minute, but main API limits are undocumented.

**Warning signs:**
- 403 errors appearing after ~25 requests from same IP
- "Too many requests" errors without clear retry guidance
- Production apps hitting sudden request failures

**Prevention:**
- Implement client-side request throttling/debouncing
- Cache API responses aggressively (album/artist data rarely changes)
- Use batch requests where possible to reduce API calls
- Monitor 403 errors and implement exponential backoff
- Consider backend proxy to manage rate limits server-side

**Phase:** Phase 4 (Production Optimization) - Performance and reliability concern

**Sources:**
- [iTunes search rate limited? 403 | Apple Developer Forums](https://developer.apple.com/forums/thread/66399?page=2)
- [What are the rate limits for the Apple Music API?](https://developer.apple.com/forums/thread/699396)
- [Call Limit of the Apple Music API | Apple Developer Forums](https://developer.apple.com/forums/thread/774891)

### 9. Album Search and Sorting Issues
**What goes wrong:** API search results don't sort albums chronologically. Singles changed behavior - now only appear as tracks inside albums rather than separate albums with "- Single" suffix. Search term can only be one criterion (song name OR album OR artist), not multiple.

**Warning signs:**
- Recent albums not appearing first in results
- Singles missing from artist album lists
- Search results requiring manual pagination and sorting
- Unexpected differences compared to Spotify API search behavior

**Prevention:**
- Fetch all pages of artist albums and sort client-side by release date
- Search for both albums AND tracks to capture singles
- Implement client-side filtering/sorting after fetching data
- Don't assume API results are chronologically ordered
- Test with artists who have many releases to catch pagination issues

**Phase:** Phase 3 (Data Fetching & Display) - Impacts feature parity with Spotify

**Sources:**
- [Search for Catalog Resources | Apple Music API](https://developer.apple.com/documentation/applemusicapi/search_for_catalog_resources)
- [How to query for an artists latest release](https://developer.apple.com/forums/thread/653885)
- [Search API not working for artists | Apple Developer Forums](https://developer.apple.com/forums/thread/92466)

### 10. Browser Language Settings Breaking Authentication
**What goes wrong:** MusicKit authentication fails if browser language is set to anything other than English. Having multiple languages installed can also cause authentication issues.

**Warning signs:**
- Authentication works for some users but not others
- Geo-location specific authentication failures
- Users reporting login issues from non-English regions

**Prevention:**
- Test with different browser language settings during development
- Document language requirements for users if unable to fix
- Implement language detection and show warnings if needed
- File bug reports with Apple for non-English authentication issues
- Consider server-side token generation as workaround

**Phase:** Phase 3 (International Testing) - Critical for global audience

**Sources:**
- [MusicKitJS won't work on browsers | Apple Developer Forums](https://developer.apple.com/forums/thread/120290)
- [MusicKit JS Authentication Issues | Apple Developer Forums](https://developer.apple.com/forums/thread/103790)

### 11. Missing Subscription Check
**What goes wrong:** Accessing user library data via `/me/` endpoints requires an active Apple Music subscription, but developers forget to check this. Users get 403 errors without clear messaging.

**Warning signs:**
- 403 errors when accessing `/me/library`, `/me/playlists`
- Inconsistent behavior between different user accounts
- Authentication succeeds but data fetching fails

**Prevention:**
- Check subscription status after authentication: `MusicKit.getInstance().musicUserToken` exists doesn't guarantee subscription
- Implement explicit subscription detection and show clear messaging
- Gracefully handle non-subscribers (maybe show catalog data only)
- Test with both subscribed and non-subscribed Apple IDs
- Document subscription requirement in user-facing messaging

**Phase:** Phase 2 (Authentication Flow) - User experience concern

**Sources:**
- [User Authentication for MusicKit | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)
- [MusicKit User Token Issues | Apple Developer Forums](https://developer.apple.com/forums/thread/703942)

## Testing Gotchas

### 12. No Official Testing/Mocking Support
**What goes wrong:** MusicKit JS has no official mocking library or test utilities. The global `MusicKit` object loaded via CDN script makes unit testing difficult. No documented patterns for testing MusicKit integrations.

**Warning signs:**
- `MusicKit is not defined` errors in test environment
- Unable to mock API responses for unit tests
- Tests requiring real authentication to run
- Difficulty testing error scenarios

**Prevention:**
- Create manual mock of global `MusicKit` object for tests
- Use dependency injection to wrap MusicKit in a service (makes testing easier)
- Implement integration tests with real API rather than just unit tests
- Use TypeScript to define MusicKit interface for better test mocking
- Consider creating a `MusicKitService` wrapper that can be mocked

**Phase:** Phase 4 (Testing Infrastructure) - Required for maintainable codebase

**Example test setup:**
```typescript
// In test setup
global.MusicKit = {
  configure: jasmine.createSpy('configure'),
  getInstance: jasmine.createSpy('getInstance').and.returnValue({
    authorize: jasmine.createSpy('authorize'),
    unauthorize: jasmine.createSpy('unauthorize'),
    // ... other methods
  })
};
```

**Sources:**
- General JavaScript testing resources (no MusicKit-specific documentation found)
- [Sinon.JS - Standalone test fakes, spies, stubs and mocks](https://sinonjs.org/)
- [Manual Mocks · Jest](https://jestjs.io/docs/manual-mocks)

### 13. CORS Errors in Development
**What goes wrong:** Intermittent CORS errors appear with messages like "Request header field range is not allowed by Access-Control-Allow-Headers". Some songs play fine, others fail with CORS policy blocking. These are often Apple server-side issues, not fixable client-side.

**Warning signs:**
- `Cross-Origin Request Blocked` errors in console
- Some songs play, others don't (inconsistent behavior)
- Errors mentioning preflight response failures
- Different behavior between browsers (Chrome vs Safari)

**Prevention:**
- Understand that some CORS errors are Apple's infrastructure issues
- Don't waste time trying to fix server-side CORS with client code
- Implement error handling for playback failures
- File bug reports with Apple including specific failing songs/albums
- Test across multiple browsers to identify browser-specific issues
- Consider showing user-friendly error messages for unplayable content

**Phase:** Phase 3 (Playback Testing) - Awareness and error handling

**Sources:**
- [CORS issue with MusicKit JS | Apple Developer Forums](https://developer.apple.com/forums/thread/114196)
- [BUG: Request blocked by CORS policy · Issue #293](https://github.com/Musish/Musish/issues/293)

### 14. Dual Provider State Management
**What goes wrong:** Managing authentication state for both Spotify and Apple Music simultaneously creates complexity. State conflicts, token storage collisions, and UI state management become error-prone.

**Warning signs:**
- One provider's logout affecting the other provider's state
- localStorage/sessionStorage key collisions
- UI showing mixed state (logged into both, neither, or unclear)
- User confusion about which service they're currently using

**Prevention:**
- Namespace all storage keys clearly: `spotify_token` vs `apple_music_token`
- Create separate service classes: `SpotifyService` and `AppleMusicService`
- Implement provider-agnostic interface for common operations
- Design UI to clearly indicate active provider
- Consider "switch provider" flow rather than simultaneous dual login
- Test all combinations: logged into Spotify only, Apple only, both, neither

**Phase:** Phase 2 (Multi-Provider Architecture) - Architectural decision

**Pattern suggestion:**
```typescript
interface MusicProviderService {
  authorize(): Promise<void>;
  getArtistAlbums(artistId: string): Promise<Album[]>;
  // ... common interface
}

class SpotifyService implements MusicProviderService { }
class AppleMusicService implements MusicProviderService { }
```

**Sources:**
- [Spotify's latest tool makes switching from Apple Music effortless](https://www.cultofmac.com/news/spotifys-latest-tool-makes-switching-from-apple-music-effortless)
- [Transfer Playlists Between Music Services | Tune My Music](https://www.tunemymusic.com/)

### 15. OnPush Change Detection with MusicKit State
**What goes wrong:** Angular components using `ChangeDetectionStrategy.OnPush` (like in this codebase) may not detect MusicKit state changes since MusicKit events come from outside Angular's zone. Authentication state updates might not trigger UI updates.

**Warning signs:**
- UI not updating after successful authentication
- `musicUserToken` changes but component doesn't re-render
- Need to manually call `detectChanges()` after MusicKit operations
- Inconsistent behavior between dev and prod builds

**Prevention:**
- Run MusicKit operations inside Angular zone: `NgZone.run()`
- Manually trigger change detection after MusicKit state changes
- Use `ChangeDetectorRef.markForCheck()` in OnPush components
- Consider using RxJS subjects to bridge MusicKit events into Angular reactivity
- Test OnPush components thoroughly with MusicKit integration

**Phase:** Phase 2 (Angular Integration) - Specific to Angular OnPush strategy

**Example pattern:**
```typescript
constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}

async authorize() {
  this.zone.run(async () => {
    await MusicKit.getInstance().authorize();
    this.isAuthorized = true;
    this.cdr.markForCheck(); // Force OnPush update
  });
}
```

**Sources:**
- Project's own CLAUDE.md documentation about OnPush change detection patterns
- Angular zone documentation (general pattern applicable to MusicKit)

---

## Summary by Phase

**Phase 1 - Development Setup:**
- Pitfall #1: Developer Token JWT Configuration
- Pitfall #3: HTTPS for Localhost
- Pitfall #4: CDN Script Loading
- Pitfall #7: TypeScript Types

**Phase 2 - Authentication Flow:**
- Pitfall #2: No Token Refresh Mechanism
- Pitfall #5: Sign in with Apple Confusion
- Pitfall #11: Subscription Check
- Pitfall #14: Dual Provider State Management
- Pitfall #15: OnPush Change Detection

**Phase 3 - Testing & Mobile:**
- Pitfall #6: Mobile Safari Issues
- Pitfall #9: Album Search/Sorting
- Pitfall #10: Browser Language Settings
- Pitfall #13: CORS Errors

**Phase 4 - Production:**
- Pitfall #8: Rate Limiting
- Pitfall #12: Testing Infrastructure

---

## Key Takeaways

1. **MusicKit is not OAuth** - It's a proprietary auth flow that looks different from Spotify
2. **HTTPS everywhere** - Even localhost needs SSL due to EME requirements
3. **Mobile is different** - Desktop success doesn't guarantee mobile success
4. **No refresh tokens** - User re-authentication required after expiration (poor UX compared to Spotify)
5. **Developer tokens expire quickly** - 12-hour lifetime requires rotation strategy
6. **Testing is harder** - No official mocking support, requires creative workarounds
7. **Documentation gaps** - Apple's docs are incomplete; community knowledge essential
8. **Rate limits are opaque** - No headers provided, must implement defensive strategies

---

**Research completed:** 2026-01-31
**Researcher:** Claude Code (Sonnet 4.5)
