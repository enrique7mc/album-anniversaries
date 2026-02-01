import { InjectionToken } from '@angular/core';
import { MusicService } from './music-service.interface';

/**
 * Injection token for MusicService.
 * Components inject this token to get the configured music provider
 * (SpotifyService or AppleMusicService) based on app configuration.
 */
export const MUSIC_SERVICE = new InjectionToken<MusicService>('MusicService');
