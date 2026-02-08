import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Artist } from '../artist';
import { Album } from '../album';
import { Image } from '../image';
import { MusicService } from './music-service.interface';
import { MusicKitLoaderService } from './musickit-loader.service';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

// Constants
const STORAGE_KEY_TOKEN = 'apple_music_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'apple_music_token_expiry';
const TOKEN_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
const RATE_LIMIT_BATCH_SIZE = 5; // Parallel requests per batch (safe with bounded N)
const RATE_LIMIT_DELAY_MS = 300; // 300ms between batches
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // Start with 1s, exponential backoff
const API_LIMIT = 100;
const MIN_ARTISTS_THRESHOLD = 10; // Minimum recently played artists before fallback
const LIBRARY_ARTIST_CAP = environment.maxArtists || 50; // Cap for library fallback
const RECENTLY_PLAYED_LIMIT = 30; // Max items from recently played endpoint
const STOREFRONT = 'us';

// Image sizes for artwork conversion
const IMAGE_SIZES = [
  { width: 640, height: 640 },
  { width: 300, height: 300 },
  { width: 64, height: 64 },
];

/**
 * Apple Music API response interfaces
 */
interface AppleMusicArtistAttributes {
  name: string;
  url?: string;
  artwork?: AppleMusicArtwork;
}

interface AppleMusicAlbumAttributes {
  name: string;
  releaseDate?: string;
  url?: string;
  artwork?: AppleMusicArtwork;
}

interface AppleMusicArtwork {
  url: string;
  width?: number;
  height?: number;
}

interface AppleMusicResource<T> {
  id: string;
  type: string;
  href?: string;
  attributes?: T;
  relationships?: {
    catalog?: {
      data?: Array<{ id: string; type: string }>;
    };
    artists?: {
      data?: Array<{
        id: string;
        type: string;
        attributes?: AppleMusicArtistAttributes;
      }>;
    };
  };
}

interface AppleMusicResponse<T> {
  data?: AppleMusicResource<T>[];
  next?: string;
}

/**
 * Lightweight carrier for artist info from both recently-played and library paths.
 * Uses catalog IDs (not library r.xxxxx IDs) so album fetching works directly.
 */
interface NormalizedArtist {
  catalogId: string;
  name: string;
  artwork?: AppleMusicArtwork;
  url?: string;
}

interface DeveloperTokenResponse {
  token: string;
}

/**
 * Apple Music service implementing MusicService interface.
 *
 * Provides Apple Music integration via MusicKit JS v3:
 * - Developer token fetching from Firebase Functions
 * - User authorization via MusicKit popup
 * - Library artist and album fetching
 * - Response mapping to shared Artist/Album models
 *
 * NOTE: Not provided in root - use MUSIC_SERVICE token with factory provider.
 */
@Injectable()
export class AppleMusicService implements MusicService {
  private musicKitInstance: MusicKitInstance | null = null;
  private artistsSubject = new BehaviorSubject<Artist[]>([]);
  private initialized = false;

  /**
   * Observable of artists with their albums.
   * Emits updated artist list as data loads progressively.
   */
  readonly artists: Observable<Artist[]> = this.artistsSubject.asObservable();

  constructor(
    private musicKitLoader: MusicKitLoaderService,
    private functions: Functions,
    private notificationService: NotificationService,
  ) {}

  /**
   * Initializes MusicKit with developer token from Firebase.
   *
   * Steps:
   * 1. Load MusicKit JS from Apple CDN
   * 2. Fetch developer token from Firebase Function
   * 3. Configure MusicKit instance
   *
   * @throws Error if MusicKit fails to load or configure
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load MusicKit JS
    await this.musicKitLoader.loadMusicKit();

    // Fetch developer token from Firebase
    const getToken = httpsCallable<object, DeveloperTokenResponse>(
      this.functions,
      'getAppleMusicToken',
    );
    const result = await getToken({});

    // Configure MusicKit
    if (!window.MusicKit) {
      throw new Error('MusicKit not available after loading');
    }

    this.musicKitInstance = await window.MusicKit.configure({
      developerToken: result.data.token,
      app: {
        name: 'Album Anniversaries',
        build: '1.0.0',
      },
    });

    this.initialized = true;
  }

  /**
   * Authorizes user with Apple Music via MusicKit popup.
   *
   * @returns Music User Token for authenticated API calls
   * @throws Error if service not initialized
   */
  async authorize(): Promise<string> {
    if (!this.initialized || !this.musicKitInstance) {
      throw new Error(
        'AppleMusicService not initialized. Call initialize() first.',
      );
    }

    try {
      // Authorize user via MusicKit popup
      const musicUserToken = await this.musicKitInstance.authorize();

      // Store token with 6-month expiry in sessionStorage
      const expiry = Date.now() + TOKEN_EXPIRY_MS;
      sessionStorage.setItem(STORAGE_KEY_TOKEN, musicUserToken);
      sessionStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiry.toString());

      this.notificationService.showSuccess('Signed in to Apple Music');

      return musicUserToken;
    } catch (error) {
      this.handleAuthorizationError(error);
      throw error;
    }
  }

  /**
   * Loads artists and their albums from Apple Music API.
   *
   * @param accessToken - Music User Token (optional if already authorized)
   * @returns Observable that emits true when complete, false on error
   */
  loadArtistsWithAlbums(accessToken: string): Observable<boolean> {
    if (!this.initialized || !this.musicKitInstance) {
      console.error(
        '[AppleMusicService] Not initialized. Call initialize() first.',
      );
      return of(false);
    }

    // Check if token is expired
    if (this.isTokenExpired()) {
      this.notificationService.showWarning(
        'Session expired. Please sign in again.',
      );
      this.clearStoredToken();
      return of(false);
    }

    return from(this.fetchArtists()).pipe(
      switchMap((normalizedArtists) =>
        this.fetchAlbumsForAllArtists(normalizedArtists),
      ),
      map((artists) => {
        this.artistsSubject.next(artists);
        return true;
      }),
      catchError((error) => {
        this.handleError(error, 'loading library');
        return of(false);
      }),
    );
  }

  /**
   * Orchestrates artist fetching: tries recently played first, falls back to library.
   *
   * Strategy:
   * 1. Fetch recently played items → extract unique artists (catalog IDs)
   * 2. If enough artists (>= MIN_ARTISTS_THRESHOLD), use them
   * 3. Otherwise, fall back to library artists (capped at LIBRARY_ARTIST_CAP)
   */
  private async fetchArtists(): Promise<NormalizedArtist[]> {
    const recentArtists = await this.fetchRecentlyPlayedArtists();

    if (recentArtists.length >= MIN_ARTISTS_THRESHOLD) {
      return recentArtists;
    }

    console.log(
      `[AppleMusicService] Recently played yielded ${recentArtists.length} artists (< ${MIN_ARTISTS_THRESHOLD}), falling back to library`,
    );

    const libraryArtists = await this.fetchLibraryArtists(LIBRARY_ARTIST_CAP);
    return libraryArtists.map((artist) => {
      const catalogId = this.getCatalogArtistId(artist);
      return {
        catalogId: catalogId || artist.id,
        name: artist.attributes?.name || 'Unknown Artist',
        artwork: artist.attributes?.artwork,
        url: artist.attributes?.url,
      };
    });
  }

  /**
   * Fetches recently played items and extracts unique artists.
   * Uses the /v1/me/recent/played endpoint which returns songs, albums, stations, etc.
   * Extracts artist info from song/album relationships (catalog IDs).
   *
   * @returns Deduplicated array of NormalizedArtist from recently played items
   */
  private async fetchRecentlyPlayedArtists(): Promise<NormalizedArtist[]> {
    if (!this.musicKitInstance) {
      return [];
    }

    try {
      const rawResponse = await this.musicKitInstance.api.music(
        `/v1/me/recent/played?limit=${RECENTLY_PLAYED_LIMIT}`,
      );

      const response = this.unwrapResponse<any>(rawResponse);

      if (!response?.data || !Array.isArray(response.data)) {
        return [];
      }

      const artistMap = new Map<string, NormalizedArtist>();

      for (const resource of response.data) {
        const artists = this.extractArtistsFromResource(resource);
        for (const artist of artists) {
          if (!artistMap.has(artist.catalogId)) {
            artistMap.set(artist.catalogId, artist);
          }
        }
      }

      return Array.from(artistMap.values());
    } catch (error) {
      console.warn(
        '[AppleMusicService] Failed to fetch recently played, will fall back to library:',
        error,
      );
      return [];
    }
  }

  /**
   * Extracts artist info from a recently played resource.
   * Songs and albums have artist relationships; stations and playlists do not.
   */
  private extractArtistsFromResource(
    resource: AppleMusicResource<any>,
  ): NormalizedArtist[] {
    const type = resource.type;

    // Only songs and albums have artist relationships
    if (type !== 'songs' && type !== 'albums') {
      return [];
    }

    const artistsData = resource.relationships?.artists?.data;
    if (!artistsData || !Array.isArray(artistsData)) {
      return [];
    }

    return artistsData
      .filter((a) => a.id)
      .map((a) => ({
        catalogId: a.id,
        name: a.attributes?.name || 'Unknown Artist',
        artwork: a.attributes?.artwork,
        url: a.attributes?.url,
      }));
  }

  /**
   * Fetches library artists from Apple Music with their catalog relationships.
   * Handles pagination via 'next' property.
   *
   * NOTE: Library artist IDs (r.xxxxx) differ from catalog IDs.
   * We request the 'catalog' relationship to get the catalog artist ID for album fetching.
   *
   * @param maxArtists - Maximum number of artists to fetch
   */
  private async fetchLibraryArtists(
    maxArtists: number,
  ): Promise<AppleMusicResource<AppleMusicArtistAttributes>[]> {
    if (!this.musicKitInstance) {
      return [];
    }

    const allArtists: AppleMusicResource<AppleMusicArtistAttributes>[] = [];
    // Include catalog relationship to get catalog artist IDs
    let nextUrl: string | undefined =
      `/v1/me/library/artists?limit=${Math.min(API_LIMIT, maxArtists)}&include=catalog`;

    while (nextUrl && allArtists.length < maxArtists) {
      const rawResponse = await this.musicKitInstance.api.music(nextUrl);

      // MusicKit v3 may wrap the response in a 'data' property
      // Handle both { data: [...], next: "..." } and { data: { data: [...], next: "..." } }
      const response: AppleMusicResponse<AppleMusicArtistAttributes> =
        this.unwrapResponse(rawResponse);

      if (response?.data && Array.isArray(response.data)) {
        allArtists.push(...response.data);
      }

      // Stop if we've reached the cap
      if (allArtists.length >= maxArtists) {
        break;
      }

      nextUrl = response?.next;
    }

    // Trim to maxArtists if we fetched more
    return allArtists.slice(0, maxArtists);
  }

  /**
   * Fetches albums for all normalized artists with rate limiting.
   * Batches requests to avoid throttling.
   * Uses catalog artist ID directly from NormalizedArtist.
   */
  private async fetchAlbumsForAllArtists(
    normalizedArtists: NormalizedArtist[],
  ): Promise<Artist[]> {
    const artists: Artist[] = [];

    // Process artists in batches
    for (let i = 0; i < normalizedArtists.length; i += RATE_LIMIT_BATCH_SIZE) {
      const batch = normalizedArtists.slice(i, i + RATE_LIMIT_BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (normalizedArtist) => {
          const albums = await this.fetchAlbumsForArtist(
            normalizedArtist.catalogId,
          );

          const artist = this.mapNormalizedToArtist(normalizedArtist);
          artist.albums = albums.map((album) =>
            this.mapToAlbum(album, normalizedArtist.catalogId),
          );
          return artist;
        }),
      );

      artists.push(...batchResults);

      // Add delay between batches (except for last batch)
      if (i + RATE_LIMIT_BATCH_SIZE < normalizedArtists.length) {
        await this.delay(RATE_LIMIT_DELAY_MS);
      }
    }

    return artists;
  }

  /**
   * Extracts catalog artist ID from library artist relationships.
   * Returns null if no catalog relationship exists.
   */
  private getCatalogArtistId(
    libraryArtist: AppleMusicResource<AppleMusicArtistAttributes>,
  ): string | null {
    const catalogData = libraryArtist.relationships?.catalog?.data;
    if (catalogData && catalogData.length > 0) {
      return catalogData[0].id;
    }
    return null;
  }

  /**
   * Fetches albums for a specific artist from the catalog.
   * Includes retry logic with exponential backoff for rate limit errors.
   */
  private async fetchAlbumsForArtist(
    artistId: string,
  ): Promise<AppleMusicResource<AppleMusicAlbumAttributes>[]> {
    if (!this.musicKitInstance) {
      return [];
    }

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const rawResponse = await this.musicKitInstance.api.music(
          `/v1/catalog/${STOREFRONT}/artists/${artistId}/albums?limit=${API_LIMIT}`,
        );

        // MusicKit v3 may wrap the response in a 'data' property
        const response: AppleMusicResponse<AppleMusicAlbumAttributes> =
          this.unwrapResponse(rawResponse);

        return Array.isArray(response?.data) ? response.data : [];
      } catch (error) {
        lastError = error;

        // 404 "No related resources" is expected - artist has no albums in catalog
        if (this.isNotFoundError(error)) {
          return [];
        }

        // Check if it's a rate limit error (429)
        if (this.isRateLimitError(error)) {
          const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt); // 1s, 2s, 4s
          console.warn(
            `[AppleMusicService] Rate limited for artist ${artistId}, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await this.delay(backoffDelay);
          continue;
        }

        // For non-rate-limit errors, don't retry
        break;
      }
    }

    // Log error only if we exhausted retries or hit a non-recoverable error
    console.error(
      `[AppleMusicService] Error fetching albums for artist ${artistId}:`,
      lastError,
    );
    return [];
  }

  /**
   * Checks if an error is a "not found" (404) error.
   * This is expected when an artist has no albums in the catalog.
   */
  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as Record<string, unknown>;

    // Check direct status
    if (err.status === 404 || err.errorCode === 404) {
      return true;
    }

    // Check nested errors array (Apple Music API format)
    if (Array.isArray(err.errors)) {
      return err.errors.some(
        (e: Record<string, unknown>) =>
          e.status === '404' || e.code === '40403',
      );
    }

    return false;
  }

  /**
   * Checks if an error is a rate limit (429) error.
   */
  private isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as Record<string, unknown>;

    // Check direct status
    if (err.status === 429 || err.errorCode === 429) {
      return true;
    }

    // Check nested errors array (Apple Music API format)
    if (Array.isArray(err.errors)) {
      return err.errors.some(
        (e: Record<string, unknown>) => e.status === '429',
      );
    }

    return typeof err.message === 'string' && err.message.includes('429');
  }

  /**
   * Maps a NormalizedArtist to the shared Artist model.
   */
  private mapNormalizedToArtist(normalized: NormalizedArtist): Artist {
    return {
      id: normalized.catalogId,
      name: normalized.name,
      href: '',
      popularity: 0,
      images: this.mapArtwork(normalized.artwork),
      external_url: normalized.url || '',
      albums: [],
    };
  }

  /**
   * Maps Apple Music artist resource to Artist model.
   */
  private mapToArtist(
    resource: AppleMusicResource<AppleMusicArtistAttributes>,
  ): Artist {
    const attributes = resource.attributes;

    return {
      id: resource.id,
      name: attributes?.name || 'Unknown Artist',
      href: resource.href || '',
      popularity: 0, // Apple Music doesn't provide popularity
      images: this.mapArtwork(attributes?.artwork),
      external_url: attributes?.url || '',
      albums: [],
    };
  }

  /**
   * Maps Apple Music artwork to Image array.
   * Generates multiple sizes from Apple's template URL.
   */
  private mapArtwork(artwork: AppleMusicArtwork | undefined): Image[] {
    if (!artwork || !artwork.url) {
      return [];
    }

    // Apple Music artwork URLs use {w}x{h} placeholder pattern
    return IMAGE_SIZES.map((size) => ({
      width: size.width,
      height: size.height,
      url: artwork.url
        .replace('{w}', size.width.toString())
        .replace('{h}', size.height.toString()),
    }));
  }

  /**
   * Maps Apple Music album resource to Album model.
   */
  private mapToAlbum(
    resource: AppleMusicResource<AppleMusicAlbumAttributes>,
    artistId: string,
  ): Album {
    const attributes = resource.attributes;

    return {
      id: resource.id,
      artist_id: artistId,
      name: attributes?.name || 'Unknown Album',
      release_date: attributes?.releaseDate || '',
      release_date_precision: 'day', // Apple always provides day precision
      images: this.mapArtwork(attributes?.artwork),
      external_url: attributes?.url || '',
    };
  }

  /**
   * Handles errors from Apple Music API with user-friendly messages.
   *
   * @param error - The error object from API
   * @param context - Context description for error message
   */
  private handleError(error: any, context: string): void {
    const err = error as Record<string, unknown>;
    let message: string;

    // Check for specific error codes
    if (err.errorCode === 'NO_SUBSCRIPTION' || err.status === 403) {
      message = 'Apple Music subscription required to view your library.';
    } else if (
      err.errorCode === 'TOKEN_EXPIRED' ||
      err.status === 401 ||
      this.isTokenExpired()
    ) {
      message = 'Session expired. Please sign in again.';
      this.clearStoredToken();
    } else if (err.status === 429 || this.isRateLimitError(error)) {
      message = 'Too many requests. Please wait a moment and try again.';
    } else if (!navigator.onLine) {
      message = 'No internet connection. Please check your network.';
    } else if (
      typeof err.message === 'string' &&
      err.message.includes('musickitloaded')
    ) {
      message = 'Failed to load Apple Music. Please refresh the page.';
    } else if (err.errorCode === 'POPUP_BLOCKED') {
      message =
        'Popup blocked. Please allow popups for this site and try again.';
    } else {
      message = `Failed ${context}. Please try again later.`;
    }

    console.error(`[AppleMusicService] ${context}:`, error);
    this.notificationService.showError(message);
  }

  /**
   * Handles authorization-specific errors with user-friendly messages.
   *
   * @param error - The error object from authorization
   */
  private handleAuthorizationError(error: any): void {
    const err = error as Record<string, unknown>;
    let message: string;

    if (
      typeof err.message === 'string' &&
      (err.message.includes('popup') || err.message.includes('blocked'))
    ) {
      message = 'Popup blocked. Please allow popups and try again.';
    } else if (
      typeof err.message === 'string' &&
      (err.message.includes('referrer') || err.message.includes('opener'))
    ) {
      message = 'Private Browsing detected. Please disable Private Browsing.';
    } else if (err.errorCode === 'USER_CANCELLED') {
      message = 'Sign-in cancelled.';
    } else {
      message = 'Apple Music sign-in failed. Please try again.';
    }

    console.error('[AppleMusicService] Authorization error:', error);
    this.notificationService.showError(message);
  }

  /**
   * Checks if the stored token is expired or within 1 day of expiry.
   *
   * @returns true if token is expired or expiring soon
   */
  private isTokenExpired(): boolean {
    const expiryStr = sessionStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
    if (!expiryStr) {
      return true;
    }

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Consider expired if within 1 day of expiry
    return now >= expiryTime - oneDayMs;
  }

  /**
   * Clears stored token and expiry from sessionStorage.
   */
  private clearStoredToken(): void {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
  }

  /**
   * Utility function for rate limiting delays.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Unwraps MusicKit API response which may be double-wrapped.
   * MusicKit v3 sometimes returns { data: { data: [...], next: "..." } }
   * instead of { data: [...], next: "..." }.
   */
  private unwrapResponse<T>(rawResponse: unknown): AppleMusicResponse<T> {
    if (!rawResponse || typeof rawResponse !== 'object') {
      return { data: [] };
    }

    const response = rawResponse as Record<string, unknown>;

    // Check if response.data is an object with its own 'data' array (double-wrapped)
    if (
      response.data &&
      typeof response.data === 'object' &&
      !Array.isArray(response.data) &&
      'data' in (response.data as object)
    ) {
      return response.data as AppleMusicResponse<T>;
    }

    // Response is already in correct format
    return response as AppleMusicResponse<T>;
  }
}
