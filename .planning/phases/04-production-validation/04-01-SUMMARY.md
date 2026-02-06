---
phase: 04-production-validation
plan: 01
subsystem: ui
tags: [angular, material, snackbar, notifications, error-handling]

# Dependency graph
requires:
  - phase: 03-apple-music-integration
    provides: AppleMusicService with authentication and API calls
provides:
  - NotificationService for centralized user feedback
  - Comprehensive error handling for Apple Music API errors
  - User-friendly error messages for all failure scenarios
  - Success notifications for auth and logout
affects: [05-apple-music-refinement, future-error-handling]

# Tech tracking
tech-stack:
  added: ['@angular/material', '@angular/cdk', 'MatSnackBarModule']
  patterns: ['Centralized notification service', 'Error message mapping', 'Token expiration checking']

key-files:
  created:
    - src/app/services/notification.service.ts
    - src/app/services/notification.service.spec.ts
    - postcss.config.js
  modified:
    - src/app/services/apple-music.service.ts
    - src/app/services/apple-music.service.spec.ts
    - src/app/app.component.ts
    - src/app/app.component.spec.ts
    - src/app/app.module.ts
    - src/styles.scss
    - package.json

key-decisions:
  - "Use Angular Material SnackBar for all notifications (consistent, accessible)"
  - "Error messages never auto-dismiss to ensure users see critical errors"
  - "Success messages auto-dismiss after 3 seconds"
  - "Check token expiration within 1 day of expiry (proactive re-auth prompt)"
  - "Downgrade Tailwind CSS from v4 to v3 for Angular build compatibility"

patterns-established:
  - "NotificationService pattern: showError (no auto-dismiss), showSuccess (3s), showWarning (5s)"
  - "Error handling pattern: handleError for API errors, handleAuthorizationError for auth failures"
  - "Token management pattern: isTokenExpired checks within 1 day buffer, clearStoredToken for cleanup"

# Metrics
duration: 10min
completed: 2026-02-05
---

# Phase 04 Plan 01: Error Handling Infrastructure Summary

**Angular Material SnackBar notifications with comprehensive error mapping for Apple Music auth, API failures, and logout success**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-06T03:30:48Z
- **Completed:** 2026-02-06T03:40:20Z
- **Tasks:** 3
- **Files modified:** 12
- **Tests added:** 62 (12 NotificationService + 45 AppleMusicService + 5 AppComponent)
- **Total tests:** 207 passing

## Accomplishments

- NotificationService with color-coded SnackBar messages (red/green/orange)
- User-friendly error messages for all Apple Music failure scenarios
- Token expiration detection within 1 day of expiry
- Logout success notification and complete token cleanup
- Comprehensive test coverage for all error scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Create NotificationService** - `e92e024` (feat)
   - NotificationService with error/success/warning methods
   - Angular Material installation and configuration
   - Tailwind CSS v3 migration for build compatibility
   - 12 unit tests

2. **Task 2: Integrate error handling into AppleMusicService** - `6629697` (feat)
   - handleError for API failures (403, 401, 429, offline)
   - handleAuthorizationError for auth failures
   - isTokenExpired and clearStoredToken methods
   - 45 new tests (53 total for service)

3. **Task 3: Add logout notifications and token clearing** - `e18d01e` (feat)
   - Clear both Spotify and Apple Music tokens on logout
   - Reset observables to empty state
   - Success notification on logout
   - 5 logout tests

## Files Created/Modified

### Created
- `src/app/services/notification.service.ts` - Centralized SnackBar notification service with error/success/warning methods
- `src/app/services/notification.service.spec.ts` - 12 unit tests for NotificationService
- `postcss.config.js` - PostCSS configuration for Tailwind CSS v3

### Modified
- `src/app/services/apple-music.service.ts` - Added comprehensive error handling with user-friendly messages
- `src/app/services/apple-music.service.spec.ts` - Added 45 error handling tests (53 total)
- `src/app/app.component.ts` - Enhanced logout with token cleanup and success notification
- `src/app/app.component.spec.ts` - Added 5 logout tests (10 total for component)
- `src/app/app.module.ts` - Added MatSnackBarModule and BrowserAnimationsModule
- `src/styles.scss` - Added SnackBar color styles (error/success/warning)
- `package.json` - Added @angular/material and @angular/cdk dependencies, downgraded tailwindcss to v3

## Decisions Made

1. **Angular Material for notifications** - Provides accessible, consistent UI components that match Angular ecosystem standards

2. **Error message never auto-dismiss** - Critical errors require explicit user acknowledgment to ensure they're seen

3. **1-day token expiration buffer** - Proactive re-authentication prompt before token expires improves UX

4. **Comprehensive error mapping** - Map all Apple Music error codes to user-friendly messages (NO_SUBSCRIPTION, TOKEN_EXPIRED, POPUP_BLOCKED, rate limits, network offline)

5. **Tailwind CSS v3 downgrade** - Tailwind v4 uses different PostCSS integration incompatible with Angular 17 build tools

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Tailwind CSS v4/v3 PostCSS compatibility**
- **Found during:** Task 1 (Running NotificationService tests)
- **Issue:** Tailwind CSS v4 requires @tailwindcss/postcss plugin which conflicts with Angular 17 build tools. Tests failed with "tailwindcss directly as PostCSS plugin" error
- **Fix:** Downgraded tailwindcss from v4.1.18 to v3.4.19, removed @tailwindcss/postcss, created postcss.config.js with standard Tailwind v3 plugin
- **Files modified:** package.json, postcss.config.js (created)
- **Verification:** All tests pass with Tailwind v3
- **Committed in:** e92e024 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added environment.maxArtists integration**
- **Found during:** Task 2 (Reviewing AppleMusicService for error handling integration)
- **Issue:** AppleMusicService hardcoded MAX_ARTISTS = 20, but environment.ts already had maxArtists config that wasn't being used
- **Fix:** Changed `const MAX_ARTISTS = 20` to `const MAX_ARTISTS = environment.maxArtists || Infinity`
- **Files modified:** src/app/services/apple-music.service.ts
- **Verification:** Existing tests pass, production can override max artists via environment config
- **Committed in:** 6629697 (Task 2 commit as part of service refactor)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes were necessary for functionality. Tailwind downgrade ensures builds work. Environment integration provides production flexibility.

## Issues Encountered

**Tailwind CSS v4 compatibility** - Angular 17 build tools expect Tailwind v3 PostCSS integration. Downgraded to v3 to resolve. Future upgrade to Angular 18+ or Tailwind v5 may restore v4 compatibility.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Error handling infrastructure complete and tested (207 passing tests)
- All Apple Music error scenarios have user-friendly messages
- Logout properly cleans up all tokens (Spotify + Apple Music)
- Ready for production validation and user testing
- Consider adding error retry logic or exponential backoff for transient failures

---
*Phase: 04-production-validation*
*Completed: 2026-02-05*
