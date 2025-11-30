import {
  Component,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  inject,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import {
  client_id,
  redirect_uri,
  scope,
  stateKey,
  accessTokenKey,
  tokenExpiryKey,
} from './constants';
import { SpotifyService } from './spotify.service';
import { PkceService } from './pkce.service';
import { GsapService } from './gsap.service';
import { Observable } from 'rxjs';
import { Artist } from './artist';
import { Album } from './album';
import { Inject } from '@angular/core';
import { APP_CONFIG, AppConfig } from './app-config';
import {
  Subscription,
  Subject,
  BehaviorSubject,
  combineLatest,
  fromEvent,
} from 'rxjs';
import { map, takeUntil, take, throttleTime } from 'rxjs/operators';
import { Functions } from '@angular/fire/functions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title: string;
  accessToken: string;
  showAlbumBirthdayList: boolean = false;
  artists$: Observable<Artist[]>;
  artistsWithRecentAlbums$: Observable<Artist[]>;
  artistsSubscription: Subscription;
  loading: boolean = false;

  // UI state for the header chip
  currentFilterLabel: string = 'This Week';

  // Dropdown state
  dropdownOpen: boolean = false;

  // Scroll to top button visibility
  showScrollToTop: boolean = false;

  // Anniversary range selection
  anniversaryRange: 'week' | 'month' = 'week';
  private anniversaryRange$ = new BehaviorSubject<'week' | 'month'>('week');

  // Section anchors (inside *ngIf, so static must be false)
  @ViewChild('weekSection', { static: false })
  weekSection: ElementRef<HTMLElement>;
  @ViewChild('yearSection', { static: false })
  yearSection: ElementRef<HTMLElement>;

  // Album grid refs for GSAP animations
  @ViewChildren('albumsGrid') albumGrids: QueryList<ElementRef>;

  // Scroll progress bar ref
  @ViewChild('scrollProgressBar', { static: false })
  scrollProgressBar: ElementRef<HTMLElement>;

  private sectionObserver?: IntersectionObserver;
  private observerInitialized: boolean = false;

  _destroyed$ = new Subject<void>();
  private fn: Functions = inject(Functions);

  constructor(
    private spotifyService: SpotifyService,
    private pkceService: PkceService,
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private gsapService: GsapService,
    @Inject(APP_CONFIG) private config: AppConfig,
  ) {
    this.title = config.title;
  }

  async ngOnInit() {
    this.setupScrollListener();
    // First, check if there's a valid stored token
    const storedToken = this.getStoredToken();
    if (storedToken) {
      this.accessToken = storedToken;
    } else {
      // No valid stored token, check for authorization code in URL (PKCE flow)
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
    }

    if (this.accessToken) {
      this.loading = true;
      const doneLoading$ = this.spotifyService.loadArtistsWithAlbums(
        this.accessToken,
      );

      // TODO(me): figure out a better way to do the subscription logic.
      this.artistsWithRecentAlbums$ = (
        this.spotifyService.artists as Observable<Artist[]>
      ).pipe(
        map((artists) => artists.map((a) => Object.assign({}, a))),
        map((artists) =>
          artists.filter((artist) => {
            artist.albums = artist.albums.filter(
              SpotifyService.albumReleasedPastYear,
            );
            return artist.albums.length > 0;
          }),
        ),
        takeUntil(this._destroyed$),
      );

      // Anniversary range-aware filtering for week/month selection
      this.artists$ = combineLatest([
        this.spotifyService.artists as Observable<Artist[]>,
        this.anniversaryRange$,
      ]).pipe(
        map(([artists, range]) => {
          const filteredArtists = artists.map((a) => Object.assign({}, a));
          return filteredArtists.filter((artist) => {
            artist.albums = artist.albums.filter((album) =>
              range === 'week'
                ? SpotifyService.albumHadBirthdayPastWeek(album)
                : SpotifyService.albumHadBirthdayPastMonth(album),
            );
            return artist.albums.length > 0;
          });
        }),
        takeUntil(this._destroyed$),
      );

      doneLoading$.pipe(takeUntil(this._destroyed$), take(1)).subscribe(() => {
        this.loading = false;
        // Try to init observer after data load (sections become visible)
        this.initObserverIfReady();
      });
    }
  }

  ngAfterViewInit(): void {
    this.initObserverIfReady();
    this.initGsapAnimations();
  }

  /**
   * Initialize GSAP animations after view is ready
   */
  private initGsapAnimations(): void {
    // Initialize scroll progress bar
    if (this.scrollProgressBar) {
      this.gsapService.createScrollProgress(
        this.scrollProgressBar.nativeElement,
      );
    }

    // Animate album grids when data loads
    this.artists$.pipe(take(1)).subscribe(() => {
      setTimeout(() => {
        if (this.albumGrids) {
          this.albumGrids.forEach((gridRef, index) => {
            this.gsapService.animateAlbumGrid(
              gridRef.nativeElement,
              index * 0.1,
            );
          });
        }
      }, 100);
    });
  }

  private initObserverIfReady(): void {
    if (this.observerInitialized) {
      return;
    }
    if (!this.yearSection || !this.yearSection.nativeElement) {
      if (!this.accessToken || this.loading) {
        return;
      }
      // Defer and try again on next tick
      setTimeout(() => this.initObserverIfReady(), 100);
      return;
    }
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        // Ensure UI updates run inside Angular zone
        this.ngZone.run(() => {
          for (const entry of entries) {
            if (entry.target === this.yearSection.nativeElement) {
              const toolbarOffset = 64; // sticky toolbar height
              const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
              const top = entry.boundingClientRect.top;
              const passedTop = top <= rootTop + toolbarOffset;

              if (passedTop) {
                if (this.currentFilterLabel !== 'Last Year') {
                  this.currentFilterLabel = 'Last Year';
                }
              } else {
                const expectedLabel =
                  this.anniversaryRange === 'week' ? 'This Week' : 'This Month';
                if (this.currentFilterLabel !== expectedLabel) {
                  this.currentFilterLabel = expectedLabel;
                }
              }
            }
          }
        });
      },
      {
        // Account for sticky toolbar height and avoid flipping too early
        root: null,
        rootMargin: '-64px 0px -40% 0px',
        threshold: 0.01,
      },
    );
    this.sectionObserver.observe(this.yearSection.nativeElement);
    this.observerInitialized = true;
  }

  ngOnDestroy() {
    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
    }
    // Clean up GSAP ScrollTriggers
    this.gsapService.killAllScrollTriggers();
    this._destroyed$.next();
    this._destroyed$.complete();
  }

  /**
   * Sets up scroll listener to show/hide scroll to top button
   */
  private setupScrollListener(): void {
    // Initial check
    this.checkScrollPosition();

    // Use RxJS fromEvent for more reliable scroll detection
    fromEvent(window, 'scroll', { passive: true })
      .pipe(
        throttleTime(100), // Throttle to avoid excessive checks
        takeUntil(this._destroyed$),
      )
      .subscribe(() => {
        this.checkScrollPosition();
      });

    // Also listen to document scroll for better compatibility
    fromEvent(document, 'scroll', { passive: true })
      .pipe(throttleTime(100), takeUntil(this._destroyed$))
      .subscribe(() => {
        this.checkScrollPosition();
      });
  }

  /**
   * Checks scroll position and shows/hides the scroll to top button
   */
  private checkScrollPosition(): void {
    this.ngZone.run(() => {
      const scrollThreshold = 200; // Show button after scrolling 200px
      // Use multiple methods to get scroll position for better compatibility
      const scrollY =
        window.pageYOffset ||
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      const shouldShow = scrollY > scrollThreshold;

      if (this.showScrollToTop !== shouldShow) {
        this.showScrollToTop = shouldShow;
        // Explicitly trigger change detection
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Scrolls to the top of the page
   */
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /**
   * Toggles the dropdown menu open/closed
   */
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  get authError(): boolean {
    // Check for state in URL query parameters (PKCE uses query params, not hash)
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state');
    const storedState = localStorage.getItem(stateKey);

    // Error if we have a code or token but state doesn't match
    const code = this.getCode();
    return (
      (this.accessToken || code) && (state == null || state !== storedState)
    );
  }

  getCode(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
  }

  generateRandomString(length: number): string {
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values)
      .map((x) => possible[x % possible.length])
      .join('');
  }

  async login() {
    // Generate PKCE parameters
    const codeVerifier = this.pkceService.generateCodeVerifier();
    const codeChallenge =
      await this.pkceService.generateCodeChallenge(codeVerifier);

    // Store code verifier for later use during token exchange
    this.pkceService.storeCodeVerifier(codeVerifier);

    // Generate and store state for CSRF protection
    const state = this.generateRandomString(16);
    localStorage.setItem(stateKey, state);

    // Build authorization URL with PKCE
    let url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=code'; // Changed from 'token' to 'code' for PKCE
    url += `&client_id=${encodeURIComponent(client_id)}`;
    url += `&scope=${encodeURIComponent(scope)}`;
    url += `&redirect_uri=${encodeURIComponent(this.config.redirectUrl)}`;
    url += `&state=${encodeURIComponent(state)}`;
    url += `&code_challenge_method=S256`;
    url += `&code_challenge=${encodeURIComponent(codeChallenge)}`;

    window.location.href = url;
  }

  /**
   * Checks if there's a valid stored access token
   */
  private hasValidStoredToken(): boolean {
    const token = localStorage.getItem(accessTokenKey);
    const expiryStr = localStorage.getItem(tokenExpiryKey);

    if (!token || !expiryStr) {
      return false;
    }

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();

    // Token is valid if it hasn't expired yet
    return now < expiryTime;
  }

  /**
   * Retrieves the stored access token if valid
   */
  private getStoredToken(): string | null {
    if (this.hasValidStoredToken()) {
      return localStorage.getItem(accessTokenKey);
    }
    // Clear expired token
    this.clearStoredToken();
    return null;
  }

  /**
   * Stores the access token and its expiry time
   */
  private storeToken(accessToken: string, expiresIn: number): void {
    localStorage.setItem(accessTokenKey, accessToken);
    // Calculate expiry time (current time + expires_in seconds - 60 second buffer)
    const expiryTime = Date.now() + (expiresIn - 60) * 1000;
    localStorage.setItem(tokenExpiryKey, expiryTime.toString());
  }

  /**
   * Clears the stored token and expiry
   */
  private clearStoredToken(): void {
    localStorage.removeItem(accessTokenKey);
    localStorage.removeItem(tokenExpiryKey);
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
      code_verifier: codeVerifier,
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    try {
      const response: any = await this.http
        .post('https://accounts.spotify.com/api/token', body.toString(), {
          headers,
        })
        .toPromise();

      this.accessToken = response.access_token;

      // Store token with expiry time (expires_in is in seconds)
      const expiresIn = response.expires_in || 3600; // Default to 1 hour if not provided
      this.storeToken(this.accessToken, expiresIn);

      // Clean up: remove code verifier and clear URL params
      this.pkceService.clearCodeVerifier();
      localStorage.removeItem(stateKey);

      // Clean the URL to remove the authorization code
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  }

  /**
   * Logs out the user by clearing the stored token
   */
  logout(): void {
    this.accessToken = null;
    this.clearStoredToken();
  }

  /**
   * Sets the anniversary range (week or month) and updates the filter
   */
  setAnniversaryRange(range: 'week' | 'month'): void {
    this.anniversaryRange = range;
    this.anniversaryRange$.next(range);
    // Always update the chip label to reflect the new range
    // Since we're scrolling to the week section, it will show the week/month view
    this.currentFilterLabel = range === 'week' ? 'This Week' : 'This Month';
    // Close the dropdown
    this.dropdownOpen = false;
    // Scroll to top to show the updated anniversary section
    this.scrollToWeekSection();
  }

  /**
   * TrackBy function for artists to optimize ngFor rendering
   */
  trackByArtistId(index: number, artist: Artist): string {
    return artist.id;
  }

  /**
   * TrackBy function for albums to optimize ngFor rendering
   */
  trackByAlbumId(index: number, album: Album): string {
    return album.id;
  }

  /**
   * Scrolls to the week section at the top of the page
   */
  private scrollToWeekSection(): void {
    if (this.weekSection && this.weekSection.nativeElement) {
      const toolbarOffset = 64; // sticky toolbar height
      const elementPosition =
        this.weekSection.nativeElement.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - toolbarOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    } else {
      // Fallback: scroll to top of page if section not available yet
      window.scrollTo({
        top: 64, // Account for toolbar
        behavior: 'smooth',
      });
    }
  }
}
