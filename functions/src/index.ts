import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { SignJWT } from 'jose';
import * as crypto from 'crypto';

// Define secrets - values set via `firebase functions:secrets:set`
const appleTeamId = defineSecret('APPLE_TEAM_ID');
const appleKeyId = defineSecret('APPLE_KEY_ID');
const applePrivateKey = defineSecret('APPLE_PRIVATE_KEY');

// Global cache - persists across function invocations
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Normalize PEM private key format.
 * Firebase secrets can mangle newlines - this ensures proper PEM format.
 */
function normalizePemKey(key: string): string {
  // Replace literal \n strings with actual newlines
  let normalized = key.replace(/\\n/g, '\n');

  // If key is all on one line (no newlines), reconstruct PEM format
  if (!normalized.includes('\n')) {
    // Extract the base64 content between headers
    const match = normalized.match(
      /-----BEGIN PRIVATE KEY-----(.*?)-----END PRIVATE KEY-----/,
    );
    if (match) {
      const base64Content = match[1].trim();
      // Split into 64-character lines (PEM standard)
      const lines = base64Content.match(/.{1,64}/g) || [];
      normalized = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    }
  }

  return normalized;
}

/**
 * Generate Apple Music Developer Token using ES256 JWT signing.
 * Token is valid for 180 days (Apple's maximum).
 */
async function generateToken(
  privateKey: string,
  teamId: string,
  keyId: string,
): Promise<{ token: string; expiresAt: number }> {
  // Normalize PEM format (Firebase secrets can mangle newlines)
  const normalizedKey = normalizePemKey(privateKey);

  // Convert .p8 PEM string to crypto KeyObject
  const keyObject = crypto.createPrivateKey(normalizedKey);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 180 * 24 * 60 * 60; // 180 days in seconds

  // Sign JWT with ONLY required claims (iss, iat, exp)
  // Extra claims (aud, sub) cause Apple API to reject the token
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(keyObject);

  return { token, expiresAt };
}

/**
 * Firebase callable function to get Apple Music Developer Token.
 * Returns cached token if still valid, otherwise generates new one.
 */
export const getAppleMusicToken = onCall(
  {
    secrets: [appleTeamId, appleKeyId, applePrivateKey],
    cors: true,
  },
  async () => {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if valid (with 1 hour buffer before expiry)
    if (cachedToken && cachedToken.expiresAt > now + 3600) {
      return { token: cachedToken.token };
    }

    try {
      const teamId = appleTeamId.value();
      const keyId = appleKeyId.value();
      const privateKey = applePrivateKey.value();

      // Log secret presence (not values) for debugging
      console.log('Secrets check:', {
        hasTeamId: !!teamId,
        hasKeyId: !!keyId,
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey?.length,
        hasNewlines: privateKey?.includes('\n'),
        hasLiteralNewlines: privateKey?.includes('\\n'),
      });

      // Generate new token using secrets
      const result = await generateToken(privateKey, teamId, keyId);

      cachedToken = result;
      return { token: result.token };
    } catch (error) {
      console.error('Error generating Apple Music token:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw new HttpsError('internal', 'Failed to generate developer token');
    }
  },
);
