# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Layered MVC with Smart/Dumb Component Pattern

**Key Characteristics:**
- Clear separation between data layer (services), presentation layer (components), and domain models
- Reactive data flow using RxJS BehaviorSubjects and Observables
- Stateful root component (`AppComponent`) orchestrates child components and data streams
- Service-based architecture with single responsibility principle
- Angular dependency injection for service management

## Layers

**Presentation Layer:**
- Purpose: Renders UI and handles user interactions
- Location: `src/app/app.component.ts`, `src/app/artist-card/`, `src/app/album-list-item/`
- Contains: Components with templates and styling, event handlers, view state
- Depends on: Services (SpotifyService, PkceService, GsapService), Domain models
- Used by: Direct DOM rendering, user events trigger service calls

**Data/State Layer:**
- Purpose: Manages application state, Spotify API integration, and data transformation
- Location: `src/app/spotify.service.ts`
- Contains: BehaviorSubject for artists, HTTP calls to Spotify API, data filtering logic
- Depends on: HttpClient, domain models, configuration
- Used by: AppComponent for reactive data streams, components for filtering operations

**Authentication Layer:**
- Purpose: Handles Spotify OAuth 2.0 PKCE flow
- Location: `src/app/pkce.service.ts`, `src/app/app.component.ts` (login/token exchange)
- Contains: Code verifier/challenge generation, sessionStorage management, token exchange logic
- Depends on: Web Crypto API, localStorage/sessionStorage
- Used by: AppComponent for authentication operations

**Animation/Enhancement Layer:**
- Purpose: Manages visual effects and animations
- Location: `src/app/gsap.service.ts`
- Contains: GSAP animations, scroll progress tracking, 3D tilt effects
- Depends on: GSAP library, ScrollTrigger plugin
- Used by: AppComponent, AlbumListItemComponent for visual effects

**Domain Models:**
- Purpose: Define data structures
- Location: `src/app/artist.ts`, `src/app/album.ts`, `src/app/image.ts`
- Contains: TypeScript interfaces for Artist, Album, Image
- Depends on: Nothing (pure data structures)
- Used by: All other layers for type safety

**Configuration Layer:**
- Purpose: Provides environment-specific settings and injection tokens
- Location: `src/app/app-config.ts`, `src/environments/`, `src/app/constants.ts`
- Contains: Firebase config, Spotify credentials, feature flags, auth state keys
- Depends on: Environment files
- Used by: AppModule, Services for configuration values

## Data Flow

**Initial Load (Happy Path):**

1. User accesses application
2. AppComponent.ngOnInit() runs
3. Check for valid stored token in localStorage
4. If no token, check URL for authorization code (PKCE callback)
5. If code exists, call exchangeCodeForToken() → HTTP POST to Spotify token endpoint
6. Store access token and expiry in localStorage
7. Call spotifyService.loadArtistsWithAlbums(accessToken)
8. SpotifyService fetches top artists from Spotify API
9. For each artist, fetch albums (filtered by date criteria)
10. BehaviorSubject (_artists) emits updated data progressively (buffered by 5)
11. Observables (artists$, artistsWithRecentAlbums$) transform data with RxJS operators
12. AppComponent subscribes to observables, triggering change detection
13. Components render filtered artists and albums with animations

**Authentication Flow (Spotify OAuth PKCE):**

1. User clicks login button
2. AppComponent.login() generates code_verifier (random string via crypto.getRandomValues)
3. AppComponent generates code_challenge (SHA-256 hash of verifier, base64url encoded)
4. Code verifier stored in sessionStorage (via PkceService)
5. Random state string generated and stored in localStorage (CSRF protection)
6. User redirected to Spotify authorization endpoint with code_challenge and state
7. User approves scope (user-top-read)
8. Spotify redirects back with authorization code in URL query parameters
9. AppComponent detects code and state in URL
10. AppComponent validates state matches stored state
11. AppComponent calls exchangeCodeForToken() with code
12. Code verifier retrieved from sessionStorage
13. HTTP POST to Spotify token endpoint with code + code_verifier
14. Access token received and stored in localStorage with expiry time
15. Code verifier and state cleared from storage
16. URL cleaned (replaceState) to remove authorization code
17. Data loading begins

**Filtering Data:**

1. Raw albums from Spotify contain mixed dates (various precisions)
2. SpotifyService.filterAndMapAlbums() filters by release_date_precision === 'day'
3. Three independent filter methods run on each album:
   - albumHadBirthdayPastWeek() - anniversary in past 7 days
   - albumHadBirthdayPastMonth() - anniversary in past 30 days (with cross-year handling)
   - albumReleasedPastYear() - released within past 365 days
4. Albums matching any filter are mapped to internal Album model
5. Albums sorted by release_date descending (newest first)
6. AppComponent applies additional filtering via RxJS operators:
   - anniversaryRange$ controls week/month filter selection
   - combineLatest merges artists$ with anniversaryRange$ to produce reactive filtering
   - Components receive pre-filtered observable streams

**State Management:**

- Component state: Local to each component (showOverlay in AlbumListItemComponent, dropdownOpen in AppComponent)
- Application state: BehaviorSubject in SpotifyService (_artists), Anniversary range as BehaviorSubject
- Authentication state: localStorage (token, expiry, state), sessionStorage (code_verifier)
- UI state: AppComponent properties (currentFilterLabel, loading, showScrollToTop)
- Observable streams trigger change detection in OnPush components

## Key Abstractions

**Artist Entity:**
- Purpose: Represents a Spotify artist with biography info and album collection
- Examples: `src/app/artist.ts` defines interface, used in `src/app/artist-card/artist-card.component.ts`
- Pattern: Immutable data model populated by SpotifyService, displayed via ArtistCardComponent

**Album Entity:**
- Purpose: Represents a Spotify album with metadata and cover images
- Examples: `src/app/album.ts` defines interface, used in `src/app/album-list-item/album-list-item.component.ts`
- Pattern: Immutable data model with static filter methods (albumHadBirthdayPastWeek, albumReleasedPastYear)

**SpotifyService as Data Repository:**
- Purpose: Centralizes all Spotify API communication and data transformation
- Examples: HTTP calls to Spotify API, date filtering logic, progressive data emission
- Pattern: Singleton service with BehaviorSubject for reactive state, static utility methods for filters

**PkceService as Cryptographic Provider:**
- Purpose: Encapsulates PKCE cryptographic operations and sessionStorage management
- Examples: generateCodeVerifier, generateCodeChallenge, storeCodeVerifier, getCodeVerifier
- Pattern: Utility service with no state, returns promises for async operations

**GsapService as Animation Manager:**
- Purpose: Abstracts GSAP library usage and manages lifecycle
- Examples: animateAlbumGrid, createScrollProgress, tilt3D, killAllScrollTriggers
- Pattern: Wrapper service running GSAP outside Angular's NgZone for performance

**AuthenticationService Pattern (AppComponent):**
- Purpose: Orchestrates OAuth flow and token management
- Examples: login(), exchangeCodeForToken(), logout(), hasValidStoredToken()
- Pattern: Spread across AppComponent; could be extracted to dedicated service

## Entry Points

**Bootstrap Entry:**
- Location: `src/main.ts`
- Triggers: Application startup
- Responsibilities: Initialize Angular platform, bootstrap AppModule

**Root Component:**
- Location: `src/app/app.component.ts`
- Triggers: After module bootstrap
- Responsibilities: OAuth flow orchestration, data loading, layout management, animations, scroll handling, filter state management

**AppModule:**
- Location: `src/app/app.module.ts`
- Triggers: During bootstrap
- Responsibilities: Declare components, import dependencies, provide services, configure Firebase and Lucide icons

## Error Handling

**Strategy:** Try-catch at service layer, error logging via console, graceful fallback to empty data

**Patterns:**

- HTTP errors in SpotifyService caught with `catchError(error => of(null))` - allows processing to continue with other artists
- Token exchange errors logged, processing halts (user sees login page again on refresh)
- Missing images handled with placeholder URLs (`https://via.placeholder.com/600` or `/300`)
- PKCE crypto errors throw with descriptive message about HTTPS requirement
- State validation check prevents CSRF attacks by comparing URL state with localStorage state
- Invalid stored token automatically cleared and regenerated on next login

## Cross-Cutting Concerns

**Logging:** Console logging at key points (errors in SpotifyService, auth errors in AppComponent), tagged with `[SpotifyService]`

**Validation:**
- State validation before token exchange (CSRF protection)
- Release date precision filtering (day precision only)
- Token expiry calculation with 60-second buffer
- Component input validation (null checks for images, artist names)

**Authentication:**
- PKCE flow with code verifier/challenge
- Access token stored with expiry time in localStorage
- Code verifier stored in sessionStorage
- State parameter for CSRF protection
- Token expiry check before API calls

**Change Detection:**
- Root component uses default strategy (heavy change detection)
- Presentation components use OnPush strategy (lighter, performance-optimized)
- Manual change detection where needed (showScrollToTop, overlay state)
- Fresh fixture pattern required for OnPush testing with input mutations

**Performance Optimization:**
- GSAP animations run outside Angular's NgZone
- RxJS operators (map, filter, switchMap) compose transformations efficiently
- Progressive data loading with buffering (5 artists at a time)
- Staggered API calls using mergeMap
- TrackBy functions for ngFor loops (trackByArtistId, trackByAlbumId)

---

*Architecture analysis: 2026-01-31*
