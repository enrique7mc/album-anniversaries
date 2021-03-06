import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material/material.module';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { ArtistCardComponent } from './artist-card/artist-card.component';
import { AlbumListItemComponent } from './album-list-item/album-list-item.component';
import { AngularFireModule } from '@angular/fire';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent, ArtistCardComponent, AlbumListItemComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,

    MaterialModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireFunctionsModule
  ],
  providers: [{ provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG }],
  bootstrap: [AppComponent]
})
export class AppModule {}
