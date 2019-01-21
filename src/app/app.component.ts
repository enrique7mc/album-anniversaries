import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { client_id, redirect_uri, scope, stateKey } from './constants';
import { SpotifyService } from './spotify.service';
import { Observable } from 'rxjs/Observable';
import { Artist } from './artist';
import { Album } from './album';
import { Inject } from '@angular/core';
import { APP_CONFIG, AppConfig } from './app-config';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title: string;
  params = null;
  accessToken: string;
  albums: Album[];
  artists: Artist[];
  albumsSubscription: Subscription;
  artistsSubscription: Subscription;
  loading: boolean = false;
  response: any;

  constructor(
    private http: HttpClient,
    private spotifyService: SpotifyService,
    @Inject(APP_CONFIG) private config: AppConfig
  ) {
    this.title = config.title;
  }

  ngOnInit() {
    this.params = this.getHashParams();
    this.accessToken = this.params['access_token'];

    if (this.authError) {
      console.error('There was an error during the authentication');
      return;
    }

    // localStorage.removeItem(stateKey);

    if (this.accessToken) {
      const httpOptions = {
        headers: new HttpHeaders({
          Authorization: `Bearer ${this.accessToken}`
        })
      };

      this.loading = true;
      this.spotifyService.loadArtists(this.accessToken);

      this.artistsSubscription = this.spotifyService.artists.subscribe(
        artists => {
          this.artists = artists;
          this.spotifyService.loadAlbums(
            this.accessToken,
            artists.map(a => a.id),
            true
          );
        }
      );

      // TODO(me): improve observable subscription logic.
      this.albumsSubscription = this.spotifyService.albums.subscribe(albums => {
        this.albums = albums;
        this.artists = this.artists.filter(artist => {
          return this.albums.some(a => a.artist_id === artist.id);
        });
        this.loading = false;
      });
    }
  }

  ngOnDestroy() {
    this.albumsSubscription.unsubscribe();
    this.artistsSubscription.unsubscribe();
  }

  get authError(): boolean {
    let state = this.params['state'];
    let storedState = localStorage.getItem(stateKey);

    return this.accessToken && (state == null || state !== storedState);
  }

  getHashParams(): any {
    let hashParams = {};
    var e,
      r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
    while ((e = r.exec(q))) {
      hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  }

  generateRandomString(length): string {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  login() {
    let state = this.generateRandomString(16);
    localStorage.setItem(stateKey, state);
    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += `&client_id=${encodeURIComponent(client_id)}`;
    url += `&scope=${encodeURIComponent(scope)}`;
    url += `&redirect_uri=${encodeURIComponent(this.config.redirectUrl)}`;
    url += `&state=${encodeURIComponent(state)}`;
    window.location.href = url;
  }
}
