# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 17 application that displays album anniversaries by integrating with the Spotify API. The app shows:
- Albums that had their birthday in the past week (anniversary view)
- Albums released in the past year (recent releases view)

The project uses Angular Material for UI components and Firebase for hosting and cloud functions.

## Development Commands

### Core Development
- `npm start` - Start development server on http://localhost:4200
- `npm run build` - Build the project for production
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
  - OAuth token management
  - Artist and album data fetching
  - Date filtering logic for anniversaries and recent releases
  - Development mode support with limited data

### Data Models
- **Artist** (`src/app/artist.ts`) - Artist data structure
- **Album** (`src/app/album.ts`) - Album data structure with release date info

### Configuration
- **Environment configs** (`src/environments/`) - Different configs for dev/prod including Firebase and Spotify settings
- **App config** (`src/app/app-config.ts`) - Application-specific configuration injection

### Authentication Flow
The app uses Spotify's OAuth 2.0 implicit grant flow:
1. User clicks login button
2. Redirected to Spotify authorization
3. Spotify redirects back with access token in URL hash
4. Token extracted and used for API calls

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

### Build Configuration
- TypeScript compilation with Angular CLI
- SCSS preprocessing
- Asset optimization for production builds
- Firebase hosting deployment pipeline