import { Component, OnInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { client_id, redirect_uri, scope, stateKey } from './constants';
import { SpotifyService } from './spotify.service';
import { PkceService } from './pkce.service';
import { Observable } from 'rxjs';
import { Artist } from './artist';
import { Album } from './album';
import { Inject } from '@angular/core';
import { APP_CONFIG, AppConfig } from './app-config';
import { Subscription, Subject } from 'rxjs';
import { map, takeUntil, take } from 'rxjs/operators';
import { Functions } from '@angular/fire/functions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy {
  title: string;
  accessToken: string;
  showAlbumBirthdayList: boolean = false;
  artists$: Observable<Artist[]>;
  artistsWithRecentAlbums$: Observable<Artist[]>;
  artistsSubscription: Subscription;
  loading: boolean = false;

  _destroyed$ = new Subject<void>();
  private fn: Functions = inject(Functions);

  constructor(
    private spotifyService: SpotifyService,
    private pkceService: PkceService,
    private http: HttpClient,
    @Inject(APP_CONFIG) private config: AppConfig
  ) {
    this.title = config.title;
  }

  async ngOnInit() {
    // Check for authorization code in URL (PKCE flow)
    const code = this.getCode();

    // Validate state BEFORE exchanging code (important: do this before state is cleared)
    if (code && this.authError) {
      console.error('Authentication error - state mismatch or missing state');
      const urlParams = new URLSearchParams(window.location.search);
      console.error('URL state:', urlParams.get('state'));
      console.error('Stored state:', localStorage.getItem(stateKey));
      return;
    }

    if (code) {
      // Exchange authorization code for access token
      await this.exchangeCodeForToken(code);
    }

    if (this.accessToken) {
      this.loading = true;
      const doneLoading$ = this.spotifyService.loadArtistsWithAlbums(
        this.accessToken
      );

      // TODO(me): figure out a better way to do the subscription logic.
      this.artistsWithRecentAlbums$ = (this.spotifyService.artists as Observable<Artist[]>).pipe(
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

      this.artists$ = (this.spotifyService.artists as Observable<Artist[]>).pipe(
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
    // Check for state in URL query parameters (PKCE uses query params, not hash)
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state');
    const storedState = localStorage.getItem(stateKey);

    // Error if we have a code or token but state doesn't match
    const code = this.getCode();
    return (this.accessToken || code) && (state == null || state !== storedState);
  }

  getCode(): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
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

  async login() {
    // Generate PKCE parameters
    const codeVerifier = this.pkceService.generateCodeVerifier();
    const codeChallenge = await this.pkceService.generateCodeChallenge(codeVerifier);

    // Store code verifier for later use during token exchange
    this.pkceService.storeCodeVerifier(codeVerifier);

    // Generate and store state for CSRF protection
    const state = this.generateRandomString(16);
    localStorage.setItem(stateKey, state);

    // Build authorization URL with PKCE
    let url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=code';  // Changed from 'token' to 'code' for PKCE
    url += `&client_id=${encodeURIComponent(client_id)}`;
    url += `&scope=${encodeURIComponent(scope)}`;
    url += `&redirect_uri=${encodeURIComponent(this.config.redirectUrl)}`;
    url += `&state=${encodeURIComponent(state)}`;
    url += `&code_challenge_method=S256`;
    url += `&code_challenge=${encodeURIComponent(codeChallenge)}`;

    window.location.href = url;
  }

  /**
   * Exchanges the authorization code for an access token using PKCE
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    const codeVerifier = this.pkceService.getCodeVerifier();

    if (!codeVerifier) {
      console.error('Code verifier not found in session storage');
      return;
    }

    // Prepare the token exchange request
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.config.redirectUrl,
      client_id: client_id,
      code_verifier: codeVerifier
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    try {
      const response: any = await this.http.post(
        'https://accounts.spotify.com/api/token',
        body.toString(),
        { headers }
      ).toPromise();

      this.accessToken = response.access_token;

      // Clean up: remove code verifier and clear URL params
      this.pkceService.clearCodeVerifier();
      localStorage.removeItem(stateKey);

      // Clean the URL to remove the authorization code
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  }

}
