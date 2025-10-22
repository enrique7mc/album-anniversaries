import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PkceService {
  private readonly CODE_VERIFIER_KEY = 'spotify_code_verifier';

  constructor() {}

  /**
   * Generates a cryptographically random code verifier (43-128 characters)
   * @param length Length of the code verifier (default 128)
   * @returns Random code verifier string
   */
  generateCodeVerifier(length: number = 128): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values)
      .map((x) => possible[x % possible.length])
      .join('');
  }

  /**
   * Generates a code challenge from a code verifier using SHA-256
   * @param codeVerifier The code verifier to hash
   * @returns Promise resolving to the base64url encoded code challenge
   */
  async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(digest);
  }

  /**
   * Base64 URL encodes an ArrayBuffer (without padding as per PKCE spec)
   * @param buffer ArrayBuffer to encode
   * @returns Base64 URL encoded string
   */
  private base64UrlEncode(buffer: ArrayBuffer): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Stores the code verifier in sessionStorage
   * @param codeVerifier The code verifier to store
   */
  storeCodeVerifier(codeVerifier: string): void {
    sessionStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier);
  }

  /**
   * Retrieves the code verifier from sessionStorage
   * @returns The stored code verifier or null if not found
   */
  getCodeVerifier(): string | null {
    return sessionStorage.getItem(this.CODE_VERIFIER_KEY);
  }

  /**
   * Removes the code verifier from sessionStorage
   */
  clearCodeVerifier(): void {
    sessionStorage.removeItem(this.CODE_VERIFIER_KEY);
  }
}
