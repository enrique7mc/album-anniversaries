import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import {
  mergeMap,
  map,
  filter,
  tap,
  bufferCount,
  switchMap,
  catchError,
  concatMap,
  delay,
} from 'rxjs/operators';
import { artistsLocalUrl } from './constants';
import { Artist } from './artist';
import { Album } from './album';
import { AppConfig, APP_CONFIG } from './app-config';

// Constants for magic numbers
const MILLISECONDS_IN_WEEK = 604800000;
const MILLISECONDS_IN_MONTH = 2592000000; // 30 days in milliseconds
const MILLISECONDS_IN_YEAR = 31536000000;
const RELEASE_DATE_PRECISION_DAY = 'day';
const DEV_ARTIST_LIMIT = 10;
const ARTIST_BUFFER_SIZE = 5;
const SPOTIFY_API_LIMIT = 50;

// Spotify API Response Interfaces
interface SpotifyImage {
  url: string;
  heigth: number; // Note: Matches existing Image interface typo
  width: number;
}

interface SpotifyExternalUrls {
  spotify: string;
}

interface SpotifyArtistResponse {
  id: string;
  href: string;
  name: string;
  images: SpotifyImage[];
  popularity: number;
  external_urls: SpotifyExternalUrls;
}

interface SpotifyArtistsListResponse {
  items: SpotifyArtistResponse[];
}

interface SpotifyAlbumResponse {
  id: string;
  name: string;
  release_date: string;
  release_date_precision: string;
  images: SpotifyImage[];
  external_urls: SpotifyExternalUrls;
}

interface SpotifyAlbumsListResponse {
  items: SpotifyAlbumResponse[];
}

interface AlbumWithArtistId extends SpotifyAlbumResponse {
  artist_id: string;
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
}

interface SpotifyAlbumTracksResponse {
  items: SpotifyTrack[];
  next: string | null;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private isDev: boolean;
  private _artists: BehaviorSubject<Artist[]>;
  private dataStore: {
    artists: Artist[];
  };

  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.isDev = config.isDev;
    this.dataStore = { artists: [] };
    this._artists = new BehaviorSubject<Artist[]>([]);
  }

  get artists(): Observable<Artist[]> {
    return this._artists.asObservable();
  }

  get artistsUrl(): string {
    return this.isDev
      ? artistsLocalUrl
      : `https://api.spotify.com/v1/me/top/artists?limit=${SPOTIFY_API_LIMIT}`;
  }

  artistUrl(id: string): string {
    return `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album&limit=${SPOTIFY_API_LIMIT}`;
  }

  /**
   * Creates HTTP headers with authorization token
   */
  private createAuthHeaders(accessToken: string): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`,
      }),
    };
  }

  /**
   * Maps Spotify artist response to internal Artist model
   */
  private mapToArtist(item: SpotifyArtistResponse): Artist {
    return {
      id: item.id,
      href: item.href,
      name: item.name,
      images: item.images,
      popularity: item.popularity,
      external_url: item.external_urls.spotify,
      albums: [],
    };
  }

  /**
   * Maps Spotify album response to internal Album model
   */
  private mapToAlbum(item: AlbumWithArtistId): Album {
    return {
      id: item.id,
      artist_id: item.artist_id,
      name: item.name,
      release_date: item.release_date,
      release_date_precision: item.release_date_precision,
      images: item.images,
      external_url: item.external_urls.spotify,
    };
  }

  /**
   * Filters and maps albums based on release date criteria
   * Caches "today" to avoid recalculating for each album
   */
  private filterAndMapAlbums(
    items: SpotifyAlbumResponse[],
    artistId: string,
  ): Album[] {
    // Cache today's date once for all album filtering
    const today = new Date(Date.now());
    const todayTimestamp = today.getTime();

    return items
      .map((item) => ({ ...item, artist_id: artistId }))
      .filter(
        (item) => item.release_date_precision === RELEASE_DATE_PRECISION_DAY,
      )
      .filter(
        (item) =>
          this.albumHadBirthdayPastWeek(item, today) ||
          this.albumHadBirthdayPastMonth(item, today) ||
          this.albumReleasedPastYear(item, todayTimestamp),
      )
      .map((item) => this.mapToAlbum(item));
  }

  /**
   * Loads artists with their albums from Spotify API
   * Returns an observable that emits true when complete, false on error
   */
  loadArtistsWithAlbums(accessToken: string): Observable<boolean> {
    const httpOptions = this.createAuthHeaders(accessToken);

    return this.http
      .get<SpotifyArtistsListResponse>(this.artistsUrl, httpOptions)
      .pipe(
        map((data) => {
          const items = this.isDev
            ? data.items.slice(0, DEV_ARTIST_LIMIT)
            : data.items;
          return items.map((item) => this.mapToArtist(item));
        }),
        switchMap((artists) => this.loadAlbumsForArtists(artists, httpOptions)),
        catchError((error) => {
          console.error('[SpotifyService] Error loading artists:', error);
          return of(false);
        }),
      );
  }

  /**
   * Loads albums for all artists and updates the data store progressively
   */
  private loadAlbumsForArtists(
    artists: Artist[],
    httpOptions: { headers: HttpHeaders },
  ): Observable<boolean> {
    const artistAlbumRequests = from(artists).pipe(
      mergeMap((artist) =>
        this.http
          .get<SpotifyAlbumsListResponse>(
            this.artistUrl(artist.id),
            httpOptions,
          )
          .pipe(
            map((data) => this.filterAndMapAlbums(data.items, artist.id)),
            filter((albums) => albums.length > 0),
            map((albums) => this.createArtistWithAlbums(artist, albums)),
            catchError((error) => {
              console.error(
                `[SpotifyService] Error loading albums for artist ${artist.name}:`,
                error,
              );
              // Continue with other artists even if one fails
              return of(null);
            }),
          ),
      ),
      filter((artist): artist is Artist => artist !== null),
      bufferCount(ARTIST_BUFFER_SIZE),
      tap((artistList) => {
        this.dataStore.artists = [...this.dataStore.artists, ...artistList];
        this._artists.next([...this.dataStore.artists]);
      }),
    );

    // Convert to a boolean observable that completes
    return new Observable<boolean>((observer) => {
      artistAlbumRequests.subscribe({
        next: () => {
          // Progress updates handled by tap above
        },
        error: (err) => {
          console.error('[SpotifyService] Error loading album data:', err);
          observer.next(false);
          observer.complete();
        },
        complete: () => {
          observer.next(true);
          observer.complete();
        },
      });
    });
  }

  /**
   * Creates a new Artist object with albums (immutable)
   */
  private createArtistWithAlbums(artist: Artist, albums: Album[]): Artist {
    return {
      ...artist,
      albums: [...albums],
    };
  }

  /**
   * Checks if an album had its birthday in the past week
   * @param album - The album to check
   * @param today - Cached today's date to avoid recalculation
   */
  private albumHadBirthdayPastWeek(
    album: AlbumWithArtistId,
    today: Date,
  ): boolean {
    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    albumDate.setFullYear(today.getFullYear());
    const dateDiffMillis = today.getTime() - albumDate.getTime();

    return dateDiffMillis > 0 && dateDiffMillis < MILLISECONDS_IN_WEEK;
  }

  /**
   * Checks if an album had its birthday in the past month
   * @param album - The album to check
   * @param today - Cached today's date to avoid recalculation
   */
  private albumHadBirthdayPastMonth(
    album: AlbumWithArtistId,
    today: Date,
  ): boolean {
    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    albumDate.setFullYear(today.getFullYear());
    // Handle cross-year scenarios: if anniversary is in the future, use last year's anniversary
    if (albumDate.getTime() > today.getTime()) {
      albumDate.setFullYear(today.getFullYear() - 1);
    }
    const dateDiffMillis = today.getTime() - albumDate.getTime();

    return dateDiffMillis > 0 && dateDiffMillis < MILLISECONDS_IN_MONTH;
  }

  /**
   * Checks if an album was released in the past year
   * @param album - The album to check
   * @param todayTimestamp - Cached today's timestamp to avoid recalculation
   */
  private albumReleasedPastYear(
    album: AlbumWithArtistId,
    todayTimestamp: number,
  ): boolean {
    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    const dateDiffMillis = todayTimestamp - albumDate.getTime();

    // Only count albums released in the past (not future)
    return dateDiffMillis > 0 && dateDiffMillis < MILLISECONDS_IN_YEAR;
  }

  /**
   * Static method: Checks if an album had its birthday in the past week
   * Used by external components and tests
   */
  static albumHadBirthdayPastWeek(album: Album): boolean {
    const today = new Date(Date.now());

    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    albumDate.setFullYear(today.getFullYear());
    const dateDiffMillis = today.getTime() - albumDate.getTime();

    return dateDiffMillis > 0 && dateDiffMillis < MILLISECONDS_IN_WEEK;
  }

  /**
   * Static method: Checks if an album was released in the past year
   * Used by external components and tests
   */
  static albumReleasedPastYear(album: Album): boolean {
    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    const now = Date.now();
    const dateDiffMillis = now - albumDate.getTime();

    // Only count albums released in the past (not future)
    return dateDiffMillis > 0 && dateDiffMillis < MILLISECONDS_IN_YEAR;
  }

  /**
   * Static method: Checks if an album had its birthday in the past month
   * Used by external components and tests
   */
  static albumHadBirthdayPastMonth(album: Album): boolean {
    const today = new Date(Date.now());

    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    albumDate.setFullYear(today.getFullYear());
    // Handle cross-year scenarios: if anniversary is in the future, use last year's anniversary
    if (albumDate.getTime() > today.getTime()) {
      albumDate.setFullYear(today.getFullYear() - 1);
    }
    const dateDiffMillis = today.getTime() - albumDate.getTime();

    return dateDiffMillis > 0 && dateDiffMillis < MILLISECONDS_IN_MONTH;
  }

  /**
   * Fetches all tracks from an album
   * @param accessToken - Spotify access token
   * @param albumId - Spotify album ID
   * @returns Observable that emits an array of track URIs
   */
  getAlbumTracks(accessToken: string, albumId: string): Observable<string[]> {
    const httpOptions = this.createAuthHeaders(accessToken);
    const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

    return this.http.get<SpotifyAlbumTracksResponse>(url, httpOptions).pipe(
      map((response) => response.items.map((track) => track.uri)),
      catchError((error) => {
        console.error(
          `[SpotifyService] Error fetching tracks for album ${albumId}:`,
          error,
        );
        throw error;
      }),
    );
  }

  /**
   * Adds all tracks from an album to the user's Spotify queue
   * @param accessToken - Spotify access token
   * @param albumId - Spotify album ID
   * @returns Observable that completes when all tracks are queued
   */
  addAlbumToQueue(accessToken: string, albumId: string): Observable<void> {
    const httpOptions = this.createAuthHeaders(accessToken);

    return this.getAlbumTracks(accessToken, albumId).pipe(
      switchMap((trackUris) => {
        if (trackUris.length === 0) {
          return of(undefined);
        }

        // Process tracks sequentially with a small delay to avoid rate limits
        return from(trackUris).pipe(
          concatMap((trackUri, index) => {
            const url = `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(
              trackUri,
            )}`;
            // Spotify returns plain text (not JSON) for this endpoint, so use 'text' responseType
            const requestOptions = {
              ...httpOptions,
              responseType: 'text' as const,
            };
            // Add a small delay before each request (50ms) except for the first one
            return index === 0
              ? this.http.post(url, {}, requestOptions)
              : of(null).pipe(
                  delay(50),
                  switchMap(() => this.http.post(url, {}, requestOptions)),
                );
          }),
          catchError((error) => {
            console.error(
              `[SpotifyService] Error adding album ${albumId} to queue:`,
              error,
            );
            throw error;
          }),
        );
      }),
      map(() => undefined),
    );
  }
}
