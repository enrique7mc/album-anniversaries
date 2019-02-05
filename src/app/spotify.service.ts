import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { mergeMap } from 'rxjs/operators';
import { map, filter, tap, bufferCount } from 'rxjs/operators';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { albumsLocalUrl, artistsLocalUrl } from './constants';
import { Artist } from './artist';
import { BehaviorSubject, from } from 'rxjs';
import { Album } from './album';
import { AppConfig, APP_CONFIG } from './app-config';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  private isDev: boolean;
  private _artists: BehaviorSubject<Artist[]>;
  private dataStore: {
    artists: Artist[];
  };

  constructor(private http: HttpClient, @Inject(APP_CONFIG) config: AppConfig) {
    this.isDev = config.isDev;
    this.dataStore = { artists: [] };
    this._artists = <BehaviorSubject<Artist[]>>new BehaviorSubject([]);
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

  loadArtistsWithAlbums(accessToken: string): void {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      })
    };

    // TODO(me): try to compose the artist and albums observables instead of
    // handling a nested subscription.
    this.http.get(this.artistsUrl, httpOptions).subscribe((data: any) => {
      let artistsResponse = data.items;

      if (this.isDev) {
        artistsResponse = data.items.slice(0, 10);
      }

      const artists: Artist[] = artistsResponse.map(item => {
        return {
          id: item.id,
          href: item.href,
          name: item.name,
          images: item.images,
          popularity: item.popularity,
          external_url: item.external_urls.spotify,
          albums: []
        };
      });

      const artistAlbumRequests: Observable<any> = from(artists).pipe(
        mergeMap(artist =>
          this.http.get(this.artistUrl(artist.id), httpOptions).pipe(
            map((data: any) => {
              // TODO(me): extract this into its own function
              const albums: Album[] = data.items
                .map(item => Object.assign({}, item, { artist_id: artist.id }))
                .filter(item => item.release_date_precision === 'day')
                .filter(
                  item =>
                    SpotifyService.albumHadBirthdayPastWeek(item) ||
                    SpotifyService.albumReleasedPastYear(item)
                )
                .map(item => ({
                  id: item.id,
                  artist_id: item.artist_id,
                  name: item.name,
                  release_date: item.release_date,
                  release_date_precision: item.release_date_precision,
                  images: item.images,
                  external_url: item.external_urls.spotify
                }));
              return albums;
            })
          )
        ),
        filter(albums => albums.length > 0),
        map(albums => {
          const matchingArtist = artists.find(
            a => a.id === albums[0].artist_id
          );
          matchingArtist.albums.push(...albums);

          return matchingArtist;
        })
      );

      artistAlbumRequests.pipe(bufferCount(5)).subscribe(artistList => {
        this.dataStore.artists = [...this.dataStore.artists, ...artistList];
        this._artists.next(Object.assign({}, this.dataStore).artists);
      });
    });
  }

  // TODO(me): refactor this to make more generic
  static albumHadBirthdayPastWeek(album: Album): boolean {
    const today = new Date(Date.now());
    const albumDate = new Date(
      Date.parse(`${album.release_date} 00:00:00 -0800`)
    );
    albumDate.setFullYear(today.getFullYear());
    const millisecondsInAWeek = 604800000;
    const dateDiffMillis = today.getTime() - albumDate.getTime();

    return dateDiffMillis > 0 && dateDiffMillis < millisecondsInAWeek;
  }

  static albumReleasedPastYear(album: Album): boolean {
    const albumDate = new Date(
      Date.parse(`${album.release_date} 00:00:00 -0800`)
    );
    const now = Date.now();
    const millisecondsInAYear = 31536000000;

    return Math.abs(now - albumDate.getTime()) < millisecondsInAYear;
  }

  // TODO(me): replace with array.flat()
  flatten(input) {
    const stack = [...input];
    const res = [];
    while (stack.length) {
      // pop value from stack
      const next = stack.pop();
      if (Array.isArray(next)) {
        // push back array items, won't modify the original input
        stack.push(...next);
      } else {
        res.push(next);
      }
    }
    //reverse to restore input order
    return res.reverse();
  }
}
