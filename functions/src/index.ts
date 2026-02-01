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
 * Generate Apple Music Developer Token using ES256 JWT signing.
 * Token is valid for 180 days (Apple's maximum).
 */
async function generateToken(
  privateKey: string,
  teamId: string,
  keyId: string,
): Promise<{ token: string; expiresAt: number }> {
  // Convert .p8 PEM string to crypto KeyObject
  const keyObject = crypto.createPrivateKey(privateKey);
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
      // Generate new token using secrets
      const result = await generateToken(
        applePrivateKey.value(),
        appleTeamId.value(),
        appleKeyId.value(),
      );

      cachedToken = result;
      return { token: result.token };
    } catch (error) {
      console.error('Error generating Apple Music token:', error);
      throw new HttpsError('internal', 'Failed to generate developer token');
    }
  },
);
