import { TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { SpotifyService } from './spotify.service';
import { PkceService } from './pkce.service';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { ArtistCardComponent } from './artist-card/artist-card.component';
import { AlbumListItemComponent } from './album-list-item/album-list-item.component';
import { Functions } from '@angular/fire/functions';
import { MUSIC_SERVICE } from './services/music-service.token';
import { AppleMusicService } from './services/apple-music.service';
import { NotificationService } from './services/notification.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  let mockAppleMusicService: jasmine.SpyObj<AppleMusicService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(waitForAsync(() => {
    const spotifySpy = jasmine.createSpyObj('SpotifyService', [
      'loadArtistsWithAlbums',
    ]);
    const functionsSpy = {};

    mockAppleMusicService = jasmine.createSpyObj(
      'AppleMusicService',
      ['initialize', 'authorize', 'loadArtistsWithAlbums'],
      { artists: of([]) },
    );
    mockAppleMusicService.initialize.and.returnValue(Promise.resolve());
    mockAppleMusicService.authorize.and.returnValue(
      Promise.resolve('mock-user-token'),
    );
    mockAppleMusicService.loadArtistsWithAlbums.and.returnValue(of(true));

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showError',
      'showWarning',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: SpotifyService, useValue: spotifySpy },
        { provide: AppleMusicService, useValue: mockAppleMusicService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG },
        { provide: Functions, useValue: functionsSpy },
        PkceService,
        {
          provide: MUSIC_SERVICE,
          useFactory: (spotifyService: SpotifyService) => spotifyService,
          deps: [SpotifyService],
        },
      ],
      declarations: [AppComponent, ArtistCardComponent, AlbumListItemComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'spotify-demo'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toContain('Album anniversaries');
  });

  describe('loginAppleMusic', () => {
    it('should initialize AppleMusicService', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      // Spy on initObserverIfReady to prevent infinite setTimeout loop
      spyOn<any>(app, 'initObserverIfReady').and.stub();

      await app.loginAppleMusic();

      expect(mockAppleMusicService.initialize).toHaveBeenCalled();
    });

    it('should call authorize after initialization', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      spyOn<any>(app, 'initObserverIfReady').and.stub();

      await app.loginAppleMusic();

      expect(mockAppleMusicService.authorize).toHaveBeenCalled();
    });

    it('should set activeProvider to apple on success', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      spyOn<any>(app, 'initObserverIfReady').and.stub();

      expect(app.activeProvider).toBeNull();

      await app.loginAppleMusic();

      expect(app.activeProvider).toBe('apple');
    });

    it('should set accessToken to user token on success', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      spyOn<any>(app, 'initObserverIfReady').and.stub();

      await app.loginAppleMusic();

      expect(app.accessToken).toBe('mock-user-token');
    });

    it('should call loadArtistsWithAlbums with user token', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      spyOn<any>(app, 'initObserverIfReady').and.stub();

      await app.loginAppleMusic();

      expect(mockAppleMusicService.loadArtistsWithAlbums).toHaveBeenCalledWith(
        'mock-user-token',
      );
    });

    it('should handle errors gracefully', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      spyOn<any>(app, 'initObserverIfReady').and.stub();

      mockAppleMusicService.initialize.and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      await app.loginAppleMusic();

      expect(app.appleMusicLoading).toBe(false);
      expect(app.activeProvider).toBeNull();
    });

    it('should set appleMusicLoading to true during login', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      // Create a pending promise that never resolves
      mockAppleMusicService.initialize.and.returnValue(new Promise(() => {}));

      // Start the login but don't await it
      app.loginAppleMusic();

      expect(app.appleMusicLoading).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear all Spotify tokens', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      // Set Spotify tokens
      localStorage.setItem('spotify_access_token', 'test-spotify-token');
      localStorage.setItem('spotify_token_expiry', '123456789');

      app.logout();

      expect(localStorage.getItem('spotify_access_token')).toBeNull();
      expect(localStorage.getItem('spotify_token_expiry')).toBeNull();
    });

    it('should clear all Apple Music tokens', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      // Set Apple Music tokens
      sessionStorage.setItem('apple_music_token', 'test-apple-token');
      sessionStorage.setItem('apple_music_token_expiry', '987654321');

      app.logout();

      expect(sessionStorage.getItem('apple_music_token')).toBeNull();
      expect(sessionStorage.getItem('apple_music_token_expiry')).toBeNull();
    });

    it('should reset activeProvider to null', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      app.activeProvider = 'spotify';
      app.logout();

      expect(app.activeProvider).toBeNull();
    });

    it('should reset accessToken to null', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      app.accessToken = 'test-token';
      app.logout();

      expect(app.accessToken).toBeNull();
    });

    it('should show success notification', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      app.logout();

      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith(
        'Logged out successfully',
      );
    });
  });

  // it('should render title in a h1 tag', () => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
  //   const compiled = fixture.debugElement.nativeElement;
  //   expect(compiled.querySelector('h1').textContent).toContain(
  //     'Welcome to spotify-demo!'
  //   );
  // });
});
