# Plan 02-02 Summary: Apple Credential Configuration & Token Validation

**Status:** Complete
**Duration:** ~15 min (including troubleshooting)
**Date:** 2026-02-05

## What Was Done

### Task 1: Configure Apple Developer Secrets ✓
- User configured three secrets via `firebase functions:secrets:set`:
  - `APPLE_TEAM_ID`: BLS68A8QS3
  - `APPLE_KEY_ID`: BJJQKRM296
  - `APPLE_PRIVATE_KEY`: Contents of AuthKey_BJJQKRM296.p8

### Task 2: Redeploy Function with Secrets Access ✓
- Function redeployed to pick up new secret versions
- `getAppleMusicToken` shows as active in Firebase

### Task 3: Validate Token Against Apple Music API ✓
- Function generates valid JWT with correct claims:
  ```json
  {"iss":"BLS68A8QS3","iat":1770259847,"exp":1785811847}
  ```
- Apple Music API test endpoint returns HTTP 200

### Task 4: User Confirmation ✓
- User confirmed token endpoint working

## Code Changes

### `functions/src/index.ts`
Added PEM key normalization to handle Firebase secrets formatting:
- `normalizePemKey()` function to fix newlines that get mangled in secrets storage
- Handles literal `\n` strings and reconstructs proper PEM format

## Issues Encountered & Resolved

1. **PEM format corruption**: Firebase secrets can mangle newlines. Added `normalizePemKey()` function to normalize the key format before parsing.

2. **Incorrect redirect operator**: User accidentally used `>` instead of `<` when setting private key, corrupting the .p8 file. User created a new MusicKit key.

3. **Trailing newlines in secrets**: Using `echo` to pipe values adds trailing `\n`. Fixed by using `printf` instead.

4. **Wrong Team ID**: Initially stored as "Team ID: BLBLS68A8QS3" and later "BLBLS68A8QS3" instead of correct "BLS68A8QS3".

## Artifacts

- `getAppleMusicToken` function deployed at: `https://us-central1-album-anniversaries.cloudfunctions.net/getAppleMusicToken`
- Secrets stored in Google Secret Manager (versions: APPLE_TEAM_ID v5, APPLE_KEY_ID v3, APPLE_PRIVATE_KEY v2)

## Verification

```bash
# Test the endpoint
curl -s -X POST \
  "https://us-central1-album-anniversaries.cloudfunctions.net/getAppleMusicToken" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'

# Validate token against Apple Music API
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://api.music.apple.com/v1/test"
# Returns: 200
```

## Phase 2 Complete

All Phase 2 requirements satisfied:
- ✅ AUTH-02: Backend token generation infrastructure ready
- ✅ Developer tokens validate against Apple Music API
- ✅ Token caching with 180-day expiry implemented

Ready for Phase 3: Apple Music Integration (client-side MusicKit JS)
