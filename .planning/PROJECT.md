# Album Anniversaries

## What This Is

A web app that shows users which albums in their music library have anniversaries this week or were recently released. Currently supports Spotify, with Apple Music as a second sign-in option being added. Users sign in with their preferred music service, and the app displays album anniversaries and recent releases from their listening history.

## Core Value

Users can celebrate album anniversaries for music they actually listen to — regardless of whether they use Spotify or Apple Music.

## Requirements

### Validated

- [x] Spotify OAuth PKCE authentication — existing
- [x] Fetch top 50 artists from Spotify API — existing
- [x] Display album anniversaries from past week — existing
- [x] Display album anniversaries from past month — existing
- [x] Display albums released in past year (recent releases) — existing
- [x] Artist cards with expandable album lists — existing
- [x] Album cover display with hover effects — existing
- [x] Responsive layout with scroll-to-top — existing
- [x] Firebase hosting deployment — existing

### Active

- [ ] Landing page with two sign-in options (Spotify / Apple Music)
- [ ] MusicService interface abstraction layer
- [ ] Refactor SpotifyService to implement MusicService interface
- [ ] Apple Music authentication (MusicKit JS)
- [ ] AppleMusicService implementing MusicService interface
- [ ] Fetch top artists from Apple Music (or library fallback)
- [ ] Service selection persisted across sessions
- [ ] Identical anniversary/recent releases experience for both services

### Out of Scope

- YouTube Music integration — focus on Spotify + Apple Music first
- Tidal integration — focus on Spotify + Apple Music first
- Simultaneous multi-service viewing — user picks one service per session
- Server-side token storage — keep client-side OAuth approach

## Context

**Existing Architecture:**
- Angular 17 with TypeScript, Angular Material, Tailwind CSS
- SpotifyService handles all Spotify API calls and data transformation
- PkceService handles OAuth PKCE cryptographic operations
- Artist and Album interfaces define shared data models
- Components (ArtistCard, AlbumListItem) render the data
- Reactive data flow with RxJS BehaviorSubjects

**Apple Music Considerations:**
- Uses MusicKit JS for browser-based authentication
- May have different API structure for "top artists" vs Spotify
- Library-based fallback if listening history not available
- Requires Apple Developer account and MusicKit token

**Architectural Goal:**
- Abstract music service behind interface so components are service-agnostic
- Both SpotifyService and AppleMusicService implement same interface
- Existing Artist/Album models become the shared contract
- Service adapters translate API responses to shared models

## Constraints

- **Tech stack**: Must use existing Angular 17 + TypeScript setup
- **Browser-only**: No backend changes — client-side OAuth for both services
- **API limits**: Apple Music API rate limits need investigation during research
- **MusicKit**: Requires Apple Developer Program membership for production

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Service abstraction via interface | Components shouldn't know which service is active; enables future service additions | — Pending |
| Library fallback for Apple Music | Apple Music may not expose "top artists" like Spotify does | — Pending |
| Client-side auth for both services | Matches existing Spotify approach, no backend required | — Pending |

---
*Last updated: 2026-01-31 after initialization*
