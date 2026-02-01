# Phase 2: Backend Infrastructure - Research

**Researched:** 2026-02-01
**Domain:** Firebase Cloud Functions, ES256 JWT signing, Apple Music Developer Token generation
**Confidence:** HIGH

## Summary

Firebase Cloud Functions can generate Apple Music Developer Tokens by signing JWTs with the ES256 algorithm using Apple Developer credentials. The standard approach uses either the `jose` or `jsonwebtoken` npm library to create JWTs signed with ECDSA P-256 private keys (.p8 files from Apple). Firebase Functions v2 (2nd gen) provides modern features including better cold start performance, improved TypeScript support, and secure credential management via Google Secret Manager.

For this phase, an HTTP callable function (`onCall`) is recommended over a plain HTTP endpoint (`onRequest`) because it automatically handles CORS when called from the Angular client via the Firebase SDK, includes built-in serialization, and simplifies the integration. Token caching at global scope prevents expensive JWT signing operations on every request, with tokens valid for up to 180 days per Apple's requirements.

**Primary recommendation:** Use Firebase Functions v2 with `onCall` (callable function), `jose` library for ES256 JWT signing, Google Secret Manager for credential storage, and global scope caching for token reuse.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase-functions | ^5.x | Firebase Cloud Functions runtime | Official Firebase SDK, v2 (2nd gen) provides improved performance and modern features |
| jose | ^5.x | ES256 JWT signing | Modern, zero-dependency, ESM-native, supports all runtimes, better security than jsonwebtoken |
| firebase-admin | ^12.x | Firebase Admin SDK | Required for Firebase Functions server-side operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript | ^5.x | Type safety | Firebase Functions v2 targets TypeScript 5 and ES2022 |
| @types/node | ^20.x | Node.js type definitions | Required for TypeScript development with Node.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose | jsonwebtoken | jsonwebtoken is battle-tested but uses CommonJS, lacks modern algorithm support (EdDSA), has callbacks instead of promises, and doesn't work well with ESM bundlers |
| onCall (callable) | onRequest (HTTP) | onRequest gives more control but requires manual CORS setup, manual authentication, and manual serialization - unnecessary complexity for Angular client integration |
| Secret Manager | Environment config (.env) | .env files work for dev but expose secrets in source control if committed, lack versioning/audit logs, and require manual newline escaping for .p8 keys |

**Installation:**
```bash
cd functions
npm install firebase-functions@^5.0.0 firebase-admin@^12.0.0 jose@^5.0.0
npm install --save-dev typescript@^5.0.0 @types/node@^20.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
functions/
├── src/
│   ├── index.ts              # Function exports
│   ├── apple-music/
│   │   ├── token-generator.ts    # JWT signing logic
│   │   └── token-cache.ts        # Token caching at global scope
│   └── types/
│       └── apple-music.types.ts  # TypeScript interfaces
├── .env                      # Local dev environment variables (gitignored)
├── .env.local                # Local overrides (gitignored)
├── package.json
└── tsconfig.json
```

### Pattern 1: ES256 JWT Signing with jose
**What:** Sign Apple Music Developer Token using ES256 (ECDSA P-256) algorithm
**When to use:** Every time a new developer token needs to be generated
**Example:**
```typescript
// Source: https://github.com/panva/jose/discussions/158
import { SignJWT } from 'jose';
import * as crypto from 'crypto';

async function generateAppleMusicToken(
  privateKey: string,
  teamId: string,
  keyId: string
): Promise<string> {
  // Convert .p8 string to crypto KeyObject
  const keyObject = crypto.createPrivateKey(privateKey);

  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + (180 * 24 * 60 * 60)) // 180 days
    .sign(keyObject);

  return token;
}
```

### Pattern 2: Global Scope Token Caching
**What:** Cache generated tokens at module global scope to reuse across invocations
**When to use:** Always - prevents expensive signing operations on every request
**Example:**
```typescript
// Source: https://firebase.google.com/docs/functions/tips
// Global scope - persists across function invocations
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getOrCreateToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 1 hour buffer)
  if (cachedToken && cachedToken.expiresAt > now + 3600) {
    return cachedToken.token;
  }

  // Generate new token
  const token = await generateAppleMusicToken(/* credentials */);
  const expiresAt = now + (180 * 24 * 60 * 60);

  cachedToken = { token, expiresAt };
  return token;
}
```

### Pattern 3: Callable Function (onCall) for Angular Integration
**What:** Use Firebase callable function instead of plain HTTP endpoint
**When to use:** When calling from Firebase-integrated clients (Angular app)
**Example:**
```typescript
// Source: https://firebase.google.com/docs/functions/callable
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const appleTeamId = defineSecret('APPLE_TEAM_ID');
const appleKeyId = defineSecret('APPLE_KEY_ID');
const applePrivateKey = defineSecret('APPLE_PRIVATE_KEY');

export const getAppleMusicToken = onCall(
  { secrets: [appleTeamId, appleKeyId, applePrivateKey] },
  async (request) => {
    try {
      const token = await getOrCreateToken();
      return { token };
    } catch (error) {
      console.error('Error generating Apple Music token:', error);
      throw new HttpsError('internal', 'Failed to generate token');
    }
  }
);
```

### Pattern 4: Secret Manager Configuration (Firebase Functions v2)
**What:** Store Apple credentials securely using Google Secret Manager
**When to use:** Always for production and recommended for development
**Example:**
```bash
# Set secrets using Firebase CLI
firebase functions:secrets:set APPLE_TEAM_ID
# Prompts for value input (hidden)

firebase functions:secrets:set APPLE_KEY_ID
firebase functions:secrets:set APPLE_PRIVATE_KEY
# Paste entire .p8 file content including header/footer
```

```typescript
// Access in function
import { defineSecret } from 'firebase-functions/params';

const applePrivateKey = defineSecret('APPLE_PRIVATE_KEY');

export const myFunction = onCall(
  { secrets: [applePrivateKey] },
  async (request) => {
    const key = applePrivateKey.value(); // Access secret value
    // Use key...
  }
);
```

### Anti-Patterns to Avoid
- **Using jsonwebtoken with callbacks:** jose uses async/await natively and is more modern
- **Signing tokens on every request:** Cache tokens at global scope, they're valid for 180 days
- **Using functions.config():** Deprecated, will fail after March 2027
- **Adding extra JWT claims:** Apple Music Developer Tokens only need `iss`, `iat`, `exp` in payload and `alg`, `kid` in header - extra claims like `aud` or `sub` can cause validation failures
- **Using onRequest for client calls:** Requires manual CORS setup and authentication - use onCall instead
- **Storing .p8 keys in .env and committing:** Secrets belong in Secret Manager, not source control
- **Not handling multiline private keys properly:** .p8 files are PEM format with newlines - Secret Manager handles this, but .env requires `\n` escaping or the key won't parse

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing with ES256 | Custom crypto.sign implementation | `jose` library | Handles key formats, header construction, claim validation, timing attack protection, and works across all runtimes |
| Token caching | Database or external cache | Global scope variable | Firebase Functions instances persist, global variables survive across invocations, zero latency, no external dependencies |
| CORS handling | Custom middleware or headers | `onCall` callable function | Automatically handles CORS preflight, authentication context, serialization, and integrates with Angular Firebase SDK |
| Secret management | Manual .env file rotation | Google Secret Manager via `defineSecret` | Provides encryption, versioning, audit logs, IAM control, and handles multiline secrets without manual escaping |
| Private key parsing | String manipulation for PEM format | `crypto.createPrivateKey()` | Node.js crypto module handles all PEM/DER formats, validates key, and creates proper KeyObject for signing |

**Key insight:** Firebase Functions v2 and modern libraries (jose, Secret Manager) solve the entire token generation workflow. The only custom code needed is business logic (when to cache, how long tokens live). Everything else - signing, key management, CORS, serialization - is handled by established tools.

## Common Pitfalls

### Pitfall 1: Cold Start Latency
**What goes wrong:** Functions that initialize expensive resources (like crypto operations) on every invocation experience high latency, especially on cold starts.
**Why it happens:** Firebase Functions are stateless, but instances persist for some time. Global scope initialization only runs once per instance, but developers often initialize inside the request handler.
**How to avoid:**
- Cache tokens at global scope (module level, outside function handlers)
- Initialize crypto KeyObject once at global scope, not on every request
- For latency-sensitive apps, use minimum instances (costs more but reduces cold starts)
**Warning signs:**
- First request to function is slow (>500ms)
- Token signing happens on every request even when token hasn't expired
- Logs show "Function execution started" frequently

### Pitfall 2: Invalid PEM Format for .p8 Private Keys
**What goes wrong:** "Invalid PEM formatted message" or "Failed to parse private key" errors when using .p8 keys
**Why it happens:** .p8 files contain newlines that get lost when stored as single-line environment variables. Using `\n` in .env requires `.replace(/\\n/g, '\n')` in code. Missing header/footer lines (`-----BEGIN PRIVATE KEY-----`) causes parsing failures.
**How to avoid:**
- Use Google Secret Manager which handles multiline content natively
- For .env files (dev only), include full PEM format with escaped newlines: `APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----"`
- Use `crypto.createPrivateKey()` which validates format and provides helpful error messages
**Warning signs:**
- Error mentions "PEM" or "ASN.1" or "DER"
- Key value in logs shows literal `\n` instead of newlines
- Key is missing header (`-----BEGIN...`) or footer (`-----END...`)

### Pitfall 3: functions.config() Deprecation
**What goes wrong:** Using `firebase functions:config:set` and `functions.config()` which is deprecated and will fail after March 2027
**Why it happens:** Older Firebase tutorials and existing projects use functions.config(), and developers copy patterns without checking for deprecation
**How to avoid:**
- Use `firebase functions:secrets:set` and `defineSecret()` for sensitive data
- Use `defineString()`, `defineInt()`, etc. from `firebase-functions/params` for non-sensitive config
- Migrate existing config before March 2027 deadline
**Warning signs:**
- Seeing `firebase functions:config:set` in documentation or tutorials
- Using `functions.config().apple.teamid` to access values
- Firebase CLI warnings about deprecated config

### Pitfall 4: Extra JWT Claims Breaking Apple Music API
**What goes wrong:** Apple Music API rejects tokens with "401 Unauthorized" or "Invalid token" errors
**Why it happens:** Developers add extra claims like `aud` (audience) or `sub` (subject) thinking it improves security, but Apple Music expects ONLY `iss`, `iat`, `exp` in payload
**How to avoid:**
- Use empty payload object `{}` in SignJWT constructor
- Only set `iss` (Team ID), `iat` (issued at), `exp` (expiration)
- Only set `alg: "ES256"` and `kid` (Key ID) in header
- Test token at Apple's test endpoint: `curl -H "Authorization: Bearer TOKEN" https://api.music.apple.com/v1/test`
**Warning signs:**
- Token validates locally but Apple API returns 401
- Decoded JWT (jwt.io) shows extra claims
- Token works in some API calls but not others

### Pitfall 5: Not Using onCall for Angular Client Integration
**What goes wrong:** Using `onRequest` (plain HTTP endpoint) requires manual CORS configuration, custom error handling, and manual authentication checks
**Why it happens:** Developers think HTTP endpoints are simpler or more flexible
**How to avoid:**
- Use `onCall` (callable function) when calling from Angular app with Firebase SDK
- Let Firebase SDK handle CORS, authentication context, and serialization automatically
- Reserve `onRequest` only for webhooks, server-to-server communication, or non-Firebase clients
- Use `httpsCallable` from `@angular/fire` to call the function
**Warning signs:**
- CORS preflight errors in browser console
- Having to set `Access-Control-Allow-Origin` headers manually
- Writing custom middleware for request parsing
- Using `cors` npm package for simple client calls

### Pitfall 6: Token Expiry Too Short or Too Long
**What goes wrong:** Setting expiry to 1 hour causes unnecessary token regeneration and signing overhead. Setting to 6 months (max) means compromised tokens stay valid longer.
**Why it happens:** Developers either over-optimize for security (short expiry) or under-optimize (max expiry)
**How to avoid:**
- Use 180 days (6 months) as Apple allows - Developer Tokens are not user-specific and rotating them provides minimal security benefit
- Cache tokens until 1 hour before expiry to ensure fresh tokens are always available
- Apple Developer credentials are rotated manually when keys expire (infrequent operation)
**Warning signs:**
- Token generation happens multiple times per day
- Logs show frequent "generating new token" messages
- Token expiry is set to less than 1 week

## Code Examples

Verified patterns from official sources:

### Complete Token Generation Function
```typescript
// Source: Combined from https://github.com/panva/jose/discussions/158
// and https://firebase.google.com/docs/functions/callable
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { SignJWT } from 'jose';
import * as crypto from 'crypto';

// Define secrets
const appleTeamId = defineSecret('APPLE_TEAM_ID');
const appleKeyId = defineSecret('APPLE_KEY_ID');
const applePrivateKey = defineSecret('APPLE_PRIVATE_KEY');

// Global cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function generateToken(
  privateKey: string,
  teamId: string,
  keyId: string
): Promise<{ token: string; expiresAt: number }> {
  const keyObject = crypto.createPrivateKey(privateKey);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (180 * 24 * 60 * 60); // 180 days

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(keyObject);

  return { token, expiresAt };
}

export const getAppleMusicToken = onCall(
  {
    secrets: [appleTeamId, appleKeyId, applePrivateKey],
    cors: true // Allow cross-origin calls
  },
  async (request) => {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if valid (with 1 hour buffer)
    if (cachedToken && cachedToken.expiresAt > now + 3600) {
      return { token: cachedToken.token };
    }

    try {
      // Generate new token
      const result = await generateToken(
        applePrivateKey.value(),
        appleTeamId.value(),
        appleKeyId.value()
      );

      cachedToken = result;
      return { token: result.token };
    } catch (error) {
      console.error('Error generating Apple Music token:', error);
      throw new HttpsError('internal', 'Failed to generate developer token');
    }
  }
);
```

### Angular Client Integration
```typescript
// Source: https://firebase.google.com/docs/functions/callable
import { inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export class AppleMusicService {
  private functions = inject(Functions);

  async getDeveloperToken(): Promise<string> {
    const callable = httpsCallable<void, { token: string }>(
      this.functions,
      'getAppleMusicToken'
    );

    const result = await callable();
    return result.data.token;
  }
}
```

### Local Development with .env
```bash
# functions/.env (gitignored)
APPLE_TEAM_ID=ABC1234567
APPLE_KEY_ID=DEF8901234
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
```

```typescript
// For local development only - production uses Secret Manager
import * as dotenv from 'dotenv';
dotenv.config();

const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| functions.config() | Secret Manager + defineSecret() | March 2027 deprecation | Functions using config() will fail to deploy after deadline |
| jsonwebtoken library | jose library | 2025 ESM adoption | jose is ESM-native, zero dependencies, TypeScript-first, supports modern algorithms |
| 1st gen functions | 2nd gen functions (v2) | Dec 2022 v2 launch | Better cold starts, Secret Manager integration, improved TypeScript support |
| Manual CORS setup | onCall auto-CORS | Always available | Simpler client integration, built-in auth context |
| Node 16 | Node 18 minimum | 2024-2025 | Node 16 dropped from firebase-functions v5+ |
| TypeScript 3 | TypeScript 5 | 2024-2025 | Targets ES2022, better type safety |

**Deprecated/outdated:**
- `functions.config()`: Will fail after March 2027. Use `defineSecret()` or `defineString()` from params module
- `firebase-functions` < v4.3.0: Missing 2nd gen features. Use v5.x for latest
- `jsonwebtoken`: Still works but lacks ESM support, modern algorithms, and async/await patterns. Use `jose` for new projects
- 1st gen functions import from root: Use `firebase-functions/v2/*` imports for 2nd gen

## Open Questions

Things that couldn't be fully resolved:

1. **Minimum Instances for Cold Start Prevention**
   - What we know: Setting `minInstances` keeps functions warm and reduces cold start latency
   - What's unclear: Cost implications for this project (likely minimal for a single function)
   - Recommendation: Start without `minInstances`, add if latency becomes an issue. Monitor Firebase Functions logs for cold start frequency

2. **Function Region Configuration**
   - What we know: Callable functions support region specification, should align with Angular app hosting region for lower latency
   - What's unclear: Current Firebase Hosting region for this project
   - Recommendation: Default region (us-central1) is fine. Optimize later if users report latency issues

3. **Token Validation Testing Strategy**
   - What we know: Apple provides test endpoint `https://api.music.apple.com/v1/test` for token validation
   - What's unclear: Whether to include automated tests that call Apple's API or just manual verification
   - Recommendation: Manual verification during development is sufficient. Apple's API is the source of truth - if test endpoint returns 200, token is valid

## Sources

### Primary (HIGH confidence)
- [Firebase Functions Configure Environment](https://firebase.google.com/docs/functions/config-env) - Last updated 2026-01-29
- [Firebase Functions Tips & Tricks](https://firebase.google.com/docs/functions/tips) - Last updated 2026-01-29
- [Firebase Callable Functions](https://firebase.google.com/docs/functions/callable) - Last updated 2026-01-29
- [jose npm package](https://www.npmjs.com/package/jose) - Official documentation
- [Apple Music API Developer Token Requirements](https://developer.apple.com/forums/thread/130168) - Apple Developer Forums
- [jose GitHub Discussion #158](https://github.com/panva/jose/discussions/158) - Apple Music JWT example

### Secondary (MEDIUM confidence)
- [Jose vs Jsonwebtoken - Why you should switch?](https://joodi.medium.com/jose-vs-jsonwebtoken-why-you-should-switch-4f50dfa3554c) - Library comparison from 2025
- [Why You Should Delete jsonwebtoken in 2025](https://dev.to/silentwatcher_95/why-you-should-delete-jsonwebtoken-in-2025-1o7n) - ESM and modern development considerations
- [Firebase Functions Callable vs HTTP](https://jorgevergara.co/blog/firebase-function-http-vs-callable/) - Detailed comparison
- [How to Secure API Keys with 2nd-Gen Cloud Functions](https://codewithandrea.com/articles/api-keys-2ndgen-cloud-functions-firebase/) - Secret Manager guide
- [Formatting Firebase PEM key environment variables](https://medium.com/@brianpkennedy/formatting-firebase-pem-key-environment-variables-for-travis-and-heroku-3caa509e992e) - Multiline key handling

### Tertiary (LOW confidence)
- WebSearch results for Apple Music token expiry best practices - Community discussions show 180 days is common but optimal duration varies by use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jose, firebase-functions v2, Secret Manager are industry standard, verified from official docs updated Jan 2026
- Architecture: HIGH - Patterns verified from official Firebase and jose documentation, tested by community
- Pitfalls: MEDIUM-HIGH - Derived from GitHub issues, Stack Overflow, and developer forum discussions. functions.config() deprecation is HIGH (official Firebase notice)

**Research date:** 2026-02-01
**Valid until:** ~2026-03-01 (30 days - stable domain, but firebase-functions releases happen monthly)
