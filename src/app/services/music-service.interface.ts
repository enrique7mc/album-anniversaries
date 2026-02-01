import { Observable } from 'rxjs';
import { Artist } from '../artist';

/**
 * Provider-agnostic interface for music services.
 * Both SpotifyService and AppleMusicService implement this interface,
 * enabling components to work with any music provider.
 */
export interface MusicService {
  /**
   * Observable of artists with their albums.
   * Emits updated artist list as data loads progressively.
   */
  readonly artists: Observable<Artist[]>;

  /**
   * Loads artists and their albums from the music provider API.
   * @param accessToken - The OAuth access token for API authentication
   * @returns Observable that emits true when complete, false on error
   */
  loadArtistsWithAlbums(accessToken: string): Observable<boolean>;
}
