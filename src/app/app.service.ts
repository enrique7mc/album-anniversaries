import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { mergeMap } from 'rxjs/operators';
import { forkJoin } from "rxjs/observable/forkJoin";
import { artistsUrl } from './constants';

// TODO(me): remove class
@Injectable()
export class AppService {
  constructor(private http: HttpClient) { }

  fetchAlbums(accessToken: string): Observable<Array<any>> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${accessToken}`
      })
    };

    return this.http.get(artistsUrl)
        .pipe(mergeMap((data: any) => {
          let artists: Array<any> = data.items.slice(0, 5);
          let artistIds = artists.map(a => a.id);
          const artistAlbumRequests: Array<Observable<any>> = artistIds.map(id => {
            return this.http.get(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album`, httpOptions);
          });

          return forkJoin(artistAlbumRequests); 
        }));
    
    // this.http.get(artistsUrl)
    //     .subscribe((data: any) => {
    //       let artists: Array<any> = data.items.slice(0, 5);
    //       let artistIds = artists.map(a => a.id);

    //       // for each artist retrieve the albums (in parallel)
    //       // this.http.get(`https://api.spotify.com/v1/artists/${artistIds[0]}/albums?include_groups=album`, httpOptions)
    //       //   .subscribe((data: any) => {
    //       //     artists[0].albums = data.items;
    //       //   });

    //       const artistAlbumRequests: Array<Observable<any>> = artistIds.map(id => {
    //         return this.http.get(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album`, httpOptions);
    //       });

    //       return forkJoin(artistAlbumRequests);
    //     });
  }
}