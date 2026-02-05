# Phase 4: Production Validation - Research

**Researched:** 2026-02-05
**Domain:** Production deployment, iOS/Safari testing, error handling, token management
**Confidence:** MEDIUM

## Summary

Phase 4 validates Apple Music integration works reliably across all target platforms and edge cases before production launch. This research reveals that production validation requires a multi-layered approach: real device testing on iOS/Safari to verify authentication popup behavior, comprehensive error handling with clear user messaging via Angular Material SnackBar, token expiration detection with forced re-authentication, and production deployment validation through Firebase Hosting with proper build configuration.

The critical difference between development and production validation is testing against real-world constraints: Safari's privacy features that may block authentication popups, storage limitations that affect token persistence (7-day eviction policy, private browsing restrictions), subscription validation to detect missing Apple Music subscriptions, and cross-device limitations of sessionStorage-based tokens.

Unlike development testing which uses controlled environments, production validation must account for: iPhone/iPad hardware variations, iOS version differences, Safari privacy settings (Private Browsing, Intelligent Tracking Prevention), network conditions (slow 3G, offline), and user behaviors (token expiration after 6 months, provider switching without logout).

**Primary recommendation:** Create dedicated error handling service with Material SnackBar notifications, implement token expiration detection with automatic re-authentication flow, validate subscription status via MusicKit API before data loading, test on real iOS devices (not simulators), deploy to Firebase Hosting with production build validation, and establish monitoring for MusicKit-specific errors (popup blockers, storage restrictions, subscription status).

## Standard Stack

The established libraries/tools for production validation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Angular Material SnackBar | 17.x | Error/success notifications | Already integrated, accessible UI, consistent with Material Design patterns |
| Firebase Hosting | Current | Production deployment | Already configured, SPA routing support, HTTPS by default |
| Safari Web Inspector | Built-in | iOS debugging | Only official tool for debugging Safari on real iOS devices |
| Chrome DevTools | Built-in | Desktop testing | Standard browser debugging, network inspection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BrowserStack | Cloud service | Real iOS device testing | When physical devices unavailable, broad iOS version coverage needed |
| LambdaTest | Cloud service | Alternative cloud testing | Budget-friendly alternative to BrowserStack |
| Google Lighthouse | Built-in | Production performance audit | Pre-deployment performance validation |
| ngrok | Latest | Local iOS testing | Testing localhost on real iPhone via public URL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Real iOS devices | iOS Simulator | Simulator can't test popup blockers, storage policies, or real Safari behavior accurately |
| SnackBar service | Toast library (ngx-toastr) | Material SnackBar already integrated, consistent with existing UI |
| Firebase Hosting | Netlify/Vercel | Firebase already configured, integrated with Functions backend |
| Safari Web Inspector | Cloud testing only | Cloud testing lacks local debugging, slower feedback loop |

**Installation:**
```bash
# No new npm packages needed - using existing Angular Material, Firebase

# Optional: ngrok for local mobile testing
npm install -g ngrok

# Optional: Lighthouse CI for automated auditing
npm install -g @lhci/cli
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── services/
│   │   ├── music-service.interface.ts      # Existing
│   │   ├── spotify.service.ts              # Existing
│   │   ├── apple-music.service.ts          # Existing - needs error handling
│   │   ├── musickit-loader.service.ts      # Existing - needs error handling
│   │   └── notification.service.ts         # NEW: Centralized SnackBar service
│   ├── app.component.ts                    # Update: Add error handlers, subscription checks
│   └── app.module.ts                       # Update: MatSnackBarModule if missing
├── environments/
│   ├── environment.ts                      # Review: Ensure dev config correct
│   └── environment.prod.ts                 # Review: Ensure prod config correct
└── firebase.json                           # Update: Production hosting config
```

### Pattern 1: Centralized Notification Service
**What:** Single service for all user-facing error/success messages using Material SnackBar
**When to use:** Any component needs to display user feedback (errors, success, warnings)
**Example:**
```typescript
// notification.service.ts
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  showError(message: string, action: string = 'Close'): void {
    this.snackBar.open(message, action, {
      duration: 0, // No auto-dismiss for errors - user must acknowledge
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  showWarning(message: string, action: string = 'OK'): void {
    this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}

// styles.scss
.error-snackbar {
  background-color: #f44336 !important; // Material red
  color: white !important;
}

.success-snackbar {
  background-color: #4caf50 !important; // Material green
  color: white !important;
}

.warning-snackbar {
  background-color: #ff9800 !important; // Material orange
  color: white !important;
}
```

### Pattern 2: Token Expiration Detection and Re-authentication
**What:** Detect expired Music User Tokens before API calls and trigger re-authentication
**When to use:** Before any MusicKit API call that requires user authentication
**Example:**
```typescript
// apple-music.service.ts (additions)
private isTokenExpired(): boolean {
  const expiryStr = sessionStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
  if (!expiryStr) return true;

  const expiryMs = parseInt(expiryStr, 10);
  const now = Date.now();
  const bufferMs = 86400000; // 1 day buffer before actual expiry

  return expiryMs - bufferMs <= now;
}

private async ensureValidToken(): Promise<void> {
  if (this.isTokenExpired()) {
    // Clear old token
    this.clearStoredToken();

    // Show user notification before re-auth
    this.notificationService.showWarning(
      'Your Apple Music session has expired. Please sign in again.',
      'OK'
    );

    // Trigger re-authentication
    await this.authorize();
  }
}

async loadArtistsWithAlbums(): Promise<void> {
  try {
    // Check token validity before API calls
    await this.ensureValidToken();

    // Proceed with data loading...
    const libraryArtists = await this.fetchAllLibraryArtists();
    // ...
  } catch (error) {
    this.handleError(error, 'loading artists');
  }
}
```

### Pattern 3: Subscription Status Validation
**What:** Check if user has active Apple Music subscription before data loading
**When to use:** After successful authentication, before fetching library data
**Example:**
```typescript
// apple-music.service.ts (additions)
private async checkSubscriptionStatus(): Promise<boolean> {
  try {
    // Attempt to fetch library artists (requires subscription)
    const response = await this.musicKitInstance!.api.music(
      '/v1/me/library/artists',
      { limit: 1 }
    );

    // If successful, user has subscription
    return true;
  } catch (error: any) {
    // 403 Forbidden indicates no subscription
    if (error.status === 403 || error.errorCode === 'FORBIDDEN') {
      return false;
    }

    // Other errors - rethrow
    throw error;
  }
}

async authorize(): Promise<string> {
  try {
    const musicUserToken = await this.musicKitInstance!.authorize();
    this.storeToken(musicUserToken);

    // Check subscription after authorization
    const hasSubscription = await this.checkSubscriptionStatus();

    if (!hasSubscription) {
      this.notificationService.showError(
        'Apple Music subscription required. Please subscribe to Apple Music to view your library.',
        'OK'
      );
      throw new Error('NO_SUBSCRIPTION');
    }

    return musicUserToken;
  } catch (error) {
    this.handleAuthorizationError(error);
    throw error;
  }
}
```

### Pattern 4: Comprehensive Error Handling with User-Friendly Messages
**What:** Catch all MusicKit errors and map to user-friendly messages with actionable guidance
**When to use:** Wrap all MusicKit API calls and authorization flows
**Example:**
```typescript
// apple-music.service.ts (additions)
private handleError(error: any, context: string): void {
  console.error(`[AppleMusicService] Error ${context}:`, error);

  let message = `Failed ${context}. `;
  let isRecoverable = false;

  // Map error codes to user-friendly messages
  if (error.message === 'NO_SUBSCRIPTION') {
    message = 'Apple Music subscription required to view your library.';
  } else if (error.errorCode === 'AUTHORIZATION_ERROR') {
    message = 'Authorization failed. Please try signing in again.';
    isRecoverable = true;
  } else if (error.errorCode === 'POPUP_BLOCKED') {
    message = 'Popup blocked. Please allow popups for this site and try again.';
  } else if (error.status === 429 || error.errorCode === 'RATE_LIMIT_EXCEEDED') {
    message = 'Too many requests. Please wait a moment and try again.';
    isRecoverable = true;
  } else if (error.status === 401) {
    message = 'Session expired. Please sign in again.';
    isRecoverable = true;
    this.clearStoredToken();
  } else if (error.message?.includes('offline') || !navigator.onLine) {
    message = 'No internet connection. Please check your network and try again.';
    isRecoverable = true;
  } else if (error.message?.includes('musickitloaded')) {
    message = 'Failed to load Apple Music. Please refresh the page.';
  } else {
    message += 'Please try again or contact support.';
  }

  // Show error notification
  this.notificationService.showError(message, 'Close');

  // Clear error state after showing message
  if (!isRecoverable) {
    this.artistsSubject.next([]);
  }
}

private handleAuthorizationError(error: any): void {
  console.error('[AppleMusicService] Authorization error:', error);

  let message = 'Apple Music sign-in failed. ';

  // Popup-specific errors
  if (error.message?.includes('popup') || error.message?.includes('window')) {
    message = 'Popup blocked. Please allow popups and try again.';
  }
  // Private browsing errors
  else if (error.message?.includes('referrer') || error.message?.includes('opener')) {
    message = 'Private Browsing detected. Please disable Private Browsing and try again.';
  }
  // User cancelled
  else if (error.errorCode === 'USER_CANCELLED') {
    message = 'Sign-in cancelled.';
  }
  // Subscription errors
  else if (error.message === 'NO_SUBSCRIPTION') {
    message = 'Apple Music subscription required.';
  }
  // Generic
  else {
    message += 'Please try again.';
  }

  this.notificationService.showError(message, 'Close');
}
```

### Pattern 5: Production Build Configuration for Firebase Hosting
**What:** Configure Firebase Hosting for Angular SPA with proper routing, caching, security headers
**When to use:** Before production deployment
**Example:**
```json
// firebase.json
{
  "hosting": {
    "public": "dist/album-anniversaries/browser",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ]
  }
}
```

### Pattern 6: iOS Safari Testing Setup with Safari Web Inspector
**What:** Debug and test web app on real iPhone/iPad using Safari Web Inspector on Mac
**When to use:** Testing authentication flows, storage behavior, popup handling on real devices
**Example:**
```bash
# On Mac: Enable Develop menu
# Safari > Preferences > Advanced > Check "Show Develop menu in menu bar"

# On iPhone/iPad: Enable Web Inspector
# Settings > Safari > Advanced > Enable "Web Inspector"

# Connect device via USB or same WiFi network
# Open app in Safari on iPhone: https://album-anniversaries.firebaseapp.com/

# On Mac Safari: Develop > [iPhone Name] > [Page URL]
# Web Inspector opens with full debugging capabilities:
# - Console for errors/logs
# - Network tab for API requests
# - Storage tab for sessionStorage/localStorage
# - Debugger for breakpoints
```

### Anti-Patterns to Avoid
- **Silent error swallowing:** Never catch errors without showing user feedback - users need to know what went wrong
- **Generic error messages:** "An error occurred" is useless - provide context and actionable guidance
- **Auto-retry without user consent:** Don't automatically retry failed operations (e.g., authorization) - ask user first
- **Hardcoded production URLs:** Use environment variables for all URLs, especially Firebase project IDs
- **Testing only in simulator:** iOS Simulator can't reproduce popup blockers, storage policies, or real Safari behavior
- **Assuming token validity:** Always validate token expiration before API calls to avoid 401 errors mid-session

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User notification system | Custom toast component | Angular Material SnackBar | Already integrated, accessible, consistent styling, built-in animations |
| Error message mapping | Switch statement per component | Centralized NotificationService | Single source of truth, easier to maintain, consistent UX |
| Token expiration detection | Custom timestamp logic | Structured storage with expiry checking | Edge cases handled (buffer time, time zones, browser clock changes) |
| iOS device testing | Manual device rotation, network throttling | Safari Web Inspector + Real Device | Official debugging tools, network/CPU/device emulation built-in |
| Production performance audit | Custom metrics collection | Google Lighthouse | Industry-standard metrics (FCP, LCP, TTI), automated scoring, actionable recommendations |
| Local mobile testing | Manual IP address setup | ngrok or similar tunnel | Public HTTPS URL, automatic SSL, no network configuration |

**Key insight:** Production validation is about testing against real-world constraints that can't be simulated. Use real devices, real Safari, real network conditions, real user behaviors. Cloud testing services (BrowserStack/LambdaTest) complement but don't replace physical device testing for authentication flows.

## Common Pitfalls

### Pitfall 1: Simulator Testing Gives False Confidence
**What goes wrong:** Authentication works perfectly in iOS Simulator but fails on real iPhone
**Why it happens:** Simulator doesn't enforce Safari's popup blocking, storage policies, or privacy features
**How to avoid:** Always test on real iPhone/iPad with real Safari, not simulator
**Warning signs:**
- Tests pass in simulator but users report authentication failures
- Can't reproduce reported bugs in development
- Storage behaves differently on real devices

**Solution:** Acquire at least one physical iPhone for testing (iPhone 12+ recommended for iOS 16+ support). Use Safari Web Inspector for debugging. Test with:
- Normal browsing mode
- Private browsing mode
- Different iOS versions (15, 16, 17, 18 if possible)
- Different network conditions (WiFi, cellular, airplane mode)

### Pitfall 2: Safari's 7-Day Storage Eviction Policy
**What goes wrong:** Token stored in sessionStorage disappears after 7 days of no interaction
**Why it happens:** Safari's Intelligent Tracking Prevention (ITP) deletes client-side storage after 7 days without user interaction
**How to avoid:** Implement token expiration detection and graceful re-authentication
**Warning signs:**
- User reports "logged out" after not using app for a week
- Token exists but API calls fail with 401
- sessionStorage appears empty on return visits

**Solution:**
```typescript
// Already handling 6-month token expiry, but also need to handle 7-day eviction
private handleMissingToken(): void {
  const hasExpectedToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);

  if (!hasExpectedToken) {
    // Token evicted or never existed
    this.notificationService.showWarning(
      'Please sign in to view your Apple Music library.',
      'OK'
    );
  }
}
```
**Note:** Home screen web apps exempt from 7-day eviction, but browser-based use is affected.

### Pitfall 3: Private Browsing Breaks Authentication
**What goes wrong:** MusicKit popup authentication fails silently in Safari Private Browsing mode
**Why it happens:** Private Browsing restricts localStorage/sessionStorage and hides document.referrer in cross-origin contexts
**How to avoid:** Detect Private Browsing and show clear error message before attempting authentication
**Warning signs:**
- Authentication succeeds in normal mode but fails in Private Browsing
- Popup opens but never completes authorization
- No error message, just hangs

**Solution:**
```typescript
// Detect Private Browsing (heuristic - not 100% reliable)
private async isPrivateBrowsing(): Promise<boolean> {
  try {
    sessionStorage.setItem('__test__', 'test');
    sessionStorage.removeItem('__test__');
    return false;
  } catch {
    return true; // Likely private browsing
  }
}

async authorize(): Promise<string> {
  // Check for Private Browsing before authorization
  if (await this.isPrivateBrowsing()) {
    const message =
      'Private Browsing detected. Apple Music authentication may not work. ' +
      'Please disable Private Browsing and try again.';
    this.notificationService.showWarning(message, 'OK');
  }

  // Proceed with authorization...
}
```

### Pitfall 4: Missing Apple Music Subscription Not Detected
**What goes wrong:** User authorizes successfully but gets 403 errors when fetching library data
**Why it happens:** Authorization succeeds even without subscription, but library APIs require active subscription
**How to avoid:** Check subscription status immediately after authorization, before showing "logged in" UI
**Warning signs:**
- Authorization succeeds but library data never loads
- 403 Forbidden errors in console
- User sees empty state despite successful login

**Solution:** See Pattern 3 above - implement subscription check via trial API call.

### Pitfall 5: Token Expiration Causes Mid-Session Failures
**What goes wrong:** User loads app, everything works, then 15 minutes later all API calls fail with 401
**Why it happens:** Token expired during session but app doesn't detect/handle expiration
**How to avoid:** Check token expiration before each API call, trigger re-auth if expired
**Warning signs:**
- 401 Unauthorized errors in console after app running for a while
- User must manually refresh page to fix
- Inconsistent failures

**Solution:** See Pattern 2 above - implement `ensureValidToken()` check before API calls.

### Pitfall 6: Popup Blockers Prevent Authentication
**What goes wrong:** Click "Sign in with Apple Music" but nothing happens
**Why it happens:** Browser popup blocker prevents `authorize()` from opening authentication window
**How to avoid:** Call `authorize()` directly in click handler (synchronous), detect popup failures
**Warning signs:**
- Popup opens briefly then disappears
- Console shows popup blocked warning
- User clicks button but sees no response

**Solution:**
```typescript
// app.component.ts
async loginAppleMusic(): Promise<void> {
  try {
    // MUST call authorize() synchronously in click handler
    // Don't await async operations first - breaks popup allowance
    await this.appleMusicService.initialize();

    // This MUST be called directly from user gesture, not in async callback
    await this.appleMusicService.authorize();

    // Success - proceed with data loading
    this.setupArtistsObservables();
  } catch (error: any) {
    // Check for popup blocker
    if (error.message?.includes('popup') || error.message?.includes('blocked')) {
      this.notificationService.showError(
        'Popup blocked. Please allow popups for this site in your browser settings.',
        'OK'
      );
    }
  }
}
```

### Pitfall 7: Provider Switching Leaves Stale Tokens
**What goes wrong:** User logs in with Spotify, switches to Apple Music, sees mixed/stale data
**Why it happens:** Tokens and state from previous provider not cleared on provider switch
**How to avoid:** Clear all provider-specific storage on logout and provider switch
**Warning signs:**
- Switching providers shows old data briefly
- sessionStorage has tokens from both providers
- activeProvider state inconsistent

**Solution:**
```typescript
// app.component.ts
logout(): void {
  // Clear provider-agnostic state
  this.activeProvider = null;

  // Clear Spotify tokens
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_state');

  // Clear Apple Music tokens
  sessionStorage.removeItem('apple_music_token');
  sessionStorage.removeItem('apple_music_token_expiry');

  // Reset observable
  this.filteredArtists = of([]);
  this.artistCount = 0;
  this.birthdayCount = 0;
  this.recentCount = 0;
  this.albumCount = 0;

  this.notificationService.showSuccess('Logged out successfully');
}

async loginAppleMusic(): Promise<void> {
  // Clear any existing provider state before logging in
  this.logout();

  // Proceed with Apple Music login...
}
```

### Pitfall 8: Production Build Differences Break App
**What goes wrong:** App works in development (`ng serve`) but breaks after production build (`ng build --prod`)
**Why it happens:** Production build uses AOT compilation, tree shaking, different environment config
**How to avoid:** Test production build locally before deploying to Firebase
**Warning signs:**
- "Cannot find module" errors in production
- Environment variables undefined
- Services not injected correctly

**Solution:**
```bash
# Build production locally
npm run build

# Serve production build locally
npx http-server dist/album-anniversaries/browser -p 8080

# Test in browser at http://localhost:8080
# Verify:
# - Spotify login works
# - Apple Music login works
# - Environment config correct
# - No console errors

# Only deploy after local production build verification
firebase deploy --only hosting
```

### Pitfall 9: Firebase Hosting Cache Prevents Updates
**What goes wrong:** Deploy new version but users still see old version
**Why it happens:** Aggressive caching of index.html or client-side caching
**How to avoid:** Configure proper cache headers for index.html (no-cache) vs static assets (long-term cache)
**Warning signs:**
- Users report bugs you fixed in latest deploy
- Hard refresh required to see updates
- Firebase Hosting shows new version but browser shows old

**Solution:** See Pattern 5 above - firebase.json with proper cache headers.

### Pitfall 10: Network Errors Not Handled Gracefully
**What goes wrong:** User loses internet connection mid-session, app shows cryptic error or infinite loading
**Why it happens:** No offline detection or graceful degradation
**How to avoid:** Detect offline state, show appropriate message, allow retry when online
**Warning signs:**
- Infinite loading spinners when offline
- Generic "Network request failed" errors
- No way to retry after network restored

**Solution:**
```typescript
// apple-music.service.ts
private async fetchWithRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check online status before attempting
      if (!navigator.onLine) {
        throw new Error('offline');
      }

      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }
  }

  throw lastError;
}
```

### Pitfall 11: Development Artist Limit Left in Production
**What goes wrong:** Production app only shows 20 artists despite users having hundreds
**Why it happens:** `MAX_ARTISTS = 20` constant added for development testing not removed
**How to avoid:** Use environment variable to control artist limit, set to unlimited in production
**Warning signs:**
- Users report missing artists
- Only first 20 artists alphabetically shown
- Performance metrics look artificially good

**Solution:**
```typescript
// environment.ts
export const environment = {
  production: false,
  maxArtists: 20, // Development limit
  // ...
};

// environment.prod.ts
export const environment = {
  production: true,
  maxArtists: null, // No limit in production
  // ...
};

// apple-music.service.ts
const artistLimit = environment.maxArtists || libraryArtists.length;
const limitedArtists = libraryArtists.slice(0, artistLimit);
```

## Code Examples

Verified patterns from official sources and best practices:

### Centralized Notification Service
```typescript
// notification.service.ts
import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show error notification (no auto-dismiss, red background)
   */
  showError(message: string, action: string = 'Close'): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, {
      duration: 0, // User must dismiss manually
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  /**
   * Show success notification (auto-dismiss after 3s, green background)
   */
  showSuccess(message: string, duration: number = 3000): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, '', {
      duration,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  /**
   * Show warning notification (auto-dismiss after 5s, orange background)
   */
  showWarning(message: string, action: string = 'OK'): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
```

### Token Expiration Detection
```typescript
// apple-music.service.ts (add to existing service)
private isTokenExpired(): boolean {
  const expiryStr = sessionStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
  if (!expiryStr) return true;

  const expiryMs = parseInt(expiryStr, 10);
  const now = Date.now();
  const bufferMs = 86400000; // 1 day buffer

  return expiryMs - bufferMs <= now;
}

private async ensureValidToken(): Promise<void> {
  if (this.isTokenExpired()) {
    this.clearStoredToken();

    this.notificationService.showWarning(
      'Your Apple Music session has expired. Please sign in again.',
      'OK'
    );

    throw new Error('TOKEN_EXPIRED');
  }
}

// Use before API calls
async loadArtistsWithAlbums(): Promise<void> {
  try {
    await this.ensureValidToken(); // Check first

    const libraryArtists = await this.fetchAllLibraryArtists();
    // ... rest of implementation
  } catch (error: any) {
    if (error.message === 'TOKEN_EXPIRED') {
      // User needs to re-authenticate
      this.artistsSubject.next([]);
    } else {
      this.handleError(error, 'loading artists');
    }
  }
}
```

### Subscription Status Check
```typescript
// apple-music.service.ts (add to existing service)
private async hasActiveSubscription(): Promise<boolean> {
  try {
    // Try to fetch minimal library data
    const response = await this.musicKitInstance!.api.music(
      '/v1/me/library/artists',
      { limit: 1 }
    );

    return true; // Success = has subscription
  } catch (error: any) {
    // 403 = no subscription
    if (error.status === 403 || error.errorCode === 'FORBIDDEN') {
      return false;
    }

    // Other errors - rethrow
    throw error;
  }
}

async authorize(): Promise<string> {
  try {
    const musicUserToken = await this.musicKitInstance!.authorize();
    this.storeToken(musicUserToken);

    // Verify subscription immediately after auth
    const hasSubscription = await this.hasActiveSubscription();

    if (!hasSubscription) {
      this.clearStoredToken();

      this.notificationService.showError(
        'Apple Music subscription required. Please subscribe to Apple Music to view your library.',
        'OK'
      );

      throw new Error('NO_SUBSCRIPTION');
    }

    return musicUserToken;
  } catch (error) {
    this.handleAuthorizationError(error);
    throw error;
  }
}
```

### Comprehensive Error Handling
```typescript
// apple-music.service.ts (add to existing service)
private handleError(error: any, context: string): void {
  console.error(`[AppleMusicService] Error ${context}:`, error);

  let message = `Failed ${context}. `;

  // Map specific errors to user-friendly messages
  if (error.message === 'NO_SUBSCRIPTION') {
    message = 'Apple Music subscription required to view your library.';
  } else if (error.message === 'TOKEN_EXPIRED') {
    message = 'Session expired. Please sign in again.';
  } else if (error.errorCode === 'POPUP_BLOCKED') {
    message = 'Popup blocked. Please allow popups for this site and try again.';
  } else if (error.status === 429) {
    message = 'Too many requests. Please wait a moment and try again.';
  } else if (error.status === 401) {
    message = 'Session expired. Please sign in again.';
    this.clearStoredToken();
  } else if (!navigator.onLine || error.message?.includes('offline')) {
    message = 'No internet connection. Please check your network and try again.';
  } else if (error.message?.includes('musickitloaded')) {
    message = 'Failed to load Apple Music. Please refresh the page.';
  } else {
    message += 'Please try again later.';
  }

  this.notificationService.showError(message, 'Close');
  this.artistsSubject.next([]); // Clear state on error
}

private handleAuthorizationError(error: any): void {
  console.error('[AppleMusicService] Authorization error:', error);

  let message = 'Apple Music sign-in failed. ';

  if (error.message?.includes('popup') || error.message?.includes('blocked')) {
    message = 'Popup blocked. Please allow popups and try again.';
  } else if (error.message?.includes('referrer') || error.message?.includes('opener')) {
    message = 'Private Browsing detected. Please disable Private Browsing and try again.';
  } else if (error.errorCode === 'USER_CANCELLED') {
    message = 'Sign-in cancelled.';
  } else if (error.message === 'NO_SUBSCRIPTION') {
    message = 'Apple Music subscription required.';
  } else {
    message += 'Please try again.';
  }

  this.notificationService.showError(message, 'Close');
}
```

### Production Build Testing Script
```bash
#!/bin/bash
# test-production-build.sh

echo "Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Production build failed"
  exit 1
fi

echo "✅ Production build successful"
echo ""
echo "Starting local server..."
npx http-server dist/album-anniversaries/browser -p 8080 &
SERVER_PID=$!

echo "Server running at http://localhost:8080"
echo "PID: $SERVER_PID"
echo ""
echo "Testing checklist:"
echo "[ ] Spotify login works"
echo "[ ] Apple Music login works"
echo "[ ] Environment config correct"
echo "[ ] No console errors"
echo "[ ] Provider switching works"
echo "[ ] Logout works"
echo ""
echo "Press Ctrl+C to stop server and continue"

wait $SERVER_PID
```

### Firebase Hosting Configuration
```json
// firebase.json
{
  "hosting": {
    "public": "dist/album-anniversaries/browser",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual device testing only | Cloud testing platforms (BrowserStack/LambdaTest) | 2020+ | Faster iOS version coverage, but can't replace real device for auth flows |
| Generic error messages | Contextual error mapping with user guidance | 2023+ Material Design updates | Better UX, users know what to do |
| localStorage for tokens | sessionStorage with expiration detection | 2020+ Safari ITP | Respects privacy policies, forces re-auth appropriately |
| Manual deployment checks | Automated Lighthouse audits in CI/CD | 2021+ | Catches performance regressions before production |
| Simulator-only testing | Real device testing standard | Always, but emphasized with Safari privacy features | Catches real-world issues simulators miss |

**Deprecated/outdated:**
- **localStorage for Music User Tokens**: Safari's 7-day eviction policy makes this unreliable - use sessionStorage
- **Assuming token validity**: Always check expiration before API calls - tokens expire after 6 months
- **Testing only on desktop Safari**: Mobile Safari has different popup/storage behavior - test on real iPhone
- **Single error message for all failures**: Material Design recommends contextual, actionable error messages

## Open Questions

Things that couldn't be fully resolved:

1. **Safari Private Browsing Detection Reliability**
   - What we know: sessionStorage quota trick works most of the time but not 100% reliable
   - What's unclear: Is there a more reliable detection method for Safari Private Browsing mode?
   - Recommendation: Use heuristic detection + clear error messaging when authentication fails. Don't block auth attempt, just warn user.

2. **Subscription Status API Endpoint**
   - What we know: Can infer subscription via trial library API call (403 = no sub)
   - What's unclear: Does MusicKit provide dedicated subscription status endpoint? Documentation unclear.
   - Recommendation: Use trial API call approach - it's reliable and documented to return 403 for non-subscribers.

3. **Cloud Testing Platform Coverage**
   - What we know: BrowserStack and LambdaTest both offer real iOS device testing
   - What's unclear: Do they support MusicKit popup authentication reliably? Cross-origin restrictions?
   - Recommendation: Use cloud testing for broad iOS version coverage, but validate critical auth flows on physical device.

4. **Token Refresh Strategy**
   - What we know: Music User Tokens expire after 6 months, can't be refreshed automatically
   - What's unclear: Best UX pattern for handling 6-month expiration? Detect early and prompt re-auth?
   - Recommendation: Detect expiration with 1-day buffer, prompt user to re-authenticate before session ends. No automatic refresh possible.

5. **Error Tracking in Production**
   - What we know: Console errors visible in Safari Web Inspector, but not centralized
   - What's unclear: Should we integrate error tracking service (Sentry, Firebase Crashlytics) for production monitoring?
   - Recommendation: Defer to post-launch. Manual testing + Safari Web Inspector sufficient for v1 validation. Add error tracking if production issues difficult to reproduce.

## Sources

### Primary (HIGH confidence)
- [Firebase Hosting - Angular Integration](https://firebase.google.com/docs/hosting/frameworks/angular) - Official deployment guide
- [Angular Material SnackBar](https://v8.material.angular.dev/components/snack-bar) - Official SnackBar documentation
- [Material Design - Errors Pattern](https://m1.material.io/patterns/errors.html) - Official error handling guidance
- [Apple Developer - User Authentication for MusicKit](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit) - Official auth documentation
- [Apple Developer Forums - Music User Token Expiration](https://developer.apple.com/forums/thread/654814) - Official token lifetime guidance

### Secondary (MEDIUM confidence)
- [BrowserStack - Debug iPhone Safari](https://www.browserstack.com/guide/how-to-debug-on-iphone) - iOS testing best practices
- [BrowserStack vs LambdaTest 2026 Comparison](https://www.getpanto.ai/blog/browserstack-vs-lambdatest) - Cloud testing platform comparison
- [Medium - Angular Material SnackBar Service Pattern](https://learnwithawais.medium.com/are-you-still-hardcoding-snackbars-in-angular-try-this-clean-utility-service-instead-d7d6a09bba91) - Centralized notification service
- [Safari ITP - LocalStorage 7-Day Eviction](https://www.customerlabs.com/blog/understanding-safari-intelligent-tracking-prevention-apple-itp-impact/) - Storage policy explanation
- [Medium - MusicKit Token Storage](https://medium.com/@gavinkasdorf/apples-musickit-js-allows-you-to-access-an-apple-music-user-s-playlists-and-library-listen-to-32f77ff54d48) - Token management patterns

### Tertiary (LOW confidence - needs validation)
- [Apple Developer Forums - MusicKit Subscription Check](https://developer.apple.com/forums/thread/704063) - Community subscription validation approaches
- [GitHub - MusicKit Token Issues](https://github.com/orgs/music-assistant/discussions/3897) - Community troubleshooting
- [iOS Safari LocalStorage Private Mode](https://jonathanmh.com/p/use-ios-safari-localstorage-sessionstorage-private-mode/) - Private browsing detection heuristics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Angular Material, Firebase Hosting, Safari Web Inspector
- Architecture: MEDIUM - Error handling patterns well-documented, but MusicKit-specific error codes less documented
- Pitfalls: MEDIUM - Most pitfalls verified through developer forums and documentation, some from community reports
- Testing approach: HIGH - Safari Web Inspector and real device testing are industry standard
- Token management: MEDIUM - 6-month expiry official, but no official refresh mechanism documented

**Research date:** 2026-02-05
**Valid until:** ~60 days (2026-04-06) - Production validation patterns stable, iOS/Safari behavior changes rare

**Critical dependencies:**
- Phase 3 complete (Apple Music integration working)
- Real iPhone/iPad for testing (not simulator)
- Mac with Safari for Web Inspector debugging
- Firebase Hosting configured (already done)
- Angular Material SnackBar module (likely already imported, verify)

**Key unknowns requiring validation during execution:**
- Exact MusicKit error codes for subscription failures (may need trial-and-error)
- Popup blocker behavior across iOS versions (test on real devices)
- Safari Private Browsing detection reliability (heuristic-based)
- Cloud testing platform support for MusicKit authentication (BrowserStack/LambdaTest)

**Planning impact:**
This research confirms Phase 4 as MEDIUM complexity. Expect 2-3 plans:
1. Error handling infrastructure (NotificationService, comprehensive error mapping)
2. Production deployment validation (Firebase Hosting config, production build testing, Lighthouse audit)
3. Real device testing protocol (iOS Safari testing, subscription validation, edge case scenarios)

Validation phase has fewer unknowns than integration phase but requires methodical testing across devices, browsers, and edge cases.
