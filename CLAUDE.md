# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 17 application that displays album anniversaries by integrating with the Spotify API. The app shows:
- Albums that had their birthday in the past week (anniversary view)
- Albums released in the past year (recent releases view)

The project uses Angular Material for UI components and Firebase for hosting and cloud functions.

## Development Commands

### Core Development
- `npm start` - Start development server on http://127.0.0.1:4200 (use 127.0.0.1 instead of localhost for Spotify OAuth compatibility)
- `npm run build` - Build the project for production (uses production configuration with environment.prod.ts)
- `npm test` - Run unit tests via Karma
- `npm run lint` - Run TSLint for code quality checks

### Server/Mock Data
- `npm run server` - Start json-server for mock data (development)
- `npm run server:auth` - Start Node.js auth server
- `npm run server:all` - Run both Angular dev server and json-server concurrently

### Firebase Deployment
- `npm run predeploy` - Build project before deployment
- `npm run deploy` - Deploy to Firebase hosting

## Architecture

### Key Components Structure
- **AppComponent** (`src/app/app.component.ts`) - Main application component handling Spotify OAuth flow and displaying artist/album data
- **ArtistCardComponent** (`src/app/artist-card/`) - Displays individual artist information
- **AlbumListItemComponent** (`src/app/album-list-item/`) - Displays individual album items
- **MaterialModule** (`src/app/material/`) - Centralized Angular Material imports

### Services
- **SpotifyService** (`src/app/spotify.service.ts`) - Handles all Spotify API interactions, includes:
  - Artist and album data fetching
  - Date filtering logic for anniversaries and recent releases
  - Development mode support with limited data
- **PkceService** (`src/app/pkce.service.ts`) - Handles PKCE (Proof Key for Code Exchange) OAuth flow, includes:
  - Code verifier generation (cryptographically random string)
  - Code challenge generation (SHA-256 hash of code verifier)
  - SessionStorage management for OAuth state

### Data Models
- **Artist** (`src/app/artist.ts`) - Artist data structure
- **Album** (`src/app/album.ts`) - Album data structure with release date info

### Configuration
- **Environment configs** (`src/environments/`) - Different configs for dev/prod including Firebase and Spotify settings
- **App config** (`src/app/app-config.ts`) - Application-specific configuration injection

### Authentication Flow
The app uses Spotify's OAuth 2.0 Authorization Code flow with PKCE (Proof Key for Code Exchange):
1. User clicks login button
2. App generates a random `code_verifier` and creates a SHA-256 `code_challenge`
3. Code verifier is stored in sessionStorage
4. User is redirected to Spotify authorization with code challenge
5. Spotify redirects back with authorization code in URL query parameters
6. App exchanges authorization code + code verifier for access token via POST to Spotify's token endpoint
7. Access token is used for Spotify API calls
8. Code verifier is cleared from sessionStorage

**Note**: PKCE is more secure than the deprecated Implicit Grant flow as it doesn't expose tokens in the URL and works safely for client-side applications without requiring a backend server to store secrets.

#### Spotify Developer Dashboard Configuration
The following redirect URIs must be configured in the Spotify Developer Dashboard:
- **Development**: `http://127.0.0.1:4200`
- **Production**: `https://album-anniversaries.firebaseapp.com/`

**Important**: As of November 27, 2025, Spotify deprecated:
- Implicit Grant flow (`response_type=token`)
- HTTP redirect URIs (except for 127.0.0.1)
- Localhost aliases

The app has been migrated to PKCE to comply with these requirements.

### Data Processing Logic
- **Anniversary Detection**: Albums where release date anniversary occurred in past week
- **Recent Releases**: Albums released within the past year
- **Date Filtering**: All filtering happens in `SpotifyService.albumHadBirthdayPastWeek()` and `SpotifyService.albumReleasedPastYear()`

### Development vs Production
- Development mode limits artists to first 10 for faster testing
- Uses local JSON files for mock data when `isDev` is true
- Firebase config differs between environments

### Key Dependencies
- Angular Material 17 for UI components
- Angular Fire for Firebase integration
- RxJS for reactive programming patterns
- SCSS for styling with Material theming

### Testing
- Jasmine/Karma setup for unit tests
- Test files follow `*.spec.ts` naming convention
- Coverage reports generated during test runs

#### OnPush Change Detection Testing Pattern
Components use `ChangeDetectionStrategy.OnPush` which requires special testing considerations:

**Problem**: When testing input changes, modifying `@Input()` properties after component initialization doesn't trigger change detection properly.

**Solution**: Create fresh fixture instances for each test case that needs different input values.

```typescript
// ❌ Problematic pattern - change detection may not work
it('should handle null name', () => {
  component.album = { ...mockAlbum, name: null };
  fixture.detectChanges(); // May not trigger with OnPush
  // Test may fail unexpectedly
});

// ✅ Correct pattern - fresh fixture with OnPush
it('should handle null name', () => {
  const newFixture = TestBed.createComponent(AlbumListItemComponent);
  const newComponent = newFixture.componentInstance;
  newComponent.album = { ...mockAlbum, name: null };
  newFixture.detectChanges(); // Reliable with fresh instance
  // Test works consistently
});
```

**When to use**: Any test that modifies input properties and needs to verify the DOM reflects those changes.

### Build Configuration
- TypeScript compilation with Angular CLI
- SCSS preprocessing
- Asset optimization for production builds
- Firebase hosting deployment pipeline