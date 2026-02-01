# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Subscription Logic Complexity in AppComponent:**
- Issue: TODO comment at `src/app/app.component.ts:133` identifies the subscription chain as needing refactoring
- Files: `src/app/app.component.ts` (lines 133-166)
- Impact: Complex pipe chains for filtering artists make the code harder to maintain and extend. Observable subscription logic is duplicated and confusing
- Fix approach: Extract filtering logic into separate methods or create a dedicated observable builder service. Consider using a facade pattern to simplify data transformation in AppComponent

**3D Tilt Effect Conflicts with Interactive Overlay:**
- Issue: TODO at `src/app/album-list-item/album-list-item.component.ts:72` indicates a known limitation
- Files: `src/app/album-list-item/album-list-item.component.ts` (lines 72-100)
- Impact: Overlay buttons are unreliable to click on desktop because the 3D tilt transform interferes with pointer events and z-index layering
- Fix approach: Consider disabling tilt when overlay is active, or rewrite pointer event handling to calculate coordinates relative to the 3D transformed surface

**Type Safety Issue - Any Type Cast:**
- Issue: HTTP response typed as `any` at `src/app/app.component.ts:458`
- Files: `src/app/app.component.ts` (line 458)
- Impact: Spotify token response is untyped, reducing type safety and IDE autocomplete capabilities
- Fix approach: Define a `SpotifyTokenResponse` interface with `access_token`, `expires_in`, and `token_type` fields and use it instead of `any`

**Observable Type Casting:**
- Issue: Observable casts at `src/app/app.component.ts:135` and `151` use `as Observable<Artist[]>`
- Files: `src/app/app.component.ts` (lines 135, 151)
- Impact: Type assertion bypasses TypeScript's type checking. If BehaviorSubject type changes, this creates silent bugs
- Fix approach: Fix the BehaviorSubject generic type at initialization (`src/app/spotify.service.ts:84`) so explicit casting is unnecessary

---

## Known Bugs

**State Management Edge Case:**
- Bug: Multiple simultaneous subscriptions to artists$ in AppComponent create independent data transformations
- Symptoms: If filtering logic differs between subscribers, inconsistent data appears in UI. Album lists may show different content
- Files: `src/app/app.component.ts` (lines 135-146, 150-166)
- Trigger: Occurs when both `artistsWithRecentAlbums$` and `artists$` subscriptions are active and album data is refreshed
- Workaround: Data flows through a single BehaviorSubject but filtering happens in subscribers - ensure filters are stateless and deterministic

**Overlay Click Detection on Mobile:**
- Bug: Mobile devices (width <= 768px) skip all overlay interaction logic, but event listeners still fire
- Symptoms: On tablet in landscape (>768px), overlay briefly appears/disappears during scroll
- Files: `src/app/album-list-item/album-list-item.component.ts` (lines 60-67, 74-78, 105-110)
- Trigger: Resize between breakpoints or use iPad in split-view mode
- Workaround: Check viewport width at event time, not initialization time

---

## Security Considerations

**Firebase Config Exposed in Source:**
- Risk: Firebase API key visible in both `src/environments/environment.ts` and `src/environments/environment.prod.ts` (lines 12-19 and lines 7-14)
- Files: `src/environments/environment.ts`, `src/environments/environment.prod.ts`
- Current mitigation: Firebase public browser SDK is designed to accept exposed API keys; actual security relies on Firestore/Realtime DB rules
- Recommendations:
  - Even though Firebase SDK is designed for public keys, verify that Firestore/RTDB rules explicitly restrict access
  - Consider using environment variable injection at build time if ever adding sensitive backend configs
  - Document that this API key is intentionally public and low-security-sensitive

**Spotify Client ID Hardcoded:**
- Risk: Client ID at `src/app/constants.ts:4` is public but should still be considered sensitive
- Files: `src/app/constants.ts`
- Current mitigation: Client ID alone cannot be used without PKCE secret (code_verifier), which is generated client-side and never transmitted
- Recommendations:
  - No changes needed - PKCE architecture is correct
  - Code verifier is properly stored in sessionStorage (cleared after auth), not localStorage
  - Keep this value public; it's required for browser-based OAuth

**LocalStorage Token Storage:**
- Risk: Access tokens stored in localStorage at `src/app/app.component.ts:419` are vulnerable to XSS
- Files: `src/app/app.component.ts` (lines 388-432)
- Current mitigation: 60-second token expiry buffer reduces window of exposure
- Recommendations:
  - Consider migrating to httpOnly cookies for token storage (requires backend cooperation with Spotify)
  - Add CSP (Content Security Policy) header to prevent inline script execution
  - Monitor localStorage for unauthorized writes (add integrity check)
  - Current implementation is acceptable for low-risk app; upgrade if collecting sensitive user data beyond top artists

**Placeholder Image URL with Via.placeholder.com:**
- Risk: External service at `src/app/album-list-item/album-list-item.component.ts:45` and `src/app/artist-card/artist-card.component.ts:23`
- Files: `src/app/album-list-item/album-list-item.component.ts`, `src/app/artist-card/artist-card.component.ts`
- Current mitigation: Only loads if Spotify returns no image URL (rare)
- Recommendations:
  - Use local SVG placeholder instead of external service to avoid DNS leaks
  - Example: `data:image/svg+xml,<svg>...</svg>` or asset-based fallback

---

## Performance Bottlenecks

**Album Filter Operations on Every Artist:**
- Problem: `filterAndMapAlbums()` creates Date objects for every album during load, then static filter methods recreate Date objects again in components
- Files: `src/app/spotify.service.ts` (lines 147-171) and static methods (lines 325-370)
- Cause: Dual filtering (load-time in service + component-time in AppComponent)
- Improvement path:
  - Cache the "today" date as a service-level constant
  - Consider pre-filtering albums at load time and not re-filtering in components
  - Profile with 100+ artists to measure actual impact

**IntersectionObserver Retry Loop:**
- Problem: `initObserverIfReady()` at `src/app/app.component.ts:207-254` uses setTimeout polling if elements aren't ready
- Files: `src/app/app.component.ts` (line 216)
- Cause: IntersectionObserver created in AfterViewInit before artists$ emits, causing repeated 100ms checks
- Improvement path:
  - Combine observable completion with ViewChild availability using `combineLatest([artists$, afterViewInit$])`
  - Avoid polling; use rxjs `waitUntil` pattern instead

**Scroll Event Throttling:**
- Problem: Both window and document scroll events listened to separately at `src/app/app.component.ts:274-288`
- Files: `src/app/app.component.ts` (lines 274-288)
- Cause: Redundant event listeners fire the same check twice per scroll
- Improvement path:
  - Listen to only window scroll event
  - Remove document scroll listener
  - Acceptable for now (throttled at 100ms anyway)

**GSAP ScrollTrigger Cleanup:**
- Problem: `killAllScrollTriggers()` at `src/app/gsap.service.ts:111-113` called on every AppComponent destroy
- Files: `src/app/gsap.service.ts`, `src/app/app.component.ts:261`
- Cause: If component reinitialized repeatedly, all active ScrollTriggers killed and recreated
- Improvement path:
  - Add reference counting to prevent killing triggers from other components
  - Only kill triggers created by this component (use ID prefix)

---

## Fragile Areas

**AppComponent Lifecycle Coupling:**
- Files: `src/app/app.component.ts`
- Why fragile: Multiple competing lifecycle hooks (ngOnInit, ngAfterViewInit, setupScrollListener) manage overlapping concerns. Adding new features requires careful coordination
- Safe modification:
  - Abstract scroll management into a separate service
  - Create a "readiness" observable that emits when both data and view are ready
  - Defer IntersectionObserver creation until that observable emits
- Test coverage: Only 3 tests in `src/app/app.component.spec.ts` - CRITICAL GAP

**SpotifyService Static vs Instance Methods:**
- Files: `src/app/spotify.service.ts` (methods duplicated at lines 268-279 and 325-335, etc.)
- Why fragile: Static methods `albumHadBirthdayPastWeek` and instance methods `albumHadBirthdayPastWeek` are near-duplicates. Fixing a date bug requires updating both
- Safe modification:
  - Remove static methods or make them call instance methods
  - If static needed for components, export as standalone functions in a utility module
  - Add tests that verify both paths return identical results
- Test coverage: Date logic well-tested; but duplication is still a maintenance risk

**OnPush Change Detection in Components:**
- Files: `src/app/album-list-item/album-list-item.component.ts`, `src/app/artist-card/artist-card.component.ts`
- Why fragile: OnPush strategy is correct, but tests must use fresh fixture instances for input changes (documented in CLAUDE.md but easy to miss)
- Safe modification:
  - Always create new fixtures when testing input property changes
  - Add a helper function in test utilities: `createComponentWithInput()`
  - See test examples in `src/app/album-list-item/album-list-item.component.spec.ts:37-45`
- Test coverage: Album and Artist card components well-tested (37 + 25 tests)

**Form URL State Management:**
- Files: `src/app/app.component.ts` (lines 109-124, 332-343)
- Why fragile: Authorization state inferred from URL parameters + localStorage + sessionStorage. Three sources of truth can desync
- Safe modification:
  - After exchanging code for token, use `window.history.replaceState()` (already done at line 475)
  - Clear URL state immediately after reading it (currently does this)
  - Add state validation: verify code+state match before exchanging
- Test coverage: CRITICAL - AppComponent auth flow has <5 tests; needs ~25 tests

---

## Scaling Limits

**Spotify API Pagination Not Implemented:**
- Current capacity: Top 50 artists maximum (SPOTIFY_API_LIMIT constant at `src/app/spotify.service.ts:25`)
- Limit: If user has >50 top artists, app only loads 50 albums total
- Scaling path:
  - Implement pagination with `offset` parameter in Spotify API calls
  - Add "Load more artists" button or automatic pagination
  - Store pagination state in BehaviorSubject
  - Update `loadAlbumsForArtists()` to handle cursor-based pagination

**Album Filtering Not Cached:**
- Current capacity: Filtering happens twice (load-time + component-time) on every app initialization
- Limit: With 1000+ albums, observable filtering becomes slow
- Scaling path:
  - Cache filtered results in BehaviorSubject with a cache key (date + filter type)
  - Invalidate cache only when source data changes
  - Implement memoization for date filter functions

**IntersectionObserver Only Tracks One Section:**
- Current capacity: Only `yearSection` is observed for label switching
- Limit: Adding more sections or dynamic section insertion requires manual observer updates
- Scaling path:
  - Create a ReactiveSectionObserver service
  - Use ViewChildren to query all sections automatically
  - Emit section change events via Observable

---

## Test Coverage Gaps

**AppComponent OAuth/PKCE Flow Untested:**
- What's not tested: Authorization flow (login button, code exchange, token storage, state validation)
- Files: `src/app/app.component.ts` (lines 359-479)
- Risk: Auth bugs will reach production undetected. PKCE state mismatch errors silently logged to console
- Priority: **HIGH**
- Suggested tests:
  - Test login generates code verifier and challenge
  - Test authorization code exchange succeeds
  - Test code verifier cleared after exchange
  - Test token stored with expiry
  - Test state parameter validation
  - Test URL params cleared after auth
  - Test expired token triggers re-login
  - At least 10-15 tests needed

**SpotifyService HTTP Integration Minimal:**
- What's not tested: Actual HTTP requests to Spotify API, error handling, response mapping
- Files: `src/app/spotify.service.ts` (lines 178-251)
- Risk: API response format changes or network errors will break the app without test feedback
- Priority: **MEDIUM**
- Suggested tests:
  - Mock HttpClientTestingModule
  - Test artist loading with paginated responses
  - Test album loading and filtering
  - Test network error handling
  - Test partial failures (artist load fails but others succeed)
  - At least 12-15 tests needed

**Scroll Behavior Not Tested:**
- What's not tested: Scroll position detection, scroll-to-top button, section intersection detection
- Files: `src/app/app.component.ts` (lines 269-323)
- Risk: Scroll UX will break without noticing
- Priority: **MEDIUM**
- Suggested tests:
  - Test scroll position threshold (200px)
  - Test scroll button visibility toggle
  - Test smooth scroll behavior
  - At least 4-6 tests

**GsapService Animations Not Tested:**
- What's not tested: GSAP animations, ScrollTrigger initialization, 3D tilt calculations
- Files: `src/app/gsap.service.ts`, `src/app/album-list-item/album-list-item.component.ts` (onMouseMove)
- Risk: Animation code is difficult to debug; visual bugs hard to catch
- Priority: **LOW**
- Suggested approach:
  - Mock GSAP/ScrollTrigger entirely
  - Test that correct GSAP methods are called with correct parameters
  - Skip integration testing (too complex); unit test the math only
  - At least 5-8 tests

**Component Input Validation Not Tested:**
- What's not tested: Null/undefined input handling, missing image arrays, empty strings
- Files: `src/app/album-list-item/album-list-item.component.ts` (albumCoverUrl getter), `src/app/artist-card/artist-card.component.ts` (artistImageUrl getter)
- Risk: Unexpected data formats will cause runtime errors
- Priority: **MEDIUM**
- Suggested tests:
  - Test null/undefined album
  - Test missing images array
  - Test null name fallback in altTag
  - At least 3-5 tests per component

---

## Dependencies at Risk

**Angular 17 - Moderately Old:**
- Risk: Angular 17 is not the latest LTS; security patches may become sparse in 2026-2027
- Impact: May require major refactor in 2-3 years
- Migration plan:
  - Monitor Angular 19+ LTS schedule
  - Angular 19 is expected to be LTS
  - Plan migration 6 months before Angular 17 EOL
  - Test compatibility with `npm outdated`

**GSAP (Proprietary Animation Library):**
- Risk: GSAP 3.13.0 is tied to specific API surface; ScrollTrigger plugin may have breaking changes in GSAP 4
- Impact: Scroll animations may break in major update
- Migration plan:
  - Document GSAP API usage in the codebase
  - When updating GSAP, test all animations thoroughly
  - Consider web-animations-api as long-term alternative for simple cases

**Spotify API Deprecation:**
- Risk: Spotify PKCE implementation or OAuth endpoints may change
- Impact: Login flow will break
- Migration plan:
  - Monitor Spotify Developer Dashboard announcements
  - Keep PKCE implementation updated if Spotify changes PKCE spec
  - Test OAuth flow quarterly with manual login test

---

## Missing Critical Features

**Logout Flow Incomplete:**
- Problem: Logout button clears token but doesn't clear other state
- Blocks: Cannot reliably test re-login without manual browser clear
- Impact: User may see stale data after logout if session not fully cleared
- Recommendation: After logout, also reset `artists$`, `artistsWithRecentAlbums$`, and redirect to home

**Error Handling Missing:**
- Problem: No user-facing error messages for failed Spotify API calls
- Blocks: Users see loading spinner indefinitely if API fails
- Impact: Poor UX - silent failures
- Recommendation:
  - Add error state to AppComponent
  - Display toast/snackbar on API failures
  - Add retry button for manual retry

**Mobile Responsiveness Incomplete:**
- Problem: Album grid breaks on very small screens (<300px)
- Blocks: Mobile UX degraded on older devices
- Impact: Users on small screens see squished layout
- Recommendation: Test breakpoints on iPhone SE and add CSS for screens <400px

---

*Concerns audit: 2026-01-31*
