import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, from, forkJoin, of } from 'rxjs';
import { mergeMap, map, filter, tap, bufferCount, shareReplay, finalize } from 'rxjs/operators';
import { albumsLocalUrl, artistsLocalUrl } from './constants';
import { Artist } from './artist';
import { Album } from './album';
import { AppConfig, APP_CONFIG } from './app-config';

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private isDev: boolean;
  private _artists: BehaviorSubject<Artist[]>;
  private dataStore: {
    artists: Artist[];
  };
  private responseCache = new Map<string, { timestamp: number; value: any }>();
  private inflight = new Map<string, Observable<any>>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

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
      : 'https://api.spotify.com/v1/me/top/artists?limit=50';
  }

  artistUrl(id: string): string {
    return `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album&limit=50`;
  }

  // TODO: figure out the optimal way to signal this method is done loading.
  loadArtistsWithAlbums(accessToken: string, bypassCache = false): Observable<boolean> {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`,
      }),
    };

    const done$ = new Subject<boolean>();

    // TODO: try to compose the artist and albums observables instead of
    // handling a nested subscription.
    this.getWithCache<any>(this.artistsUrl, httpOptions, bypassCache).subscribe(
      (data: any) => {
        let artistsResponse = data.items;

        if (this.isDev) {
          artistsResponse = data.items.slice(0, 10);
        }

        const artists: Artist[] = artistsResponse.map((item) => {
          return {
            id: item.id,
            href: item.href,
            name: item.name,
            images: item.images,
            popularity: item.popularity,
            external_url: item.external_urls.spotify,
            albums: [],
          };
        });

        const artistAlbumRequests: Observable<any> = from(artists).pipe(
          mergeMap((artist) =>
            this.getWithCache<any>(this.artistUrl(artist.id), httpOptions, bypassCache).pipe(
              map((data: any) => {
                // TODO: extract this into its own function
                const albums: Album[] = data.items
                  .map((item) =>
                    Object.assign({}, item, { artist_id: artist.id }),
                  )
                  .filter((item) => item.release_date_precision === 'day')
                  .filter(
                    (item) =>
                      SpotifyService.albumHadBirthdayPastWeek(item) ||
                      SpotifyService.albumReleasedPastYear(item),
                  )
                  .map((item) => ({
                    id: item.id,
                    artist_id: item.artist_id,
                    name: item.name,
                    release_date: item.release_date,
                    release_date_precision: item.release_date_precision,
                    images: item.images,
                    external_url: item.external_urls.spotify,
                  }));
                return albums;
              }),
            ),
          ),
          filter((albums) => albums.length > 0),
          map((albums) => {
            const matchingArtist = artists.find(
              (a) => a.id === albums[0].artist_id,
            );
            matchingArtist.albums.push(...albums);

            return matchingArtist;
          }),
        );

        artistAlbumRequests.pipe(bufferCount(5)).subscribe(
          (artistList) => {
            this.dataStore.artists = [...this.dataStore.artists, ...artistList];
            this._artists.next(Object.assign({}, this.dataStore).artists);
          },
          (err) => {
            console.error('[SpotifyService] Error loading album data:', err);
          },
          () => {
            done$.next(true);
          },
        );
      },
      (error) => {
        console.error('[SpotifyService] Error loading artists:', error);
        done$.next(false);
      },
    );

    return done$.asObservable();
  }

  clearCache(): void {
    this.responseCache.clear();
    this.inflight.clear();
  }

  private getWithCache<T>(url: string, options: { headers?: HttpHeaders }, bypass = false): Observable<T> {
    // In production or when explicitly bypassing, skip cache entirely
    if (!this.isDev || bypass) {
      const httpOptions: { headers?: HttpHeaders; observe: 'body' } = { ...(options || {}), observe: 'body' };
      console.debug('[SpotifyService] cache BYPASS', url);
      return this.http.get<T>(url, httpOptions);
    }

    const now = Date.now();
    const cached = this.responseCache.get(url);
    if (cached && now - cached.timestamp < this.cacheTtlMs) {
      console.debug('[SpotifyService] cache HIT', url, 'ageMs', now - cached.timestamp);
      return of(cached.value as T);
    }

    const inflightExisting = this.inflight.get(url);
    if (inflightExisting) {
      return inflightExisting as Observable<T>;
    }

    const httpOptions: { headers?: HttpHeaders; observe: 'body' } = { ...(options || {}), observe: 'body' };
    console.debug('[SpotifyService] network GET', url);
    const request$ = this.http.get<T>(url, httpOptions).pipe(
      tap((value) => {
        this.responseCache.set(url, { timestamp: Date.now(), value });
      }),
      shareReplay(1),
      finalize(() => {
        this.inflight.delete(url);
      }),
    );

    this.inflight.set(url, request$ as Observable<any>);
    return request$;
  }

  // TODO: refactor this to make more generic
  static albumHadBirthdayPastWeek(album: Album): boolean {
    const today = new Date(Date.now());

    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    albumDate.setFullYear(today.getFullYear());
    const millisecondsInAWeek = 604800000;
    const dateDiffMillis = today.getTime() - albumDate.getTime();

    return dateDiffMillis > 0 && dateDiffMillis < millisecondsInAWeek;
  }

  static albumReleasedPastYear(album: Album): boolean {
    // Parse ISO date string (YYYY-MM-DD) - works across all browsers including Safari
    const albumDate = new Date(album.release_date + 'T00:00:00');

    const now = Date.now();
    const millisecondsInAYear = 31536000000;
    const dateDiffMillis = now - albumDate.getTime();

    // Only count albums released in the past (not future)
    return dateDiffMillis > 0 && dateDiffMillis < millisecondsInAYear;
  }
}
