# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**Spotify Web API:**
- Spotify API v1 - Music data and artist information
  - SDK/Client: HttpClient (Angular, no official SDK used)
  - Auth: OAuth 2.0 with PKCE (Proof Key for Code Exchange)
  - Endpoints used:
    - `https://api.spotify.com/v1/me/top/artists` - Fetch user's top artists (limit: 50 per request)
    - `https://api.spotify.com/v1/artists/{id}/albums` - Fetch albums for specific artist
  - Redirect URIs:
    - Development: `http://127.0.0.1:4200` (configured in `src/environments/environment.ts`)
    - Production: `https://album-anniversaries.firebaseapp.com/` (configured in `src/environments/environment.prod.ts`)
  - State Parameter: CSRF protection via random 16-character state token stored in localStorage
  - Code Verifier: PKCE 128-character code verifier stored in sessionStorage, SHA-256 hashed for code challenge

**Spotify Authorization Service:**
- `https://accounts.spotify.com/authorize` - OAuth authorization endpoint
- `https://accounts.spotify.com/api/token` - Token exchange endpoint (PKCE flow)
  - Implementation: `src/app/app.component.ts` exchangeCodeForToken() method
  - Token storage: localStorage with 1-hour expiry (minus 60-second buffer)

## Data Storage

**Databases:**
- Firebase Realtime Database (configured but not actively used in current codebase)
  - Connection: `databaseURL: https://album-anniversaries.firebaseio.com`
  - Client: AngularFire (`@angular/fire`)
  - Configuration: `src/environments/environment.ts` and `src/environments/environment.prod.ts`

**In-Memory State:**
- RxJS BehaviorSubject in `SpotifyService` (`src/app/spotify.service.ts`)
  - Stores artists and albums in `dataStore` object
  - Emits via `_artists` observable for reactive component updates

**Development Mock Data:**
- json-server with `server/db.json` - Local mock API for development
- Triggered via `isDev` flag in `AppConfig` (`src/app/app-config.ts`)
- Used for testing without Spotify API calls

**File Storage:**
- Firebase Cloud Storage (not currently used)
  - Bucket: `album-anniversaries.appspot.com`

**Browser Storage:**
- localStorage:
  - `spotify_access_token` - Access token for API calls
  - `spotify_token_expiry` - Token expiration timestamp
  - `spotify_auth_state` - CSRF state token (16 random characters)
- sessionStorage:
  - `spotify_code_verifier` - PKCE code verifier (128 characters)

**Caching:**
- None (all data loaded fresh on each session)

## Authentication & Identity

**Auth Provider:**
- Spotify OAuth 2.0 (Authorization Code Flow with PKCE)
  - Implementation: `src/app/app.component.ts` and `src/app/pkce.service.ts`
  - Approach:
    1. Generate code verifier (128 random characters) via `crypto.getRandomValues()`
    2. Create code challenge (SHA-256 hash of verifier) via `crypto.subtle.digest('SHA-256', ...)`
    3. Redirect to Spotify authorization with code challenge
    4. Spotify redirects back with authorization code
    5. Exchange code + verifier for access token via POST to token endpoint
    6. Token stored locally with expiry, verifier cleared from sessionStorage

**PKCE Implementation:**
- Service: `src/app/pkce.service.ts`
- Methods:
  - `generateCodeVerifier()` - Cryptographically random string (43-128 chars)
  - `generateCodeChallenge()` - SHA-256 hash with base64url encoding
  - `storeCodeVerifier()` - sessionStorage management
  - `getCodeVerifier()` - Retrieves for token exchange
  - `clearCodeVerifier()` - Cleanup after token exchange

**Security:**
- CSRF protection: State token in localStorage, validated against URL params
- Token expiry: 60-second buffer to refresh before actual expiry
- No refresh tokens stored (new login on expiry)

## Monitoring & Observability

**Error Tracking:**
- Console logging only (no external error tracking service)
  - Patterns: `console.error()` for errors in:
    - `src/app/spotify.service.ts` - Artist/album loading failures
    - `src/app/app.component.ts` - OAuth flow errors
  - Error messages include context (e.g., artist name, operation name)

**Logs:**
- Browser console only
- Approach: Structured error logging with context labels like `[SpotifyService]`, `[AppComponent]`

**Analytics:**
- Not implemented (Firebase Analytics disabled via `environment.firebase`)

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting (`album-anniversaries.firebaseapp.com`)
  - Configuration: `firebase.json`
  - Deployment: `npm run deploy` command
  - SPA rewrite rule: All routes rewrite to `/index.html` for client-side routing

**Build Pipeline:**
- Production build: `npm run build` (invokes `ng build --configuration production`)
  - Pre-deployment: `npm run predeploy` runs build automatically

**CI Pipeline:**
- Pre-push hook via Husky (`npm test -- --no-watch --code-coverage`)
- Pre-commit hook via Husky (`npx lint-staged` for auto-formatting)
- No external CI service (GitHub Actions, etc.) - only local git hooks

## Environment Configuration

**Required env vars (none - all in environment files):**
- Configuration stored in source: `src/environments/environment.ts` and `environment.prod.ts`
- Spotify Client ID: `src/app/constants.ts` (public value, not sensitive)

**Secrets location:**
- Firebase API Key: Hardcoded in environment files (public key, safe for public repos)
- Spotify Client ID: Hardcoded in `src/app/constants.ts` (public key for OAuth)
- No backend secrets needed (PKCE eliminates client secret requirement)

**Important Note:**
- Firebase credentials are public and safe to commit (frontend-only app)
- All sensitive operations (token exchange) happen client-side or via Firebase Cloud Functions

## Webhooks & Callbacks

**Incoming:**
- Spotify OAuth callback: `{redirectUrl}?code={code}&state={state}`
  - Handled by AppComponent after redirect from Spotify
  - State validated against localStorage before code exchange

**Outgoing:**
- None (read-only integration with Spotify API)

## Data Flow

**Authentication:**
1. User clicks login → generates PKCE params
2. Redirects to Spotify authorization
3. Spotify redirects back with code and state
4. Validate state, exchange code for token
5. Store token in localStorage with expiry

**Data Loading:**
1. AccessToken exists (valid from storage or fresh login)
2. SpotifyService.loadArtistsWithAlbums() called with token
3. Fetch top 50 artists from Spotify API (limited to 10 in dev mode)
4. For each artist, fetch albums (50 per request, paginated if needed)
5. Filter albums by:
   - Day-precision release dates only
   - Birthday in past week OR past month OR released past year
6. Emit artists progressively via RxJS BehaviorSubject
7. Components subscribe and render reactively

---

*Integration audit: 2026-01-31*
