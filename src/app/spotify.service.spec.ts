import { TestBed } from '@angular/core/testing';

import { HttpClientModule } from '@angular/common/http';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { SpotifyService } from './spotify.service';

describe('SpotifyService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [{ provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG }]
    })
  );

  it('should be created', () => {
    const service: SpotifyService = TestBed.get(SpotifyService);
    expect(service).toBeTruthy();
  });
});
