import { InjectionToken } from '@angular/core';

export interface AppConfig {
  title: string;
  redirectUrl: string;
  isDev: boolean;
}

export const SPOTIFY_APP_CONFIG: AppConfig = {
  title: 'Album anniversaries!',
  redirectUrl: 'https://album-anniversaries.firebaseapp.com/',
  isDev: false
};

export const APP_CONFIG = new InjectionToken<AppConfig>('spotify-app.config');
