/**
 * Custom TypeScript declarations for MusicKit JS v3.
 *
 * Note: @types/musickit-js only supports v1 and conflicts with v3.
 * These declarations provide typed access to the MusicKit v3 API.
 */

/**
 * MusicKit configuration options passed to MusicKit.configure()
 */
interface MusicKitConfiguration {
  developerToken: string;
  app: {
    name: string;
    build?: string;
    icon?: string;
  };
}

/**
 * Error interface for MusicKit errors
 */
interface MusicKitError {
  name: string;
  message: string;
  description?: string;
  errorCode?: string;
}

/**
 * MusicKit API interface for making authenticated requests
 */
interface MusicKitAPI {
  /**
   * Makes a request to the Apple Music API
   * @param path - API endpoint path (e.g., '/v1/me/library/artists')
   * @param params - Optional query parameters
   * @returns Promise resolving to API response
   */
  music(path: string, params?: object): Promise<any>;
}

/**
 * MusicKit instance returned by MusicKit.getInstance()
 */
interface MusicKitInstance {
  /**
   * Prompts user to authorize with Apple Music
   * @returns Promise resolving to Music User Token
   */
  authorize(): Promise<string>;

  /**
   * Removes user authorization
   */
  unauthorize(): Promise<void>;

  /**
   * Whether the user is currently authorized
   */
  isAuthorized: boolean;

  /**
   * The Music User Token for authenticated API calls
   */
  musicUserToken?: string;

  /**
   * API interface for making authenticated requests
   */
  api: MusicKitAPI;
}

/**
 * MusicKit static interface available on window.MusicKit
 */
interface MusicKitStatic {
  /**
   * Configures MusicKit with developer token and app info
   * @param config - Configuration options
   * @returns Promise resolving to MusicKit instance
   */
  configure(config: MusicKitConfiguration): Promise<MusicKitInstance>;

  /**
   * Gets the singleton MusicKit instance
   * @returns The configured MusicKit instance
   */
  getInstance(): MusicKitInstance;
}

/**
 * Extend Window interface to include MusicKit
 */
interface Window {
  MusicKit?: MusicKitStatic;
}
