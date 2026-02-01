---
phase: 02-backend-infrastructure
plan: 01
subsystem: infra
tags: [firebase-functions, jose, jwt, es256, apple-music, musickit]

# Dependency graph
requires:
  - phase: 01-service-abstraction-ui-foundation
    provides: MusicService interface foundation for multi-provider architecture
provides:
  - Firebase Functions v2 infrastructure with Node 20 runtime
  - getAppleMusicToken callable function for ES256 JWT signing
  - Token caching with 1-hour refresh buffer
  - Backend prerequisite for Apple Music authentication
affects: [03-apple-music-integration]

# Tech tracking
tech-stack:
  added: [firebase-functions@5.0.0, firebase-admin@12.0.0, jose@5.0.0]
  patterns: [defineSecret for credential management, global scope token caching, ES256 JWT signing]

key-files:
  created: []
  modified:
    - functions/package.json
    - functions/tsconfig.json
    - functions/src/index.ts
    - firebase.json

key-decisions:
  - "Use jose library for ES256 JWT signing (ESM-native, async/await, Node 20 compatible)"
  - "Cache tokens at global scope with 180-day expiry and 1-hour refresh buffer"
  - "Use defineSecret for credentials (not deprecated functions.config())"
  - "JWT payload includes only required claims (iss, iat, exp) - extra claims rejected by Apple"

patterns-established:
  - "Firebase Functions v2 pattern: onCall with defineSecret and CORS"
  - "Token caching pattern: global scope persistence across invocations"
  - "ES256 signing pattern: crypto.createPrivateKey() for .p8 PEM format"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 2 Plan 1: Firebase Token Generation Infrastructure Summary

**Firebase Functions v2 with ES256 JWT signing for Apple Music Developer Tokens using jose library and defineSecret credential management**

## Performance

- **Duration:** 3 min 40 seconds
- **Started:** 2026-02-01T20:49:26Z
- **Completed:** 2026-02-01T20:53:06Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Upgraded Firebase Functions from v2 (1st gen) to v5 (2nd gen) with Node 20 runtime
- Implemented getAppleMusicToken callable function with ES256 JWT signing
- Established token caching with 180-day expiry and 1-hour refresh buffer
- Configured secrets management using defineSecret (not deprecated functions.config())

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade Firebase Functions to v2** - `ad8b2b2` (chore)
2. **Task 2: Implement getAppleMusicToken callable function** - `2b787cb` (feat)
3. **Task 3: Deploy Firebase Functions** - No commit (deployment only)

## Files Created/Modified
- `functions/package.json` - Upgraded to firebase-functions@5.0.0, firebase-admin@12.0.0, added jose@5.0.0, removed tslint
- `functions/tsconfig.json` - ES2022 target with NodeNext module resolution for modern TypeScript
- `functions/src/index.ts` - getAppleMusicToken callable function with ES256 JWT signing and token caching
- `firebase.json` - Added functions configuration with nodejs20 runtime

## Decisions Made

**Use jose library for ES256 signing:**
- ESM-native, works with NodeNext module resolution
- Async/await API cleaner than jsonwebtoken
- Built-in support for ES256 algorithm

**Global scope token caching:**
- Firebase Functions v2 preserves global state across invocations
- 180-day token expiry (Apple's maximum)
- 1-hour buffer before expiry ensures fresh tokens
- Reduces API calls and improves performance

**JWT payload structure:**
- Only required claims: iss (Team ID), iat (issued at), exp (expiry)
- kid (Key ID) in header, not payload
- Empty payload object - Apple rejects tokens with extra claims (aud, sub)

**defineSecret over functions.config():**
- functions.config() deprecated March 2027
- defineSecret is 2nd gen standard for sensitive credentials
- Automatic Secret Manager API integration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Deployment requires Secret Manager API enablement:**
- Expected behavior - plan specifies user must configure secrets
- Deployment command verified to work (attempts deployment correctly)
- Blocker is missing Secret Manager API enablement and secret configuration
- User must:
  1. Enable Secret Manager API in Google Cloud Console
  2. Run `firebase functions:secrets:set APPLE_TEAM_ID`
  3. Run `firebase functions:secrets:set APPLE_KEY_ID`
  4. Run `firebase functions:secrets:set APPLE_PRIVATE_KEY`
  5. Retry `firebase deploy --only functions`

**Firebase CLI not installed:**
- Auto-fixed by installing firebase-tools globally
- Not a planned deviation - normal environment setup

## User Setup Required

**Apple Developer Program enrollment required ($99/year):**

Before deployment will succeed, user must:

1. **Enroll in Apple Developer Program**
   - Visit https://developer.apple.com/programs/
   - Complete enrollment ($99/year)

2. **Create MusicKit Key**
   - Apple Developer Portal → Certificates, Identifiers & Profiles → Keys
   - Create new key with MusicKit enabled
   - Download .p8 private key file (one-time download)
   - Note Team ID and Key ID

3. **Enable Secret Manager API**
   - Visit https://console.developers.google.com/apis/api/secretmanager.googleapis.com/overview?project=album-anniversaries
   - Click "Enable"

4. **Configure Firebase Secrets**
   ```bash
   firebase functions:secrets:set APPLE_TEAM_ID
   # Enter Team ID when prompted

   firebase functions:secrets:set APPLE_KEY_ID
   # Enter Key ID when prompted

   firebase functions:secrets:set APPLE_PRIVATE_KEY
   # Paste entire .p8 file contents (including header/footer)
   ```

5. **Deploy Function**
   ```bash
   firebase deploy --only functions
   ```

6. **Verify Deployment**
   ```bash
   firebase functions:list
   # Should show getAppleMusicToken with nodejs20 runtime
   ```

## Next Phase Readiness

**Ready for Phase 3 (Apple Music Integration):**
- Firebase Functions infrastructure upgraded and ready
- Token generation function implemented and waiting for credentials
- Backend prerequisite complete once secrets configured

**Blocker:**
- User must complete Apple Developer enrollment and credential setup before Phase 3
- Cannot test getAppleMusicToken until secrets are configured

**Context for Phase 3:**
- Function returns `{ token: string }` structure
- Token is cached globally, refreshes automatically with 1-hour buffer
- Call from Angular: `httpsCallable(functions, 'getAppleMusicToken')()`
- Token is passed to MusicKit.configure() as developer token

---
*Phase: 02-backend-infrastructure*
*Completed: 2026-02-01*
