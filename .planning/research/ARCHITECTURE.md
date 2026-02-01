# Architecture Research: Multi-Service Integration

## Executive Summary

This document outlines the architecture for integrating Apple Music (via MusicKit JS) alongside Spotify in the existing Angular 17 application. The design focuses on creating a service-agnostic architecture where both music providers are abstracted behind a common interface, allowing components to remain decoupled from the specific provider implementation.

## Interface Design

### Core Music Service Interface

Create an abstract class `MusicService` that defines the contract for all music provider implementations:

```typescript
// src/app/services/music.service.ts
import { Observable } from 'rxjs';
import { Artist } from '../models/artist';
import { Album } from '../models/album';

export abstract class MusicService {
  // Observable of artists with their albums
  abstract get artists(): Observable<Artist[]>;

  // Load artists with their albums using provider-specific access token
  abstract loadArtistsWithAlbums(accessToken: string): Observable<boolean>;

  // Static methods for date filtering (shared logic across services)
  static albumHadBirthdayPastWeek(album: Album): boolean {
    // Existing implementation from SpotifyService
  }

  static albumHadBirthdayPastMonth(album: Album): boolean {
    // Existing implementation from SpotifyService
  }

  static albumReleasedPastYear(album: Album): boolean {
    // Existing implementation from SpotifyService
  }

  // Provider identification
  abstract get providerName(): string;
  abstract get providerIcon(): string; // Material icon name or SVG path
}
```

### Provider-Specific Response Interfaces

Keep provider-specific API response interfaces internal to each service implementation:

```typescript
// src/app/services/spotify/spotify-response.types.ts
export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtistResponse {
  id: string;
  href: string;
  name: string;
  images: SpotifyImage[];
  popularity: number;
  external_urls: { spotify: string };
}

// Similar structure for Apple Music
// src/app/services/apple-music/apple-music-response.types.ts
export interface AppleMusicArtwork {
  width: number;
  height: number;
  url: string; // Template URL: replace {w}x{h} with dimensions
}

export interface AppleMusicArtistResponse {
  id: string;
  type: 'artists';
  attributes: {
    name: string;
    url: string;
  };
}
```

## Service Implementation Pattern

### 1. Refactor Existing SpotifyService

```typescript
// src/app/services/spotify/spotify.service.ts
import { Injectable, Inject } from '@angular/core';
import { MusicService } from '../music.service';

@Injectable()
export class SpotifyService extends MusicService {
  private isDev: boolean;
  private _artists: BehaviorSubject<Artist[]>;
  private dataStore: { artists: Artist[] };

  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    super();
    this.isDev = config.isDev;
    this.dataStore = { artists: [] };
    this._artists = new BehaviorSubject<Artist[]>([]);
  }

  get providerName(): string {
    return 'Spotify';
  }

  get providerIcon(): string {
    return 'library_music'; // Material icon
  }

  get artists(): Observable<Artist[]> {
    return this._artists.asObservable();
  }

  loadArtistsWithAlbums(accessToken: string): Observable<boolean> {
    // Existing implementation
  }

  // Private helper methods for Spotify-specific data transformation
  private mapToArtist(item: SpotifyArtistResponse): Artist { ... }
  private mapToAlbum(item: SpotifyAlbumResponse): Album { ... }
}
```

### 2. Create AppleMusicService

```typescript
// src/app/services/apple-music/apple-music.service.ts
import { Injectable, Inject } from '@angular/core';
import { MusicService } from '../music.service';

declare var MusicKit: any; // MusicKit JS global from CDN

@Injectable()
export class AppleMusicService extends MusicService {
  private musicKitInstance: any;
  private _artists: BehaviorSubject<Artist[]>;
  private dataStore: { artists: Artist[] };

  constructor(@Inject(APP_CONFIG) private config: AppConfig) {
    super();
    this.dataStore = { artists: [] };
    this._artists = new BehaviorSubject<Artist[]>([]);
  }

  get providerName(): string {
    return 'Apple Music';
  }

  get providerIcon(): string {
    return 'apple'; // Would need custom SVG icon
  }

  get artists(): Observable<Artist[]> {
    return this._artists.asObservable();
  }

  loadArtistsWithAlbums(accessToken: string): Observable<boolean> {
    return from(this.initializeMusicKit(accessToken)).pipe(
      switchMap(() => this.fetchHeavyRotationArtists()),
      switchMap((artists) => this.loadAlbumsForArtists(artists)),
      map(() => true),
      catchError((error) => {
        console.error('[AppleMusicService] Error loading artists:', error);
        return of(false);
      }),
    );
  }

  private async initializeMusicKit(developerToken: string): Promise<void> {
    if (!this.musicKitInstance) {
      await MusicKit.configure({
        developerToken: developerToken,
        app: {
          name: this.config.title,
          build: '1.0.0',
        },
      });
      this.musicKitInstance = MusicKit.getInstance();
      await this.musicKitInstance.authorize();
    }
  }

  private async fetchHeavyRotationArtists(): Promise<any[]> {
    // Apple Music doesn't have "top artists" - use heavy rotation + recent plays
    const recentlyPlayed = await this.musicKitInstance.api.recentPlayed();
    // Extract unique artists from recent plays
    return this.extractArtistsFromHistory(recentlyPlayed);
  }

  // Private helper methods for Apple Music-specific data transformation
  private mapToArtist(item: AppleMusicArtistResponse): Artist {
    return {
      id: item.id,
      href: item.attributes.url,
      name: item.attributes.name,
      images: this.generateImageSizes(item.relationships?.albums?.data[0]?.attributes?.artwork),
      popularity: 0, // Apple Music doesn't provide popularity scores
      external_url: item.attributes.url,
      albums: [],
    };
  }

  private mapToAlbum(item: AppleMusicAlbumResponse, artistId: string): Album {
    return {
      id: item.id,
      artist_id: artistId,
      name: item.attributes.name,
      release_date: item.attributes.releaseDate,
      release_date_precision: 'day', // Apple Music always provides day precision
      images: this.generateImageSizes(item.attributes.artwork),
      external_url: item.attributes.url,
    };
  }

  // Convert Apple Music artwork template to multiple sizes (match Spotify format)
  private generateImageSizes(artwork: AppleMusicArtwork): Image[] {
    if (!artwork) return [];

    const sizes = [
      { width: 640, height: 640 },
      { width: 300, height: 300 },
      { width: 64, height: 64 },
    ];

    return sizes.map(size => ({
      url: artwork.url
        .replace('{w}', size.width.toString())
        .replace('{h}', size.height.toString()),
      width: size.width,
      height: size.height,
    }));
  }
}
```

## Dependency Injection Strategy

### Factory Provider Pattern with InjectionToken

Use Angular's `InjectionToken` with a factory function to provide the correct service at runtime based on user selection:

```typescript
// src/app/services/music-service.token.ts
import { InjectionToken } from '@angular/core';
import { MusicService } from './music.service';

export const MUSIC_SERVICE = new InjectionToken<MusicService>(
  'MUSIC_SERVICE',
  {
    providedIn: 'root',
    factory: () => {
      // This will be replaced with proper factory logic
      throw new Error('MUSIC_SERVICE must be provided with a factory');
    },
  }
);
```

### Service Provider Module

Create a module to handle dynamic service provisioning:

```typescript
// src/app/services/music-provider.module.ts
import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MUSIC_SERVICE } from './music-service.token';
import { MusicService } from './music.service';
import { SpotifyService } from './spotify/spotify.service';
import { AppleMusicService } from './apple-music/apple-music.service';
import { MusicProviderSelectionService } from './music-provider-selection.service';

@NgModule({
  imports: [CommonModule],
})
export class MusicProviderModule {
  static forRoot(): ModuleWithProviders<MusicProviderModule> {
    return {
      ngModule: MusicProviderModule,
      providers: [
        SpotifyService,
        AppleMusicService,
        MusicProviderSelectionService,
        {
          provide: MUSIC_SERVICE,
          useFactory: (
            spotifyService: SpotifyService,
            appleMusicService: AppleMusicService,
            selectionService: MusicProviderSelectionService,
          ): MusicService => {
            // Return the appropriate service based on current selection
            const provider = selectionService.getCurrentProvider();
            return provider === 'apple-music'
              ? appleMusicService
              : spotifyService;
          },
          deps: [SpotifyService, AppleMusicService, MusicProviderSelectionService],
        },
      ],
    };
  }
}
```

### Component Injection

Components inject the `MUSIC_SERVICE` token instead of concrete implementations:

```typescript
// src/app/app.component.ts (refactored)
import { Component, Inject } from '@angular/core';
import { MUSIC_SERVICE } from './services/music-service.token';
import { MusicService } from './services/music.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  artists$: Observable<Artist[]>;

  constructor(
    @Inject(MUSIC_SERVICE) private musicService: MusicService,
    private musicProviderSelection: MusicProviderSelectionService,
  ) {}

  async ngOnInit() {
    const accessToken = this.getStoredToken();

    if (accessToken) {
      this.loading = true;
      const doneLoading$ = this.musicService.loadArtistsWithAlbums(accessToken);

      this.artists$ = this.musicService.artists.pipe(
        // Same filtering logic as before
      );

      doneLoading$.subscribe(() => {
        this.loading = false;
      });
    }
  }

  get currentProviderName(): string {
    return this.musicService.providerName;
  }
}
```

## Data Transformation Layer

### Shared Data Models

The existing `Artist` and `Album` interfaces remain unchanged as they already represent a provider-agnostic format:

```typescript
// src/app/models/artist.ts (existing, no changes needed)
export interface Artist {
  id: string;
  href: string;
  name: string;
  popularity: number;
  images: Image[];
  external_url: string;
  albums?: Album[];
}

// src/app/models/album.ts (existing, no changes needed)
export interface Album {
  id: string;
  artist_id: string;
  name: string;
  release_date: string;        // ISO format: YYYY-MM-DD
  release_date_precision: string; // 'day', 'month', or 'year'
  images: Image[];
  external_url: string;
}
```

### Transformation Strategy

Each service implements private mapping methods to transform provider-specific responses to shared models:

**Key Transformation Considerations:**

1. **Images**:
   - Spotify provides images directly as array
   - Apple Music uses artwork template URLs (requires dimension substitution)
   - Solution: Generate multiple sizes from template in AppleMusicService

2. **Popularity**:
   - Spotify provides popularity score (0-100)
   - Apple Music doesn't provide popularity
   - Solution: Default to 0 for Apple Music (or derive from play count if available)

3. **Release Dates**:
   - Both services provide ISO format dates
   - Apple Music always has day precision
   - Spotify may have month or year precision
   - Solution: Use existing `release_date_precision` field

4. **External URLs**:
   - Spotify: `external_urls.spotify`
   - Apple Music: `attributes.url`
   - Solution: Map to `external_url` field in shared model

5. **Artist ID References**:
   - Both use string IDs but different formats
   - Solution: Store provider-specific IDs as-is, use them for API calls

## State Management

### Music Provider Selection Service

Create a service to manage the current music provider selection:

```typescript
// src/app/services/music-provider-selection.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type MusicProvider = 'spotify' | 'apple-music';

@Injectable({
  providedIn: 'root',
})
export class MusicProviderSelectionService {
  private static readonly STORAGE_KEY = 'selected_music_provider';
  private currentProvider$ = new BehaviorSubject<MusicProvider>('spotify');

  constructor() {
    // Load saved provider on initialization
    const saved = this.getSavedProvider();
    if (saved) {
      this.currentProvider$.next(saved);
    }
  }

  getCurrentProvider(): MusicProvider {
    return this.currentProvider$.value;
  }

  getProviderObservable(): Observable<MusicProvider> {
    return this.currentProvider$.asObservable();
  }

  setProvider(provider: MusicProvider): void {
    this.currentProvider$.next(provider);
    this.saveProvider(provider);
  }

  private getSavedProvider(): MusicProvider | null {
    const saved = sessionStorage.getItem(
      MusicProviderSelectionService.STORAGE_KEY
    );
    return (saved === 'spotify' || saved === 'apple-music') ? saved : null;
  }

  private saveProvider(provider: MusicProvider): void {
    sessionStorage.setItem(
      MusicProviderSelectionService.STORAGE_KEY,
      provider
    );
  }

  clearProvider(): void {
    sessionStorage.removeItem(MusicProviderSelectionService.STORAGE_KEY);
    this.currentProvider$.next('spotify'); // Default to Spotify
  }
}
```

### Authentication State Management

Separate authentication state for each provider:

```typescript
// src/app/services/auth-state.service.ts
import { Injectable } from '@angular/core';
import { MusicProvider } from './music-provider-selection.service';

interface ProviderTokens {
  spotify?: {
    accessToken: string;
    expiresAt: number;
  };
  appleMusic?: {
    developerToken: string;
    userToken: string;
    expiresAt: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private static readonly STORAGE_KEY_PREFIX = 'auth_';

  getToken(provider: MusicProvider): string | null {
    const key = `${AuthStateService.STORAGE_KEY_PREFIX}${provider}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const data = JSON.parse(stored);

    // Check expiration
    if (Date.now() >= data.expiresAt) {
      this.clearToken(provider);
      return null;
    }

    return provider === 'spotify'
      ? data.accessToken
      : data.userToken;
  }

  setToken(provider: MusicProvider, token: string, expiresIn: number): void {
    const key = `${AuthStateService.STORAGE_KEY_PREFIX}${provider}`;
    const expiresAt = Date.now() + (expiresIn - 60) * 1000; // 60s buffer

    const data = provider === 'spotify'
      ? { accessToken: token, expiresAt }
      : { userToken: token, expiresAt };

    localStorage.setItem(key, JSON.stringify(data));
  }

  clearToken(provider: MusicProvider): void {
    const key = `${AuthStateService.STORAGE_KEY_PREFIX}${provider}`;
    localStorage.removeItem(key);
  }

  clearAllTokens(): void {
    this.clearToken('spotify');
    this.clearToken('apple-music');
  }
}
```

### Login Flow Update

Update AppComponent to handle provider selection at login:

```typescript
// In app.component.ts
async login(provider: MusicProvider) {
  this.musicProviderSelection.setProvider(provider);

  if (provider === 'spotify') {
    await this.loginSpotify();
  } else {
    await this.loginAppleMusic();
  }
}

private async loginSpotify() {
  // Existing Spotify PKCE flow
}

private async loginAppleMusic() {
  // Initialize MusicKit JS and trigger authorization
  // Store developer token and user token in AuthStateService
}
```

## Build Order

### Phase 1: Abstraction Layer (Week 1)

**Priority: Set up the foundation without breaking existing functionality**

1. **Create base architecture** (Day 1-2)
   - Create `MusicService` abstract class with interface definition
   - Create `MUSIC_SERVICE` InjectionToken
   - Create `MusicProviderSelectionService` for state management
   - Create `AuthStateService` for multi-provider token management

2. **Reorganize existing code** (Day 3-4)
   - Move `SpotifyService` to `src/app/services/spotify/` directory
   - Extract Spotify-specific interfaces to `spotify-response.types.ts`
   - Update imports across the application
   - Run full test suite to ensure nothing breaks

3. **Refactor SpotifyService** (Day 5-7)
   - Make `SpotifyService` extend `MusicService`
   - Move static date filtering methods to `MusicService` base class
   - Update `SpotifyService` to use `AuthStateService` for token management
   - Update all tests for refactored `SpotifyService`
   - Verify application still works end-to-end

**Deliverable**: Spotify working with new architecture, no functional changes for users

### Phase 2: Factory Provider Setup (Week 2)

**Priority: Make dependency injection dynamic**

1. **Create MusicProviderModule** (Day 1-2)
   - Implement `MusicProviderModule.forRoot()` with factory provider
   - Add factory logic to select service based on `MusicProviderSelectionService`
   - Import in `AppModule`

2. **Update AppComponent** (Day 3-4)
   - Inject `MUSIC_SERVICE` token instead of `SpotifyService` directly
   - Update authentication flow to use `AuthStateService`
   - Add provider selection UI (minimal - just Spotify for now)
   - Test that dependency injection works correctly

3. **Update other components** (Day 5-7)
   - Update `ArtistCardComponent` if needed
   - Update `AlbumListItemComponent` if needed
   - Search codebase for direct `SpotifyService` injections and replace with `MUSIC_SERVICE`
   - Run full test suite and fix any dependency injection issues

**Deliverable**: App uses factory pattern, still only Spotify, ready for second provider

### Phase 3: MusicKit JS Integration (Week 3-4)

**Priority: Add Apple Music as second provider**

1. **Set up MusicKit JS** (Day 1-2)
   - Add MusicKit JS to `angular.json` scripts
   - Create Apple Music developer account and get developer token
   - Create initialization script for MusicKit
   - Test MusicKit loads correctly in development

2. **Create AppleMusicService** (Day 3-7)
   - Implement `AppleMusicService` extending `MusicService`
   - Implement authentication flow (developer token + user authorization)
   - Implement data fetching (heavy rotation, recent plays, library access)
   - Create transformation methods from Apple Music API to shared models
   - Add extensive logging for debugging

3. **Data mapping and testing** (Day 8-10)
   - Test Apple Music authentication flow
   - Test artist/album data fetching
   - Verify data transformation produces correct `Artist` and `Album` objects
   - Test date filtering methods work with Apple Music data
   - Create mock data for Apple Music tests

4. **Integration** (Day 11-14)
   - Register `AppleMusicService` in `MusicProviderModule`
   - Update factory logic to handle both providers
   - Test switching between providers
   - Add provider selection UI at login screen
   - Test full user flow for both providers

**Deliverable**: Both Spotify and Apple Music working, user can choose provider

### Phase 4: Polish and Optimization (Week 5)

**Priority: Improve UX and handle edge cases**

1. **UI/UX improvements** (Day 1-3)
   - Add provider icons/branding to login screen
   - Add current provider indicator in header
   - Add "Switch Provider" functionality with logout
   - Improve loading states when switching providers
   - Add error handling for provider-specific issues

2. **Testing and bug fixes** (Day 4-5)
   - Write integration tests for multi-provider scenarios
   - Test edge cases (expired tokens, network errors, provider API changes)
   - Fix any bugs discovered during testing
   - Performance testing with large libraries

3. **Documentation** (Day 6-7)
   - Update `CLAUDE.md` with new architecture
   - Update README with Apple Music setup instructions
   - Document environment configuration for both providers
   - Create migration guide for future providers
   - Write troubleshooting guide

**Deliverable**: Production-ready multi-provider application

## Key Architectural Decisions

### 1. Abstract Class vs Interface

**Decision**: Use abstract class for `MusicService`

**Rationale**:
- Allows sharing common date filtering logic across all providers
- Enables default implementations for utility methods
- Better for inheritance hierarchy in TypeScript
- Clearer intent than interface for this use case

### 2. Factory Provider vs Service Locator

**Decision**: Use Angular's factory provider pattern with `InjectionToken`

**Rationale**:
- Leverages Angular's built-in dependency injection
- Type-safe compared to service locator pattern
- Easier to test with dependency injection
- Follows Angular best practices
- Avoids anti-pattern of manual service instantiation

### 3. Shared Models vs Provider-Specific Models

**Decision**: Use shared `Artist` and `Album` models with transformation layer

**Rationale**:
- Components remain completely agnostic to provider
- Simplifies component logic
- Enables provider switching without UI changes
- Trade-off: Some provider-specific fields may be lost (acceptable)
- Transformation happens at service boundary (clear separation)

### 4. Session vs Local Storage for Provider Selection

**Decision**: Use `sessionStorage` for provider selection, `localStorage` for tokens

**Rationale**:
- Provider selection is session-based (choose per session)
- Tokens should persist across sessions (better UX)
- Prevents confusion from stale provider selection
- Forces intentional provider choice each session
- Matches existing token persistence pattern

### 5. Eager vs Lazy Service Initialization

**Decision**: Eager initialization via `providedIn: 'root'` for both services

**Rationale**:
- Both services are lightweight
- No significant bundle size impact
- Simpler dependency management
- Factory decides which to use at runtime
- Avoids lazy loading complexity for minimal gain

### 6. MusicKit JS Loading Strategy

**Decision**: Load MusicKit JS globally via CDN in `angular.json`

**Rationale**:
- MusicKit JS is not available as npm package
- CDN loading is Apple's recommended approach
- Ensures latest version automatically
- Minimal impact on bundle size
- Matches examples from community

## Future Extensibility

This architecture is designed to support additional music providers with minimal changes:

### Adding a Third Provider (e.g., YouTube Music)

1. Create `YouTubeMusicService extends MusicService`
2. Implement required methods and transformation logic
3. Register in `MusicProviderModule` factory
4. Add authentication flow
5. Update UI to show new provider option

**Required Changes**:
- New service file (~300-400 lines)
- Factory provider update (~5 lines)
- UI update (~20 lines)
- No changes to components or shared models

### Potential Enhancements

1. **Provider-Specific Features**:
   - Add optional methods to `MusicService` for provider-specific capabilities
   - Use type guards in components to enable advanced features when available

2. **Multi-Provider Support**:
   - Allow users to authenticate with multiple providers
   - Aggregate data from all authenticated providers
   - Requires architectural changes to factory pattern

3. **Provider Comparison**:
   - Side-by-side comparison of same artist across providers
   - Requires loading from multiple services simultaneously

## Testing Strategy

### Unit Tests

1. **MusicService implementations**:
   - Test each service in isolation
   - Mock HTTP calls
   - Verify correct transformation of provider data to shared models
   - Test error handling

2. **Factory provider**:
   - Test that correct service is returned based on provider selection
   - Test provider switching logic

3. **State management**:
   - Test `MusicProviderSelectionService` state changes
   - Test `AuthStateService` token storage and expiration

### Integration Tests

1. **Provider switching**:
   - Test switching providers mid-session
   - Verify data clears correctly
   - Test authentication state management

2. **Component integration**:
   - Test `AppComponent` with both providers
   - Verify components work correctly with data from both providers

### End-to-End Tests

1. **Full user flows**:
   - Complete authentication flow for each provider
   - Data loading and display
   - Provider switching

## References and Resources

### Angular Architecture Patterns

- [Angular Dependency Injection Guide](https://angular.dev/guide/di)
- [Strategy Pattern the Angular Way: DI and Runtime Flexibility](https://www.angularspace.com/strategy-pattern-the-angular-way-di-and-runtime-flexibility/)
- [The Hidden Power of InjectionToken Factory Functions in Angular](https://medium.com/netanelbasal/the-hidden-power-of-injectiontoken-factory-functions-in-angular-d42d5575859b)
- [Defining dependency providers - Angular](https://angular.dev/guide/di/defining-dependency-providers)

### MusicKit JS Integration

- [MusicKit JS Official Documentation](https://js-cdn.music.apple.com/musickit/v1/index.html)
- [MusicKit - Apple Developer](https://developer.apple.com/musickit/)
- [Building an iPod: Part 3 — Integrating Apple MusicKit JS](https://krisztian-seres.medium.com/building-an-ipod-part-3-integrating-apple-musickit-js-281f050321c0)
- [Angular + MusicKit JS Example Project](https://github.com/svkozak/music-player)
- [Displaying listening data from Apple Music using MusicKit.js](https://www.coryd.dev/posts/2023/displaying-listening-data-from-apple-music-using-musickitjs)

### API Data Structures

- [Exploring MusicKit: Song Structure with Code Snippets](https://exploringmusickit.com/musickit-song)
- [Exploring MusicKit: Search Library Resources](https://exploringmusickit.com/musickit-search-library-resources)

## Risks and Mitigations

### Risk 1: MusicKit JS Global Dependency

**Risk**: MusicKit JS must be loaded from CDN, creates global dependency

**Mitigation**:
- Type declaration file for MusicKit global
- Graceful degradation if MusicKit fails to load
- Error boundary around Apple Music service
- Consider caching strategy for offline support

### Risk 2: Apple Music API Differences

**Risk**: Apple Music doesn't have direct equivalent to Spotify's "top artists"

**Mitigation**:
- Use combination of heavy rotation, recent plays, and library artists
- Document limitations clearly in UI
- Set realistic user expectations
- Provide clear explanation of how Apple Music data differs

### Risk 3: Provider API Changes

**Risk**: External API changes could break integration

**Mitigation**:
- Encapsulate API calls in service layer
- Version API interfaces
- Add comprehensive error logging
- Monitor API deprecation notices
- Create adapter layer for API versions

### Risk 4: Testing Complexity

**Risk**: Multiple providers increase test surface area

**Mitigation**:
- Use shared test utilities for common functionality
- Mock provider APIs consistently
- Create test data factories for each provider
- Prioritize critical path testing
- Use contract testing to verify shared model compatibility

## Conclusion

This architecture provides a robust foundation for integrating multiple music providers while maintaining clean separation of concerns. The factory provider pattern with dependency injection ensures components remain decoupled from specific provider implementations, making the application extensible and maintainable.

**Key Benefits**:
- Components are provider-agnostic
- Easy to add new providers
- Type-safe dependency injection
- Clear separation of concerns
- Testable architecture
- Follows Angular best practices

**Build Order Summary**:
1. Refactor existing code to use abstraction layer (1 week)
2. Set up factory provider pattern (1 week)
3. Integrate Apple Music service (2 weeks)
4. Polish and optimize (1 week)

Total estimated time: 5 weeks
