# Phase 1: Service Abstraction & UI Foundation - Research

**Researched:** 2026-02-01
**Domain:** Angular dependency injection, service abstraction patterns, Material theming
**Confidence:** HIGH

## Summary

This phase requires refactoring existing Spotify-specific code to use a provider-agnostic architecture while maintaining identical functionality. The research reveals that Angular's InjectionToken with factory providers is the standard approach for interface-based dependency injection, since TypeScript interfaces don't exist at runtime. The codebase uses Angular 17 with comprehensive test coverage (124 tests) that must continue passing after refactoring.

For UI changes, Angular Material 17 supports custom button styling through CSS classes and SCSS theming. The phase requires adding a second sign-in button alongside the existing Spotify button, using official brand colors: Spotify green (#1DB954) and Apple Music red/pink (#FF0436 or #FF4E6B).

The critical challenge is ensuring zero behavior changes during refactoring - all existing tests must pass without modification, which requires careful implementation of the provider abstraction pattern.

**Primary recommendation:** Use InjectionToken with factory provider pattern at app.module level, implement MusicService as TypeScript interface (for type safety) with token-based injection, and leverage TestBed provider mocking for test compatibility.

## Standard Stack

The established libraries/tools for Angular dependency injection and service abstraction:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @angular/core | 17.0.0 | InjectionToken, inject() function | Angular's official DI system, supports interface-based injection |
| TypeScript | 5.2.0 | Interface definitions | Type safety for service contracts |
| @angular/common/http | 17.0.0 | HttpClient | Already in use, provider-agnostic HTTP service |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @angular/material | 17.x | Button components, theming | Already in use for UI components |
| Jasmine/Karma | 4.5.0/6.4.0 | Testing framework | Existing test infrastructure, TestBed mocking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| InjectionToken | Abstract class as token | Abstract classes work but add unused code to bundle; InjectionToken is more lightweight |
| Factory provider | useClass with providedIn | Factory allows runtime decision based on auth state; useClass is static |
| CSS classes | Material theme palettes | CSS classes simpler for brand colors outside palette system |

**Installation:**
```bash
# No new dependencies required - using existing Angular 17 stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── services/
│   ├── music-service.interface.ts    # MusicService interface definition
│   ├── music-service.token.ts        # MUSIC_SERVICE InjectionToken
│   ├── spotify.service.ts             # Implements MusicService
│   └── apple-music.service.ts         # Implements MusicService (Phase 2+)
├── app.module.ts                      # Provider configuration
└── app.component.ts                   # Injects MUSIC_SERVICE token
```

### Pattern 1: InjectionToken with Factory Provider
**What:** Create a token for dependency injection when the injected type is an interface (not reified at runtime)

**When to use:** Interface-based abstraction where implementations are swapped based on runtime conditions

**Example:**
```typescript
// music-service.interface.ts
export interface MusicService {
  loadArtistsWithAlbums(accessToken: string): Observable<boolean>;
  artists: Observable<Artist[]>;
  // ... other methods from SpotifyService
}

// music-service.token.ts
import { InjectionToken } from '@angular/core';
import { MusicService } from './music-service.interface';

export const MUSIC_SERVICE = new InjectionToken<MusicService>('MusicService');

// app.module.ts (or app.config.ts for standalone components)
import { MUSIC_SERVICE } from './services/music-service.token';
import { SpotifyService } from './services/spotify.service';

providers: [
  SpotifyService, // Provide concrete implementation
  {
    provide: MUSIC_SERVICE,
    useFactory: (spotifyService: SpotifyService) => spotifyService,
    deps: [SpotifyService]
  }
]

// app.component.ts
import { MUSIC_SERVICE } from './services/music-service.token';
import { MusicService } from './services/music-service.interface';

export class AppComponent {
  constructor(@Inject(MUSIC_SERVICE) private musicService: MusicService) {}
  // or using inject() function:
  private musicService = inject(MUSIC_SERVICE);
}
```

**Source:** [Angular Official Docs - Defining dependency providers](https://angular.dev/guide/di/defining-dependency-providers)

### Pattern 2: Service Interface Implementation
**What:** SpotifyService implements MusicService interface without changing internal implementation

**When to use:** Refactoring existing service to conform to abstraction without behavior changes

**Example:**
```typescript
// spotify.service.ts
import { MusicService } from './music-service.interface';

@Injectable({
  providedIn: 'root'  // Keep existing providedIn for tree-shaking
})
export class SpotifyService implements MusicService {
  // Existing implementation unchanged
  // Public methods already match interface contract

  loadArtistsWithAlbums(accessToken: string): Observable<boolean> {
    // Existing implementation
  }

  get artists(): Observable<Artist[]> {
    // Existing implementation
  }
}
```

### Pattern 3: TestBed Provider Mocking
**What:** Override MUSIC_SERVICE token in tests with mock implementations

**When to use:** Testing components that inject MUSIC_SERVICE token

**Example:**
```typescript
// app.component.spec.ts
import { MUSIC_SERVICE } from './services/music-service.token';
import { SpotifyService } from './spotify.service';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        SpotifyService,
        { provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG },
        {
          provide: MUSIC_SERVICE,
          useFactory: (spotifyService: SpotifyService) => spotifyService,
          deps: [SpotifyService]
        }
      ]
    });
  });
});
```

**Source:** [Angular Testing - Services](https://angular.dev/guide/testing/services)

### Pattern 4: Responsive Button Layout
**What:** Side-by-side buttons on desktop, stacked on mobile using CSS Flexbox

**When to use:** Dual sign-in buttons with responsive behavior

**Example:**
```scss
// app.component.scss
.sign-in-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;

  // Stack on mobile
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 12px;
  }
}

.sign-in-button {
  min-width: 200px;
  height: 48px;

  &.spotify {
    background-color: #1DB954;
    color: white;

    &:hover {
      background-color: #1ed760;
    }
  }

  &.apple-music {
    background-color: #FF0436;
    color: white;

    &:hover {
      background-color: #FF4E6B;
    }
  }
}
```

**Source:** Current codebase uses Angular Material buttons; custom styling via CSS classes is standard pattern

### Anti-Patterns to Avoid
- **Using TypeScript interface directly as DI token:** Interfaces are erased at compile time and cannot serve as tokens - leads to NullInjectorError
- **Creating duplicate InjectionToken instances:** Each InjectionToken instance is unique by reference; creating new instances with same description causes injection failures
- **Modifying SpotifyService behavior during refactoring:** Phase 1 requires identical behavior - any logic changes break the "all tests pass" requirement
- **Providing components in providers array:** Components should never appear in providers - common mistake with standalone components

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interface-based DI | Custom service factory pattern | InjectionToken with useFactory | Angular's DI system needs runtime tokens; InjectionToken is the standard solution |
| Service mocking in tests | Manual mock implementations | TestBed provider overrides | TestBed already handles provider substitution with proper DI hierarchy |
| Responsive layout | Custom media query JavaScript | CSS Flexbox with @media | Browser-native, performant, accessible; JS adds unnecessary complexity |
| Brand color theming | Material theme palette extension | CSS classes with hex colors | Official brand colors don't fit Material palette system; CSS classes simpler |

**Key insight:** Angular's DI system is sophisticated but opinionated - attempting to work around it (e.g., manual factory patterns, service locator pattern) creates complexity and breaks testability. Use InjectionToken for interface-based injection.

## Common Pitfalls

### Pitfall 1: Breaking Existing Tests During Refactoring
**What goes wrong:** Changing SpotifyService injection in components breaks existing test configurations

**Why it happens:** Tests use `TestBed.inject(SpotifyService)` and provide `SpotifyService` directly; switching to `@Inject(MUSIC_SERVICE)` changes the injection token

**How to avoid:**
1. Add MUSIC_SERVICE provider to app.module that uses SpotifyService
2. Update component constructor to inject MUSIC_SERVICE token
3. Update ALL test files to provide both SpotifyService AND MUSIC_SERVICE token with factory
4. Run tests after each component change to catch injection failures early

**Warning signs:**
- `NullInjectorError: No provider for InjectionToken MUSIC_SERVICE`
- Tests pass individually but fail when run together
- `TypeError: Cannot read property 'loadArtistsWithAlbums' of undefined`

### Pitfall 2: InjectionToken Instance Duplication
**What goes wrong:** Creating new InjectionToken instance in different files causes DI to treat them as separate tokens

**Why it happens:** InjectionToken equality is by reference, not by description string

**How to avoid:**
- Define InjectionToken in single file (e.g., `music-service.token.ts`)
- Export as const: `export const MUSIC_SERVICE = new InjectionToken<MusicService>('MusicService')`
- Import same instance everywhere: `import { MUSIC_SERVICE } from './services/music-service.token'`
- Never recreate: `new InjectionToken<MusicService>('MusicService')` in multiple places

**Warning signs:**
- `NullInjectorError` even though provider is configured
- Different behavior in different modules
- Tests pass but runtime fails (or vice versa)

### Pitfall 3: Circular Dependencies with Service Abstraction
**What goes wrong:** SpotifyService imports MusicService interface, component imports both interface and token, creating import cycles

**Why it happens:** Poor file organization leads to circular imports between service implementations and their abstractions

**How to avoid:**
- Keep interface in separate file from implementation
- Keep token in separate file from interface
- Import chain: Component → Token → Interface ← Service
- Never import service directly in components after refactoring

**Warning signs:**
- Webpack warnings: "WARNING in Circular dependency detected"
- Undefined service methods at runtime despite correct types
- Services not instantiated properly

### Pitfall 4: Incomplete Interface Contract
**What goes wrong:** MusicService interface missing private methods or BehaviorSubject internals that components rely on

**Why it happens:** Only extracting public API methods into interface, but components access internal properties

**How to avoid:**
1. Audit all SpotifyService usage: `git grep "spotifyService\." src/app/`
2. Include ALL accessed properties/methods in interface (even private-looking ones)
3. For this codebase: Interface needs `artists` getter, `loadArtistsWithAlbums()`, and static methods (`albumHadBirthdayPastWeek`, etc.)
4. Consider making static methods standalone functions if they're pure utility functions

**Warning signs:**
- TypeScript errors: "Property 'artists' does not exist on type 'MusicService'"
- Runtime errors after refactoring: "musicService.artists is undefined"
- Tests fail with "not a function" errors

### Pitfall 5: Angular Material Theme Breaking Changes
**What goes wrong:** `@angular/material/theming` import fails in Angular 17

**Why it happens:** Angular Material 17 deprecated the `/theming` entrypoint (worked in v16, broken in v17)

**How to avoid:**
- Don't use Material theme palettes for brand colors
- Use direct CSS classes with hex color values
- If theming needed: Import from `@angular/material` not `@angular/material/theming`
- Test button styling in actual browser, not just compiled CSS

**Warning signs:**
- Build error: "Module not found: Error: Can't resolve '@angular/material/theming'"
- Button colors don't apply
- Theme mixin errors in SCSS compilation

**Source:** [GitHub Issue #28204 - theming entrypoint removed in v17](https://github.com/angular/components/issues/28204)

## Code Examples

Verified patterns from official sources and current codebase:

### Example 1: Complete Service Abstraction Setup
```typescript
// src/app/services/music-service.interface.ts
import { Observable } from 'rxjs';
import { Artist } from '../artist';

export interface MusicService {
  // Observable of artists with albums
  readonly artists: Observable<Artist[]>;

  // Load artists and albums from provider API
  loadArtistsWithAlbums(accessToken: string): Observable<boolean>;

  // Note: Static methods like albumHadBirthdayPastWeek stay on concrete
  // classes since they're utility functions, not service methods
}

// src/app/services/music-service.token.ts
import { InjectionToken } from '@angular/core';
import { MusicService } from './music-service.interface';

export const MUSIC_SERVICE = new InjectionToken<MusicService>(
  'MusicService',
  {
    providedIn: null, // Don't auto-provide; configured in app.module
  }
);

// src/app/services/spotify.service.ts
import { Injectable } from '@angular/core';
import { MusicService } from './music-service.interface';
// ... existing imports

@Injectable({
  providedIn: 'root', // Keep for tree-shaking and backward compatibility
})
export class SpotifyService implements MusicService {
  // Existing implementation unchanged
  // Class already matches MusicService contract
}

// src/app/app.module.ts
import { MUSIC_SERVICE } from './services/music-service.token';
import { SpotifyService } from './services/spotify.service';

@NgModule({
  // ... existing config
  providers: [
    // ... existing providers
    {
      provide: MUSIC_SERVICE,
      useFactory: (spotifyService: SpotifyService) => spotifyService,
      deps: [SpotifyService]
    }
  ]
})
export class AppModule { }
```

### Example 2: Component Injection Refactoring
```typescript
// src/app/app.component.ts - BEFORE
import { SpotifyService } from './spotify.service';

export class AppComponent implements OnInit {
  constructor(
    private spotifyService: SpotifyService,
    // ... other dependencies
  ) {}

  ngOnInit() {
    const doneLoading$ = this.spotifyService.loadArtistsWithAlbums(
      this.accessToken
    );
  }
}

// src/app/app.component.ts - AFTER
import { MUSIC_SERVICE } from './services/music-service.token';
import { MusicService } from './services/music-service.interface';
import { SpotifyService } from './spotify.service'; // Keep for static methods

export class AppComponent implements OnInit {
  constructor(
    @Inject(MUSIC_SERVICE) private musicService: MusicService,
    // ... other dependencies
  ) {}

  ngOnInit() {
    const doneLoading$ = this.musicService.loadArtistsWithAlbums(
      this.accessToken
    );

    // Static methods still accessed via class
    this.artists$ = this.musicService.artists.pipe(
      map(artists => artists.filter(artist => {
        artist.albums = artist.albums.filter(
          SpotifyService.albumHadBirthdayPastWeek // Unchanged
        );
        return artist.albums.length > 0;
      }))
    );
  }
}
```

### Example 3: Test Configuration for Refactored Service
```typescript
// src/app/app.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { MUSIC_SERVICE } from './services/music-service.token';
import { SpotifyService } from './spotify.service';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [HttpClientModule],
      providers: [
        SpotifyService, // Provide concrete implementation
        { provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG },
        {
          provide: MUSIC_SERVICE, // Provide token
          useFactory: (spotifyService: SpotifyService) => spotifyService,
          deps: [SpotifyService]
        }
      ]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
```

### Example 4: Dual Sign-In Button UI
```html
<!-- src/app/app.component.html -->
<div class="landing-page" *ngIf="!accessToken">
  <h1>Album Anniversaries</h1>
  <p>Sign in with your music provider</p>

  <div class="sign-in-buttons">
    <button
      mat-raised-button
      class="sign-in-button spotify"
      (click)="loginSpotify()">
      <mat-icon svgIcon="spotify"></mat-icon>
      <span>Sign in with Spotify</span>
    </button>

    <button
      mat-raised-button
      class="sign-in-button apple-music"
      (click)="loginAppleMusic()"
      disabled>
      <mat-icon svgIcon="apple-music"></mat-icon>
      <span>Sign in with Apple Music</span>
    </button>
  </div>
</div>
```

```scss
// src/app/app.component.scss
.landing-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.sign-in-buttons {
  display: flex;
  gap: 16px;
  margin-top: 2rem;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 280px;
  }
}

.sign-in-button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
  height: 56px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 28px;
  text-transform: none;
  letter-spacing: 0.5px;

  @media (max-width: 600px) {
    width: 100%;
    justify-content: center;
  }

  &.spotify {
    background-color: #1DB954;
    color: white;

    &:hover:not([disabled]) {
      background-color: #1ed760;
    }
  }

  &.apple-music {
    background-color: #FF0436;
    color: white;

    &:hover:not([disabled]) {
      background-color: #FF4E6B;
    }

    &[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  mat-icon {
    font-size: 24px;
    width: 24px;
    height: 24px;
  }
}
```

**Source:** Responsive layout pattern from existing Angular Material components in codebase; brand colors from official sources below.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Abstract class as DI token | InjectionToken for interfaces | Angular 9+ | InjectionToken recommended for "lightweight injection tokens" - avoids unused code in bundle |
| providedIn: NgModule | providedIn: 'root' | Angular 6+ | Tree-shaking, simpler mental model |
| @angular/flex-layout | CSS Flexbox/Grid | 2023 | @angular/flex-layout deprecated; native CSS preferred |
| @angular/material/theming | Direct @angular/material imports | Angular 17 | Theming entrypoint removed |

**Deprecated/outdated:**
- **Implicit Grant OAuth flow (Spotify):** Deprecated Nov 2025, app already migrated to PKCE
- **providedIn: 'any':** Deprecated in Angular, use 'root' or 'platform'
- **@angular/flex-layout:** Package deprecated, use CSS Flexbox directly

## Open Questions

Things that couldn't be fully resolved:

1. **Factory provider timing with lazy loading**
   - What we know: Factory provider works for app-level singleton services
   - What's unclear: Whether factory needs adjustment if Apple Music service is lazy-loaded in future phases
   - Recommendation: Use factory at app.module level for Phase 1; revisit in Phase 2 if Apple Music becomes separate module

2. **Static method placement for shared date logic**
   - What we know: `albumHadBirthdayPastWeek()` is static on SpotifyService, used by components
   - What's unclear: Whether these should move to interface as instance methods or stay as static utilities
   - Recommendation: Keep as static methods on concrete classes for Phase 1 (no behavior change); consider extracting to shared utility service in future phase

3. **Material Design 3 theming compatibility**
   - What we know: Angular Material 17 supports Material 3 theming; brand colors don't fit Material palette system
   - What's unclear: Whether Material 3 color roles (primary/secondary) should be used for button variants
   - Recommendation: Use CSS classes with hex colors for Phase 1 (simpler, explicit brand colors); could migrate to M3 theming later if design system evolves

## Sources

### Primary (HIGH confidence)
- [Angular Official Docs - InjectionToken](https://angular.dev/api/core/InjectionToken) - Token syntax and factory functions
- [Angular Official Docs - Defining dependency providers](https://angular.dev/guide/di/defining-dependency-providers) - Factory providers and interface-based injection
- [Angular Official Docs - Testing services](https://angular.dev/guide/testing/services) - TestBed mocking patterns
- [Spotify Brand Colors - Mobbin](https://mobbin.com/colors/brand/spotify) - Official Spotify green #1DB954
- Current codebase (`src/app/spotify.service.ts`, `src/app/spotify.service.spec.ts`) - Existing patterns and test structure

### Secondary (MEDIUM confidence)
- [Angular DI: private providers concept](https://angular.love/make-the-most-of-angular-di-private-providers-concept/) - InjectionToken factory patterns
- [Interfaces in Angular DI - Damir's Corner](https://www.damirscorner.com/blog/posts/20211015-InterfacesInAngularDependencyInjection.html) - Why interfaces don't work as tokens
- [Angular Material Button Styling - Zoaib Khan](https://zoaibkhan.com/blog/transform-your-angular-material-buttons-with-custom-colors/) - Custom button color approaches
- [6 Angular DI Mistakes - Medium](https://medium.com/@saneekadam1326/6-angular-dependency-injection-mistakes-even-google-engineers-avoid-8e5613b5d012) - Common pitfalls
- [Apple Music colors - ColorsWall](https://colorswall.com/palette/89755) - Apple Music red/pink palette

### Tertiary (LOW confidence)
- [Angular Flex Layout deprecation](https://github.com/angular/flex-layout) - WebSearch only, but widely reported as deprecated
- [Apple Music brand guidelines](https://marketing.services.apple/apple-music-identity-guidelines) - URL exists but specific color codes not publicly documented (using community-sourced #FF0436/#FF4E6B)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Angular docs and existing codebase patterns
- Architecture: HIGH - Angular docs provide explicit InjectionToken patterns; existing test structure well-documented
- Pitfalls: MEDIUM - Based on WebSearch findings and common Angular issues, not all verified in practice
- Brand colors: MEDIUM - Spotify color verified from official brand site; Apple Music color from community sources (official guidelines don't publish hex codes)

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - Angular stable, patterns unlikely to change)
