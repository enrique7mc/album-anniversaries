import { InjectionToken } from '@angular/core';
import { environment } from '../environments/environment';

export interface AppConfig {
  title: string;
  redirectUrl: string;
  isDev: boolean;
}

export const SPOTIFY_APP_CONFIG: AppConfig = {
  title: environment.spotify.title,
  redirectUrl: environment.spotify.redirectUrl,
  isDev: false
};

export const APP_CONFIG = new InjectionToken<AppConfig>('spotify-app.config');
