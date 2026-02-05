import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Artist } from '../artist';
import { Album } from '../album';
import { Image } from '../image';
import { MusicService } from './music-service.interface';
import { MusicKitLoaderService } from './musickit-loader.service';

// Constants
const STORAGE_KEY_TOKEN = 'apple_music_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'apple_music_token_expiry';
const TOKEN_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
const RATE_LIMIT_BATCH_SIZE = 5;
const RATE_LIMIT_DELAY_MS = 200;
const API_LIMIT = 100;
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
}

interface AppleMusicResponse<T> {
  data?: AppleMusicResource<T>[];
  next?: string;
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

    // Authorize user via MusicKit popup
    const musicUserToken = await this.musicKitInstance.authorize();

    // Store token with 6-month expiry in sessionStorage
    const expiry = Date.now() + TOKEN_EXPIRY_MS;
    sessionStorage.setItem(STORAGE_KEY_TOKEN, musicUserToken);
    sessionStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiry.toString());

    return musicUserToken;
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

    return from(this.fetchAllLibraryArtists()).pipe(
      switchMap((libraryArtists) =>
        this.fetchAlbumsForAllArtists(libraryArtists),
      ),
      map((artists) => {
        this.artistsSubject.next(artists);
        return true;
      }),
      catchError((error) => {
        console.error('[AppleMusicService] Error loading artists:', error);
        return of(false);
      }),
    );
  }

  /**
   * Fetches all library artists from Apple Music.
   * Handles pagination via 'next' property.
   */
  private async fetchAllLibraryArtists(): Promise<
    AppleMusicResource<AppleMusicArtistAttributes>[]
  > {
    if (!this.musicKitInstance) {
      return [];
    }

    const allArtists: AppleMusicResource<AppleMusicArtistAttributes>[] = [];
    let nextUrl: string | undefined =
      `/v1/me/library/artists?limit=${API_LIMIT}`;

    while (nextUrl) {
      const rawResponse = await this.musicKitInstance.api.music(nextUrl);

      // MusicKit v3 may wrap the response in a 'data' property
      // Handle both { data: [...], next: "..." } and { data: { data: [...], next: "..." } }
      const response: AppleMusicResponse<AppleMusicArtistAttributes> =
        this.unwrapResponse(rawResponse);

      if (response?.data && Array.isArray(response.data)) {
        allArtists.push(...response.data);
      }

      nextUrl = response?.next;
    }

    return allArtists;
  }

  /**
   * Fetches albums for all artists with rate limiting.
   * Batches requests to avoid throttling.
   */
  private async fetchAlbumsForAllArtists(
    libraryArtists: AppleMusicResource<AppleMusicArtistAttributes>[],
  ): Promise<Artist[]> {
    const artists: Artist[] = [];

    // Process artists in batches
    for (let i = 0; i < libraryArtists.length; i += RATE_LIMIT_BATCH_SIZE) {
      const batch = libraryArtists.slice(i, i + RATE_LIMIT_BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (libraryArtist) => {
          const albums = await this.fetchAlbumsForArtist(libraryArtist.id);
          const artist = this.mapToArtist(libraryArtist);
          artist.albums = albums.map((album) =>
            this.mapToAlbum(album, libraryArtist.id),
          );
          return artist;
        }),
      );

      artists.push(...batchResults);

      // Add delay between batches (except for last batch)
      if (i + RATE_LIMIT_BATCH_SIZE < libraryArtists.length) {
        await this.delay(RATE_LIMIT_DELAY_MS);
      }
    }

    return artists;
  }

  /**
   * Fetches albums for a specific artist from the catalog.
   */
  private async fetchAlbumsForArtist(
    artistId: string,
  ): Promise<AppleMusicResource<AppleMusicAlbumAttributes>[]> {
    if (!this.musicKitInstance) {
      return [];
    }

    try {
      const rawResponse = await this.musicKitInstance.api.music(
        `/v1/catalog/${STOREFRONT}/artists/${artistId}/albums?limit=${API_LIMIT}`,
      );

      // MusicKit v3 may wrap the response in a 'data' property
      const response: AppleMusicResponse<AppleMusicAlbumAttributes> =
        this.unwrapResponse(rawResponse);

      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      console.error(
        `[AppleMusicService] Error fetching albums for artist ${artistId}:`,
        error,
      );
      return [];
    }
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
