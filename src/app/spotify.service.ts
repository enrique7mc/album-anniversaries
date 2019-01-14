import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { mergeMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { artistsUrl } from './constants';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  constructor(private http: HttpClient) {}

  fetchAlbums(accessToken: string): Observable<Array<any>> {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      })
    };

    return this.http.get(artistsUrl).pipe(
      mergeMap((data: any) => {
        let artists: Array<any> = data.items.slice(0, 5);
        let artistIds = artists.map(a => a.id);
        const artistAlbumRequests: Array<Observable<any>> = artistIds.map(
          id => {
            return this.http.get(
              `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album`,
              httpOptions
            );
          }
        );

        return forkJoin(artistAlbumRequests);
      })
    );
  }
}
