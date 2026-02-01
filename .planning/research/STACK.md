# Stack Research: Apple Music / MusicKit

## Executive Summary

MusicKit JS is Apple's official library for integrating Apple Music into web applications. As of January 2026, **MusicKit JS v3** is the recommended version despite beta status, offering improved reliability and future compatibility. Integration requires a paid Apple Developer Program membership ($99/year) and backend token generation since JWT signing cannot occur securely in the browser.

---

## Recommended Stack

### Core Library

**MusicKit JS v3 (CDN-hosted)**
- **Version**: v3 (beta, but production-ready)
- **CDN URL**: `https://js-cdn.music.apple.com/musickit/v3/musickit.js`
- **Documentation**: https://js-cdn.music.apple.com/musickit/v3/docs/index.html
- **Rationale**:
  - More reliable player implementation than v1
  - Single passthrough API method instead of fragmented endpoint methods
  - Apple's actively maintained version with recent documentation updates (2025)
  - Eliminates "bandaid logic" required in v1
- **Confidence**: **HIGH** - Apple's official recommendation, active development

**Why NOT v1**:
- Legacy version with player reliability issues
- Fragmented API requiring method mapping to individual endpoints
- No longer receiving active feature development
- Source: [MusicKit on the Web v3 Documentation](https://js-cdn.music.apple.com/musickit/v3/docs/index.html), [Apple Developer Forums on v3 reliability](https://developer.apple.com/forums/thread/696938)

### TypeScript Support

**Custom Type Definitions (Recommended)**
- **Approach**: Create `src/types/musickit.d.ts` with manual type definitions
- **Rationale**:
  - `@types/musickit-js` only supports v1 (last published 1 year ago)
  - `musickit-typescript` is unmaintained (last published 7 years ago)
  - No DefinitelyTyped support exists for v3
  - Custom types provide full control and v3 API coverage
- **Implementation Pattern**:
  ```typescript
  // src/types/musickit.d.ts
  declare global {
    interface Window {
      MusicKit: MusicKitGlobal;
    }
  }

  interface MusicKitGlobal {
    configure(options: MusicKitConfiguration): MusicKitInstance;
    getInstance(): MusicKitInstance;
  }

  interface MusicKitInstance {
    authorize(): Promise<string>;
    unauthorize(): Promise<void>;
    api: MusicKitAPI;
    player: MusicKitPlayer;
    // Add other v3 methods as needed
  }

  export {};
  ```
- **Confidence**: **MEDIUM-HIGH** - Standard TypeScript pattern, requires manual maintenance

**Alternative (NOT Recommended)**:
- Using `@types/musickit-js` for v1 types - incompatible with v3's passthrough API architecture
- Source: [TypeScript type definitions comparison](https://www.npmjs.com/package/@types/musickit-js), [musickit-typescript package](https://www.npmjs.com/package/musickit-typescript)

### Developer Token Generation (Backend Required)

**Firebase Cloud Functions + `jsonwebtoken` library**
- **Library**: `jsonwebtoken` v9.x
- **Runtime**: Node.js 20+ (Firebase Functions)
- **Rationale**:
  - JWT signing with ES256 algorithm MUST occur server-side (private key security)
  - Firebase Functions already in project stack (zero new infrastructure)
  - `jsonwebtoken` is industry standard for JWT operations
  - Supports ES256 algorithm required by Apple
- **Installation**:
  ```bash
  cd functions
  npm install jsonwebtoken
  ```
- **Implementation Pattern**:
  ```typescript
  import jwt from 'jsonwebtoken';

  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY; // .p8 file content
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;

  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d',
    issuer: teamId,
    header: {
      alg: 'ES256',
      kid: keyId
    }
  });
  ```
- **Confidence**: **HIGH** - Proven pattern, secure approach, aligns with existing Firebase infrastructure

**Why Backend is Required**:
- Apple Music requires ES256-signed JWT with private key (`.p8` file)
- Private keys cannot be safely exposed in browser code
- Developer tokens have 6-month max lifetime, requiring server-side refresh logic
- Source: [Apple Developer Token Generation](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens), [JWT generation examples](https://github.com/pelauimagineering/apple-music-token-generator)

**Alternative Options (NOT Recommended)**:
- Serverless platforms (Vercel, Netlify Functions) - introduces new deployment complexity
- Hard-coded tokens in frontend - security vulnerability, 6-month expiration issue
- Third-party token generation services - adds external dependency and cost

---

## Authentication Flow

### Two-Token System

MusicKit authentication requires TWO distinct tokens:

#### 1. Developer Token (Your Backend)
- **Purpose**: Identifies your app to Apple Music API
- **Generation**: Server-side JWT signing with ES256 algorithm
- **Lifetime**: Up to 6 months (180 days recommended)
- **Storage**: Can be cached and reused across all users
- **Required Claims**:
  - `iss` (issuer): Apple Developer Team ID
  - `iat` (issued at): Unix timestamp
  - `exp` (expiration): Unix timestamp (max 6 months)
- **Required Headers**:
  - `alg`: "ES256"
  - `kid`: Key ID from Apple Developer portal

#### 2. Music User Token (MusicKit JS)
- **Purpose**: Authenticates individual user's Apple Music subscription
- **Generation**: Client-side via `MusicKit.getInstance().authorize()`
- **Lifetime**: ~6 months (not renewable, must re-authenticate on expiry)
- **Storage**: Managed by MusicKit JS, persists across sessions
- **User Flow**:
  1. User clicks "Sign in with Apple Music"
  2. Popup window displays Apple Music authorization
  3. User grants permission
  4. Music User Token returned to MusicKit instance
- **Source**: [User Authentication for MusicKit](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit), [MusicKit User Token Flow](https://medium.com/@gavinkasdorf/apples-musickit-js-allows-you-to-access-an-apple-music-user-s-playlists-and-library-listen-to-32f77ff54d48)

### Authentication Implementation Pattern

```typescript
// 1. Angular Service: Fetch developer token from your backend
export class AppleMusicAuthService {
  private musicKit: MusicKitInstance;

  async initialize() {
    // Fetch developer token from Firebase Function
    const devToken = await this.http.get<string>('/api/apple-music-token').toPromise();

    // Configure MusicKit
    await this.waitForMusicKit();
    this.musicKit = window.MusicKit.configure({
      developerToken: devToken,
      app: {
        name: 'Album Anniversaries',
        build: '1.0.0'
      }
    });
  }

  async authorize(): Promise<string> {
    // Triggers Apple Music popup for user consent
    const musicUserToken = await this.musicKit.authorize();
    return musicUserToken;
  }

  private waitForMusicKit(): Promise<void> {
    return new Promise((resolve) => {
      if (window.MusicKit) {
        resolve();
      } else {
        document.addEventListener('musickitloaded', () => resolve());
      }
    });
  }
}
```

### Key Differences from Spotify OAuth

| Aspect | Spotify (Current) | Apple Music |
|--------|------------------|-------------|
| **Flow Type** | OAuth 2.0 PKCE (client-side) | Two-token system |
| **Backend Required** | No (PKCE allows pure client-side) | Yes (JWT signing) |
| **Token Refresh** | Automatic with refresh token | Manual re-auth (no refresh) |
| **Popup vs Redirect** | Redirect flow | Popup window |
| **Token Storage** | localStorage (your code) | MusicKit manages |

**Confidence**: **HIGH** - Apple's documented authentication pattern

---

## Apple Developer Requirements

### Prerequisites for Production

#### 1. Apple Developer Program Membership
- **Cost**: $99 USD/year
- **Required**: Yes (no free tier for MusicKit API)
- **Includes**:
  - Access to create MusicKit identifiers
  - Private key generation for JWT signing
  - Apple Music API access (no per-request fees)
- **Enrollment**: https://developer.apple.com/programs/enroll/
- **Source**: [Apple Developer Program Requirements](https://developer.apple.com/musickit/), [Cost confirmation](https://developer.apple.com/forums/thread/120537)

#### 2. MusicKit Identifier & Private Key
- **Setup Location**: Apple Developer Portal → Certificates, Identifiers & Profiles
- **Steps**:
  1. Create a MusicKit Identifier (e.g., "Album Anniversaries Web")
  2. Generate a Media Identifier Private Key (.p8 file)
  3. Download the `.p8` private key file (ONLY downloadable once!)
  4. Record the Key ID (e.g., "ABC123XYZ")
  5. Record your Team ID (found in Membership section)
- **Security**:
  - Store `.p8` file in secure environment variables (never commit to git)
  - Use Firebase Functions environment config: `firebase functions:config:set apple.private_key="$(cat AuthKey_ABC123.p8)"`
- **Source**: [Generating Developer Tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)

#### 3. Domain/App Configuration
- **Required**: Register your web app domain
- **Location**: Apple Developer Portal → MusicKit configuration
- **Development**: Can use `localhost` and `127.0.0.1` during development
- **Production**: Must register production domain (e.g., `album-anniversaries.firebaseapp.com`)

**Confidence**: **HIGH** - Apple's official requirements, standard for production apps

---

## Integration Notes (Angular-Specific)

### 1. Script Loading Strategy

**Option A: CDN via index.html (Recommended)**
```html
<!-- src/index.html -->
<head>
  <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js" async></script>
</head>
```
- **Pros**: Simplest, guaranteed load order, no build config changes
- **Cons**: External dependency, no tree-shaking
- **Confidence**: **HIGH**

**Option B: angular.json scripts array**
```json
// angular.json
{
  "projects": {
    "album-anniversaries": {
      "architect": {
        "build": {
          "options": {
            "scripts": [
              "https://js-cdn.music.apple.com/musickit/v3/musickit.js"
            ]
          }
        }
      }
    }
  }
}
```
- **Pros**: Centralized build config, Angular-managed
- **Cons**: Less transparent than index.html
- **Source**: [Angular MusicKit example](https://github.com/svkozak/music-player)

### 2. Change Detection Considerations

MusicKit events (player state changes, authorization status) occur outside Angular's zone:

```typescript
import { NgZone } from '@angular/core';

export class AppleMusicService {
  constructor(private ngZone: NgZone) {}

  setupPlayerListeners() {
    const music = window.MusicKit.getInstance();

    // Run inside Angular zone for change detection
    music.addEventListener('playbackStateDidChange', () => {
      this.ngZone.run(() => {
        this.playbackState$.next(music.player.playbackState);
      });
    });
  }
}
```

**Confidence**: **MEDIUM-HIGH** - Standard Angular pattern for third-party events

### 3. Service Abstraction Pattern

Create a common interface for both Spotify and Apple Music:

```typescript
// src/app/services/music-provider.interface.ts
export interface MusicProvider {
  initialize(): Promise<void>;
  authorize(): Promise<void>;
  getArtistAlbums(artistId: string): Observable<Album[]>;
  searchArtists(query: string): Observable<Artist[]>;
  // ... other common methods
}

// src/app/services/spotify.service.ts
export class SpotifyService implements MusicProvider { }

// src/app/services/apple-music.service.ts
export class AppleMusicService implements MusicProvider { }
```

**Confidence**: **HIGH** - Aligns with Angular DI patterns and your project's abstraction goals

### 4. Testing Considerations

MusicKit JS is a global CDN script, making unit tests challenging:

```typescript
// Mock MusicKit in test environment
// src/app/services/apple-music.service.spec.ts
beforeEach(() => {
  (window as any).MusicKit = {
    configure: jasmine.createSpy('configure').and.returnValue({
      authorize: jasmine.createSpy('authorize').and.returnValue(Promise.resolve('mock-token')),
      api: { /* mock API */ },
      player: { /* mock player */ }
    }),
    getInstance: jasmine.createSpy('getInstance')
  };
});
```

**Confidence**: **MEDIUM** - Standard mocking approach, requires boilerplate

---

## Confidence Levels Summary

| Component | Confidence | Notes |
|-----------|-----------|-------|
| **MusicKit JS v3** | **HIGH** | Apple's current recommendation, active development |
| **Custom TypeScript Types** | **MEDIUM-HIGH** | No official v3 types, but standard TS pattern |
| **Firebase Functions for JWT** | **HIGH** | Proven secure pattern, fits existing infrastructure |
| **Two-Token Auth Flow** | **HIGH** | Apple's documented approach |
| **$99/year Dev Program** | **HIGH** | Official requirement, no workarounds |
| **CDN Script Loading** | **HIGH** | Simplest integration, widely used |
| **NgZone for Events** | **MEDIUM-HIGH** | Angular best practice for external events |
| **Testing Strategy** | **MEDIUM** | Requires mocking, standard but boilerplate-heavy |

---

## Migration Path from Spotify (High-Level)

1. **Backend Setup** (NEW requirement vs. Spotify)
   - Enroll in Apple Developer Program ($99/year)
   - Generate MusicKit private key
   - Create Firebase Function for developer token generation
   - Store credentials in Firebase environment config

2. **Frontend Integration**
   - Add MusicKit JS v3 CDN script to `index.html`
   - Create custom TypeScript type definitions
   - Implement `AppleMusicService` with `MusicProvider` interface
   - Add NgZone integration for MusicKit events

3. **Authentication**
   - Fetch developer token from Firebase Function on app init
   - Configure MusicKit instance with developer token
   - Implement user authorization flow (popup-based)
   - Handle token expiration (6-month re-auth required)

4. **API Integration**
   - Map Apple Music API endpoints to `MusicProvider` interface
   - Handle API response differences (Spotify vs. Apple Music data structures)
   - Implement date filtering for album anniversaries
   - Add error handling for subscription-required features

**Estimated Complexity**: **MEDIUM-HIGH** - Backend requirement adds complexity vs. Spotify's pure client-side PKCE flow

---

## Sources

### Official Apple Documentation
- [MusicKit - Apple Developer](https://developer.apple.com/musickit/)
- [MusicKit JS v3 Documentation](https://js-cdn.music.apple.com/musickit/v3/docs/index.html)
- [MusicKit JS API Reference](https://developer.apple.com/documentation/musickitjs)
- [Generating Developer Tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)
- [User Authentication for MusicKit](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)

### TypeScript Support
- [@types/musickit-js - npm](https://www.npmjs.com/package/@types/musickit-js)
- [musickit-typescript - npm](https://www.npmjs.com/package/musickit-typescript)
- [musickit-typescript GitHub](https://github.com/wsmd/musickit-typescript)

### Community Resources
- [Apple Music Web Player (Angular + MusicKit)](https://github.com/svkozak/music-player)
- [Apple Music Token Generator](https://github.com/pelauimagineering/apple-music-token-generator)
- [Building an iPod with MusicKit JS](https://krisztian-seres.medium.com/building-an-ipod-part-3-integrating-apple-musickit-js-281f050321c0)
- [Storing Apple Music User Token](https://medium.com/@gavinkasdorf/apples-musickit-js-allows-you-to-access-an-apple-music-user-s-playlists-and-library-listen-to-32f77ff54d48)

### Developer Forums & Discussions
- [MusicKit JS v3 vs v1 Discussion](https://developer.apple.com/forums/thread/696938)
- [Apple Developer Program Cost](https://developer.apple.com/forums/thread/120537)
- [JWT Token Generation Discussion](https://github.com/panva/jose/discussions/158)

---

**Research Date**: January 31, 2026
**Researcher**: Claude Code Agent
**Next Steps**: Use this stack research to create implementation roadmap in `.planning/ROADMAP.md`
