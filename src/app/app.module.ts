import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { ArtistCardComponent } from './artist-card/artist-card.component';
import { AlbumListItemComponent } from './album-list-item/album-list-item.component';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { environment } from '../environments/environment';
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
    HttpClientModule,
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
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
