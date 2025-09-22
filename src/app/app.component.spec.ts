import { TestBed, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { MaterialModule } from './material/material.module';
import { SpotifyService } from './spotify.service';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { ArtistCardComponent } from './artist-card/artist-card.component';
import { AlbumListItemComponent } from './album-list-item/album-list-item.component';
import { Functions } from '@angular/fire/functions';

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    const spy = jasmine.createSpyObj('SpotifyService', [
      'loadArtistsWithAlbums',
    ]);
    const functionsSpy = {};

    TestBed.configureTestingModule({
      imports: [MaterialModule],
      providers: [
        { provide: SpotifyService, useValue: spy },
        { provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG },
        { provide: Functions, useValue: functionsSpy },
      ],
      declarations: [AppComponent, ArtistCardComponent, AlbumListItemComponent],
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

  // it('should render title in a h1 tag', () => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
  //   const compiled = fixture.debugElement.nativeElement;
  //   expect(compiled.querySelector('h1').textContent).toContain(
  //     'Welcome to spotify-demo!'
  //   );
  // });
});
