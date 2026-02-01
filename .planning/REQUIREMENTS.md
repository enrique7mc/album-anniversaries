# Requirements: Album Anniversaries - Apple Music Integration

**Defined:** 2026-01-31
**Core Value:** Users can celebrate album anniversaries for music they actually listen to — regardless of whether they use Spotify or Apple Music.

## v1 Requirements

Requirements for Apple Music integration. Each maps to roadmap phases.

### Service Abstraction

- [ ] **ABST-01**: App defines MusicService interface with common contract (getTopArtists, getAlbumsForArtist, etc.)
- [ ] **ABST-02**: SpotifyService refactored to implement MusicService interface

### Authentication

- [ ] **AUTH-01**: App loads and configures MusicKit JS v3 from Apple CDN
- [ ] **AUTH-02**: Firebase Cloud Function generates signed JWT developer tokens
- [ ] **AUTH-03**: User can authorize Apple Music access via MusicKit popup flow

### Data Fetching

- [ ] **DATA-01**: App fetches library artists from Apple Music API
- [ ] **DATA-02**: App fetches albums for each artist from Apple Music catalog
- [ ] **DATA-03**: Apple Music API responses mapped to shared Artist/Album models

### User Interface

- [ ] **UI-01**: Landing page displays two sign-in buttons (Spotify / Apple Music)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### State Management

- **STATE-01**: Explicit provider selection service tracks active music service
- **STATE-02**: Auth tokens persisted across browser sessions
- **STATE-03**: Service selection remembered for returning users

### Polish

- **POLISH-01**: Graceful handling of users without Apple Music subscription
- **POLISH-02**: Mobile Safari authentication fallback strategies

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| YouTube Music integration | Focus on Spotify + Apple Music first |
| Tidal integration | Focus on Spotify + Apple Music first |
| Simultaneous multi-service | User picks one service per session |
| Server-side token storage | Keep client-side OAuth approach |
| "Top artists" ranking for Apple Music | Not available in Apple Music API — uses library instead |
| HTTPS localhost setup | Assumed developer handles SSL certificate setup |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ABST-01 | TBD | Pending |
| ABST-02 | TBD | Pending |
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| UI-01 | TBD | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9 ⚠️

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
