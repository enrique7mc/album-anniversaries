# Phase 2: Backend Infrastructure - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Firebase Cloud Function generates valid Apple Music Developer Tokens for MusicKit authentication. The function signs ES256 JWTs using Apple Developer credentials and returns them to the client. User-specific Music User Tokens are handled client-side in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Token endpoint design
- Public endpoint (no Firebase Auth required) — Developer Tokens aren't user-specific
- Tokens cached on backend — generate once, return cached until near expiry
- Reduces signing operations and latency for subsequent requests

### Token expiry
- Claude's discretion on exact duration
- Should balance security with efficiency (Apple allows up to 6 months)

### Endpoint implementation
- Claude's discretion on HTTP vs Firebase callable approach
- Choose based on research into CORS handling and client integration

### Credentials management
- All Apple credentials stored in Firebase environment config (`firebase functions:config:set`)
- Team ID, Key ID, and .p8 private key all in same config namespace
- Single set of credentials for both dev and production
- Manual rotation when Apple keys expire (infrequent, simple process)

### Claude's Discretion
- HTTP endpoint vs Firebase callable function
- Exact token expiry duration (within security best practices)
- Cache implementation details (memory vs external)
- Response format and error structure

</decisions>

<specifics>
## Specific Ideas

- Keep it simple — this is infrastructure to unblock Phase 3, not a full auth system
- Firebase environment config preferred over more complex Secret Manager setup

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-backend-infrastructure*
*Context gathered: 2026-02-01*
