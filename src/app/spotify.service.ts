import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { mergeMap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { albumsUrl, artistsUrl } from './constants';
import { Artist } from './artist';
import { BehaviorSubject } from 'rxjs';
import { Album } from './album';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  private _albums: BehaviorSubject<Album[]>;
  private _artists: BehaviorSubject<Artist[]>;
  private dataStore: {
    albums: Album[];
    artists: Artist[];
  };

  constructor(private http: HttpClient) {
    this.dataStore = { albums: [], artists: [] };
    this._albums = <BehaviorSubject<Album[]>>new BehaviorSubject([]);
    this._artists = <BehaviorSubject<Artist[]>>new BehaviorSubject([]);
  }

  get albums() {
    return this._albums.asObservable();
  }

  get artists() {
    return this._artists.asObservable();
  }

  fetchAlbumsLocal() {
    return this.http.get(albumsUrl);
  }

  loadArtists(accessToken: string): void {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      })
    };

    this.http.get(artistsUrl).subscribe((data: any) => {
      const artists: Artist[] = data.items.slice(0, 5).map(item => {
        return {
          id: item.id,
          href: item.href,
          name: item.name,
          images: item.images,
          popularity: item.popularity
        };
      });

      this.dataStore.artists = artists;
      this._artists.next(Object.assign({}, this.dataStore).artists);
    });
  }

  loadAlbums(accessToken: string, artistIds: string[]): void {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      })
    };

    const artistAlbumRequests: Observable<any>[] = artistIds.map(id =>
      this.http
        .get(
          `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album`,
          httpOptions
        )
        .pipe(
          map((data: any) => {
            const albums: Album[] = data.items.map(item =>
              Object.assign({}, item, { artist_id: id })
            );
            return albums;
          })
        )
    );

    forkJoin(artistAlbumRequests).subscribe((data: any[]) => {
      const albums: Album[] = this.flatten(data).map(item => ({
        id: item.id,
        artist_id: item.artist_id,
        name: item.name,
        release_date: item.release_date,
        release_date_precision: item.release_date_precision,
        images: item.images
      }));

      this.dataStore.albums = albums;
      this._albums.next(Object.assign({}, this.dataStore).albums);
    });
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
