import { Injectable } from '@angular/core';

/**
 * Service to dynamically load MusicKit JS v3 from Apple's CDN.
 *
 * MusicKit JS is not available as an npm package, so it must be loaded
 * dynamically via script injection. This service provides a singleton
 * loading pattern to ensure the script is only loaded once.
 *
 * Usage:
 * ```typescript
 * await this.musicKitLoader.loadMusicKit();
 * const music = await window.MusicKit.configure({ ... });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MusicKitLoaderService {
  private static readonly MUSICKIT_URL =
    'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

  /** Singleton promise for loading MusicKit */
  private loadPromise: Promise<void> | null = null;

  /**
   * Loads MusicKit JS v3 from Apple's CDN.
   *
   * This method is idempotent - calling it multiple times returns the same
   * promise, ensuring the script is only loaded once.
   *
   * @returns Promise that resolves when MusicKit is loaded and ready
   * @throws Error if script fails to load
   */
  loadMusicKit(): Promise<void> {
    // Return existing promise if already loading/loaded (singleton pattern)
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Check if MusicKit is already available (e.g., loaded via script tag)
    if (typeof window !== 'undefined' && window.MusicKit) {
      this.loadPromise = Promise.resolve();
      return this.loadPromise;
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      // Add event listener BEFORE creating script to avoid race condition
      // MusicKit fires this event when fully initialized
      const handleLoaded = (): void => {
        document.removeEventListener('musickitloaded', handleLoaded);
        resolve();
      };
      document.addEventListener('musickitloaded', handleLoaded);

      // Create and configure script element
      const script = document.createElement('script');
      script.src = MusicKitLoaderService.MUSICKIT_URL;
      script.async = true;

      // Handle script load errors
      script.onerror = (): void => {
        document.removeEventListener('musickitloaded', handleLoaded);
        this.loadPromise = null; // Reset to allow retry
        reject(new Error('Failed to load MusicKit JS from Apple CDN'));
      };

      // Append script to document body to start loading
      document.body.appendChild(script);
    });

    return this.loadPromise;
  }
}
