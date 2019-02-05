import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';

import { client_id, redirect_uri, scope, stateKey } from './constants';
import { SpotifyService } from './spotify.service';
import { Observable } from 'rxjs/Observable';
import { Artist } from './artist';
import { Album } from './album';
import { Inject } from '@angular/core';
import { APP_CONFIG, AppConfig } from './app-config';
import { Subscription, Subject } from 'rxjs';
import { map, takeUntil, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy {
  title: string;
  params = null;
  accessToken: string;
  showAlbumBirthdayList: boolean = false;
  artists$: Observable<Artist[]>;
  artistsWithRecentAlbums$: Observable<Artist[]>;
  artistsSubscription: Subscription;
  loading: boolean = false;

  _destroyed$ = new Subject();

  constructor(
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
      this.loading = true;
      const doneLoading$ = this.spotifyService.loadArtistsWithAlbums(
        this.accessToken
      );

      // TODO(me): figure out a better way to do the subscription logic.
      this.artistsWithRecentAlbums$ = this.spotifyService.artists.pipe(
        map(artists => artists.map(a => Object.assign({}, a))),
        map(
          artists =>
            artists.filter(artist => {
              artist.albums = artist.albums.filter(
                SpotifyService.albumReleasedPastYear
              );
              return artist.albums.length > 0;
            }),
          takeUntil(this._destroyed$)
        )
      );

      this.artists$ = this.spotifyService.artists.pipe(
        map(artists => artists.map(a => Object.assign({}, a))),
        map(
          artists =>
            artists.filter(artist => {
              artist.albums = artist.albums.filter(
                SpotifyService.albumHadBirthdayPastWeek
              );
              return artist.albums.length > 0;
            }),
          takeUntil(this._destroyed$)
        )
      );

      doneLoading$
        .pipe(
          takeUntil(this._destroyed$),
          take(1)
        )
        .subscribe(() => (this.loading = false));
    }
  }

  ngOnDestroy() {
    this._destroyed$.next();
    this._destroyed$.complete();
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
