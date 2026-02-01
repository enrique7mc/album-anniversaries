# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
album-anniversaries/
├── src/                        # Application source code
│   ├── app/                    # Angular application root
│   │   ├── artist-card/        # Artist display component
│   │   ├── album-list-item/    # Album card component with interactions
│   │   ├── app.component.*     # Root component (HTML, SCSS, TS, spec)
│   │   ├── app.module.ts       # Angular module declaration
│   │   ├── app-config.ts       # Application configuration injection token
│   │   ├── artist.ts           # Artist domain model interface
│   │   ├── album.ts            # Album domain model interface
│   │   ├── image.ts            # Image domain model interface
│   │   ├── constants.ts        # Static constants (Spotify config, storage keys)
│   │   ├── spotify.service.ts  # Spotify API service
│   │   ├── spotify.service.spec.ts
│   │   ├── pkce.service.ts     # PKCE cryptography service
│   │   ├── pkce.service.spec.ts
│   │   └── gsap.service.ts     # GSAP animation service
│   ├── environments/           # Environment-specific configuration
│   │   ├── environment.ts      # Development environment config
│   │   └── environment.prod.ts # Production environment config
│   ├── assets/                 # Static assets
│   │   ├── albums.json         # Mock album data for development
│   │   ├── artists.json        # Mock artist data for development
│   │   └── [other assets]
│   ├── main.ts                 # Application bootstrap entry point
│   ├── polyfills.ts            # Browser compatibility polyfills
│   ├── test.ts                 # Test environment configuration
│   ├── tsconfig.app.json       # TypeScript config for application
│   └── tsconfig.spec.json      # TypeScript config for tests
├── angular.json                # Angular CLI configuration
├── tsconfig.json               # Root TypeScript configuration
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
├── .prettierrc                 # Code formatter configuration
├── karma.conf.js               # Karma test runner configuration
├── firebase.json               # Firebase deployment configuration
├── .firebaserc                 # Firebase project configuration
└── .env                        # (Git-ignored) Environment variables
```

## Directory Purposes

**src/app:**
- Purpose: Core Angular application code
- Contains: Components, services, models, configuration
- Key files: `app.component.ts` (root), `app.module.ts` (bootstrap), `spotify.service.ts` (data)

**src/app/artist-card:**
- Purpose: Presentational component for displaying artist information
- Contains: Artist card component files (TypeScript, HTML, SCSS, tests)
- Key files: `artist-card.component.ts` (dumb component with OnPush), `artist-card.component.spec.ts` (25+ tests)

**src/app/album-list-item:**
- Purpose: Presentational component for album grid items with interactions
- Contains: Album card component with 3D tilt effects and overlay
- Key files: `album-list-item.component.ts` (handles mouse events, GSAP animations), `album-list-item.component.spec.ts` (37 tests)

**src/environments:**
- Purpose: Environment-specific configuration values
- Contains: Firebase config, Spotify OAuth settings, feature flags
- Key files: `environment.ts` (dev), `environment.prod.ts` (production)
- Environment.ts has isDev flag that loads mock data instead of real Spotify API

**src/assets:**
- Purpose: Static assets and mock data
- Contains: JSON files for development testing
- Key files: `artists.json` (mock artist list), `albums.json` (mock album list)

## Key File Locations

**Entry Points:**
- `src/main.ts`: Bootstraps the Angular application and AppModule
- `src/app/app.component.ts`: Root component that orchestrates authentication, data loading, and layout
- `src/app/app.module.ts`: Declares components and imports required modules

**Configuration:**
- `src/app/app-config.ts`: Defines AppConfig interface and SPOTIFY_APP_CONFIG injection token
- `src/environments/environment.ts`: Development config (Firebase, Spotify redirectUrl, isDev flag)
- `src/environments/environment.prod.ts`: Production config
- `src/app/constants.ts`: Static constants (Spotify client_id, scopes, storage keys, URLs)
- `angular.json`: Angular CLI build configuration, asset definitions, deployment settings
- `tailwind.config.js`: Tailwind CSS theme and custom utilities

**Core Logic:**
- `src/app/spotify.service.ts`: Spotify API integration and data filtering (290 lines)
- `src/app/pkce.service.ts`: PKCE cryptography for OAuth (75 lines)
- `src/app/gsap.service.ts`: Animation management (127 lines)

**Domain Models:**
- `src/app/artist.ts`: Artist interface with id, name, images, albums
- `src/app/album.ts`: Album interface with id, name, release_date, images
- `src/app/image.ts`: Image interface with url, height, width

**Components:**
- `src/app/app.component.ts`: Root smart component (542 lines, handles auth, data, UI state)
- `src/app/artist-card/artist-card.component.ts`: Dumb presentation component (26 lines)
- `src/app/album-list-item/album-list-item.component.ts`: Interactive presentation component (121 lines)

**Testing:**
- `src/app/app.component.spec.ts`: Root component tests
- `src/app/spotify.service.spec.ts`: Spotify service tests with date filtering coverage
- `src/app/pkce.service.spec.ts`: PKCE service tests (18 tests, 100% coverage)
- `src/app/artist-card/artist-card.component.spec.ts`: Artist card tests (25 tests)
- `src/app/album-list-item/album-list-item.component.spec.ts`: Album list tests (37 tests)
- `src/test.ts`: Karma test environment setup

**TypeScript Configuration:**
- `tsconfig.json`: Root TypeScript settings
- `src/tsconfig.app.json`: Application TypeScript settings (extends root)
- `src/tsconfig.spec.json`: Test TypeScript settings (includes *.spec.ts files)

## Naming Conventions

**Files:**
- Component files: `{component-name}.component.ts`, `{component-name}.component.html`, `{component-name}.component.scss`
- Service files: `{service-name}.service.ts`, `{service-name}.service.spec.ts`
- Model files: Singular noun in lowercase (artist.ts, album.ts, image.ts)
- Example: `artist-card/artist-card.component.ts`, `spotify.service.ts`

**Directories:**
- Feature/component directories: kebab-case with plural form (artist-card/, album-list-item/)
- Flat services and models at app root level (not in subdirectories)
- Example: `src/app/artist-card/`, not `src/app/components/artist-card/`

**Components:**
- Class names: PascalCase + 'Component' suffix (AppComponent, ArtistCardComponent, AlbumListItemComponent)
- Selectors: kebab-case with 'app-' prefix (app-root, app-artist-card, app-album-list-item)
- Example: selector 'app-artist-card' for class ArtistCardComponent

**Services:**
- Class names: PascalCase + 'Service' suffix (SpotifyService, PkceService, GsapService)
- Providers: 'providedIn: root' for singletons
- Example: @Injectable({ providedIn: 'root' })

**Models/Interfaces:**
- Names: PascalCase, singular noun (Artist, Album, Image)
- Spotify API responses: 'Spotify' prefix (SpotifyArtistResponse, SpotifyAlbumResponse)
- Internal models: No prefix (Artist, Album)
- Example: interface Artist {}, interface SpotifyArtistResponse {}

**Constants:**
- Names: CONSTANT_CASE for constants (MILLISECONDS_IN_WEEK, DEV_ARTIST_LIMIT)
- Storage keys: lowercase snake_case (spotify_auth_state, spotify_access_token)
- Example: const MILLISECONDS_IN_WEEK = 604800000;

## Where to Add New Code

**New Feature (e.g., Artist Search):**
- Primary code: `src/app/` or new directory like `src/app/artist-search/`
- Service: `src/app/artist-search.service.ts` (inject into AppComponent or new container component)
- Component: `src/app/artist-search/artist-search.component.ts` if it's a feature container
- Tests: Parallel spec file (`*.service.spec.ts` or `*.component.spec.ts`)
- Model updates: Add to `src/app/artist.ts` or create new model file

**New Component (e.g., Album Details Modal):**
- Implementation: `src/app/album-details/album-details.component.ts` (kebab-case directory)
- Template: `src/app/album-details/album-details.component.html`
- Styles: `src/app/album-details/album-details.component.scss`
- Tests: `src/app/album-details/album-details.component.spec.ts`
- Declaration: Add to `src/app/app.module.ts` declarations array
- Pattern: Use ChangeDetectionStrategy.OnPush for performance

**Utilities/Helpers:**
- Shared helpers: Create `src/app/utils/` directory if more than one helper file
- Single utility: Place at app root (e.g., `src/app/date-helpers.ts`)
- Example: `src/app/date-helpers.ts` for date calculation utilities
- Export from file and import where needed

**Shared Services:**
- Location: `src/app/{service-name}.service.ts` at root level
- Pattern: @Injectable({ providedIn: 'root' }) for dependency injection
- Responsibility: One concern per service (follow single responsibility principle)
- Examples: SpotifyService (API), PkceService (crypto), GsapService (animations)

**Configuration/Constants:**
- Application-wide constants: `src/app/constants.ts`
- Feature-specific constants: Co-locate with feature (top of service or component file)
- Environment config: `src/environments/environment.ts` and `environment.prod.ts`
- Injection tokens: `src/app/app-config.ts` alongside configuration

## Special Directories

**src/environments:**
- Purpose: Environment-specific configuration
- Generated: No (hand-maintained)
- Committed: Yes (but secrets are .env-substituted in CI/CD)
- Replaced during build via angular.json fileReplacements

**src/assets:**
- Purpose: Static files (mock data, images, icons)
- Generated: No
- Committed: Yes
- Mock data (albums.json, artists.json) used only when isDev=true

**coverage/:**
- Purpose: Code coverage reports (generated after test runs)
- Generated: Yes (via Karma test runner)
- Committed: No (.gitignored)
- View: `coverage/index.html` for interactive coverage report

**dist/:**
- Purpose: Compiled production build output
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignored)
- Build command: `ng build --configuration production`

**.angular/cache:**
- Purpose: Angular CLI build cache
- Generated: Yes (automatically by Angular CLI)
- Committed: No (.gitignored)
- Speeds up incremental builds

**node_modules/:**
- Purpose: External dependencies
- Generated: Yes (via npm install)
- Committed: No (.gitignored)
- Lock file: package-lock.json (committed for reproducible installs)

---

*Structure analysis: 2026-01-31*
