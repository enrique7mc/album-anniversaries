# Roadmap: Album Anniversaries - Apple Music Integration

**Created:** 2026-02-01
**Depth:** Quick (3-5 phases)
**Requirements:** 9 total v1 requirements

## Milestone 1: Apple Music Integration

### Phase 1: Service Abstraction & UI Foundation
**Goal:** Existing Spotify functionality works through provider-agnostic architecture with dual sign-in UI ready

**Requirements:** ABST-01, ABST-02, UI-01

**Success Criteria:**
1. User sees landing page with two sign-in options (Spotify / Apple Music)
2. All existing functionality works identically after refactoring
3. SpotifyService extends MusicService interface without behavior changes
4. Components inject MUSIC_SERVICE token instead of concrete SpotifyService
5. All 124 existing tests pass with new architecture

**Dependencies:** None (refactoring existing working code)

**Plans:** (created during /gsd:plan-phase)

---

### Phase 2: Backend Infrastructure
**Goal:** Firebase generates valid Apple Music Developer Tokens for MusicKit authentication

**Requirements:** AUTH-02

**Success Criteria:**
1. Firebase Cloud Function generates ES256-signed JWT tokens
2. Developer Token validates successfully via Apple Music API test endpoint
3. Token includes only required claims (iss, iat, exp) with kid in header
4. Environment variables securely store Apple Developer credentials (.p8 key, Team ID, Key ID)

**Dependencies:**
- Apple Developer Program enrollment ($99/year)
- MusicKit credentials (Team ID, Key ID, private key)

**Plans:** (created during /gsd:plan-phase)

---

### Phase 3: Apple Music Integration
**Goal:** Users can authenticate with Apple Music and see identical album anniversary experience

**Requirements:** AUTH-01, AUTH-03, DATA-01, DATA-02, DATA-03

**Success Criteria:**
1. User can authorize Apple Music access via MusicKit popup flow
2. App fetches library artists from Apple Music API
3. App fetches albums for each artist and displays anniversaries
4. Album cards show identical information regardless of provider (Spotify vs Apple Music)
5. User can switch between providers and see provider-specific data
6. Authentication works on both desktop browsers and mobile Safari

**Dependencies:**
- Phase 2 (Backend Infrastructure) complete
- HTTPS localhost setup for development

**Plans:** (created during /gsd:plan-phase)

---

### Phase 4: Production Validation
**Goal:** Apple Music integration works reliably across all target platforms and edge cases

**Requirements:** (Validation phase - no new requirements, validates phases 1-3)

**Success Criteria:**
1. Authentication succeeds on real iPhone/iPad devices
2. App handles Safari Private Browsing and privacy features gracefully
3. App detects missing Apple Music subscription and shows clear messaging
4. Token expiration triggers re-authentication without data loss
5. Provider switching works seamlessly with separate token storage

**Dependencies:**
- Phase 3 (Apple Music Integration) complete
- Real iOS devices for testing

**Plans:** (created during /gsd:plan-phase)

---

## Progress

| Phase | Status | Plans | Requirements |
|-------|--------|-------|--------------|
| 1 - Service Abstraction & UI Foundation | ○ Pending | 0/0 | 3 |
| 2 - Backend Infrastructure | ○ Pending | 0/0 | 1 |
| 3 - Apple Music Integration | ○ Pending | 0/0 | 5 |
| 4 - Production Validation | ○ Pending | 0/0 | 0 (validation) |

**Legend:** ○ Pending | ◐ In Progress | ● Complete

---

## Requirement Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| ABST-01 | 1 | MusicService interface with common contract |
| ABST-02 | 1 | SpotifyService refactored to implement MusicService |
| UI-01 | 1 | Landing page with dual sign-in buttons |
| AUTH-02 | 2 | Firebase Function generates JWT developer tokens |
| AUTH-01 | 3 | MusicKit JS v3 loaded and configured |
| AUTH-03 | 3 | User authorizes Apple Music via MusicKit popup |
| DATA-01 | 3 | Fetch library artists from Apple Music API |
| DATA-02 | 3 | Fetch albums for each artist from catalog |
| DATA-03 | 3 | Map Apple Music responses to shared models |

**Coverage:** 9/9 requirements mapped ✓

---

## Critical Path Notes

**Phase 1 → Phase 2 dependency:** Backend infrastructure cannot be tested until service abstraction validates the architectural approach. Phase 1 de-risks the abstraction pattern with working Spotify code before investing in Apple Developer enrollment.

**Phase 2 → Phase 3 dependency:** MusicKit authentication requires Developer Token from backend. Phase 2 must generate valid JWTs before Phase 3 can proceed.

**Phase 3 → Phase 4 dependency:** Production validation requires complete integration to test. Mobile Safari testing meaningless until authentication and data fetching work on desktop.

**Research flags:**
- Phase 1: LOW (refactoring existing code with established patterns)
- Phase 2: MEDIUM (Firebase Functions environment config, JWT rotation strategies)
- Phase 3: HIGH (15+ identified pitfalls, complex MusicKit integration)
- Phase 4: MEDIUM (mobile authentication fallback strategies unclear)

**Depth rationale:** Quick depth (3-5 phases) achieved by combining architectural prep (Phase 1), isolating backend prerequisite (Phase 2), consolidating Apple Music work (Phase 3), and separating validation (Phase 4). This critical path delivers v1 requirements with minimal phase overhead.

---

*Last updated: 2026-02-01*
