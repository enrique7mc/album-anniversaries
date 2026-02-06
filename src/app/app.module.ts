import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppComponent } from './app.component';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { ArtistCardComponent } from './artist-card/artist-card.component';
import { AlbumListItemComponent } from './album-list-item/album-list-item.component';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { environment } from '../environments/environment';
import { MUSIC_SERVICE } from './services/music-service.token';
import { SpotifyService } from './spotify.service';
import { AppleMusicService } from './services/apple-music.service';
import { MusicKitLoaderService } from './services/musickit-loader.service';
import {
  LucideAngularModule,
  Disc,
  LogOut,
  ChevronDown,
  Check,
  ListMusic,
  Clock,
  LogIn,
  Music,
  ArrowUp,
} from 'lucide-angular';

@NgModule({
  declarations: [AppComponent, ArtistCardComponent, AlbumListItemComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatSnackBarModule,
    LucideAngularModule.pick({
      Disc,
      LogOut,
      ChevronDown,
      Check,
      ListMusic,
      Clock,
      LogIn,
      Music,
      ArrowUp,
    }),
  ],
  providers: [
    { provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG },
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFunctions(() => getFunctions()),
    SpotifyService,
    AppleMusicService,
    MusicKitLoaderService,
    {
      provide: MUSIC_SERVICE,
      useFactory: (
        spotifyService: SpotifyService,
        appleMusicService: AppleMusicService,
      ) => {
        // Default to Spotify - provider switching handled at runtime in AppComponent
        return spotifyService;
      },
      deps: [SpotifyService, AppleMusicService],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
