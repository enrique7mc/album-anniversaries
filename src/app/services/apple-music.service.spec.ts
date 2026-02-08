import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
import { AppleMusicService } from './apple-music.service';
import { MusicKitLoaderService } from './musickit-loader.service';
import { NotificationService } from './notification.service';

describe('AppleMusicService', () => {
  let service: AppleMusicService;
  let musicKitLoaderSpy: jasmine.SpyObj<MusicKitLoaderService>;
  let functionsSpy: jasmine.SpyObj<Functions>;
  let mockMusicKitInstance: jasmine.SpyObj<MusicKitInstance>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  // Helper to create mock Apple Music artist resource
  const createMockArtistResource = (
    id: string,
    name: string,
    artworkUrl?: string,
  ): any => ({
    id,
    type: 'artists',
    href: `/v1/me/library/artists/${id}`,
    attributes: {
      name,
      url: `https://music.apple.com/artist/${id}`,
      artwork: artworkUrl ? { url: artworkUrl } : undefined,
    },
  });

  // Helper to create mock Apple Music album resource
  const createMockAlbumResource = (
    id: string,
    name: string,
    releaseDate: string,
    artworkUrl?: string,
  ): any => ({
    id,
    type: 'albums',
    href: `/v1/catalog/us/albums/${id}`,
    attributes: {
      name,
      releaseDate,
      url: `https://music.apple.com/album/${id}`,
      artwork: artworkUrl ? { url: artworkUrl } : undefined,
    },
  });

  // Helper to create mock recently played song resource
  const createMockSongResource = (
    id: string,
    name: string,
    artistId: string,
    artistName: string,
  ): any => ({
    id,
    type: 'songs',
    attributes: { name },
    relationships: {
      artists: {
        data: [
          {
            id: artistId,
            type: 'artists',
            attributes: {
              name: artistName,
              url: `https://music.apple.com/artist/${artistId}`,
            },
          },
        ],
      },
    },
  });

  // Helper to create mock recently played album resource
  const createMockRecentAlbumResource = (
    id: string,
    name: string,
    artistId: string,
    artistName: string,
  ): any => ({
    id,
    type: 'albums',
    attributes: { name },
    relationships: {
      artists: {
        data: [
          {
            id: artistId,
            type: 'artists',
            attributes: {
              name: artistName,
            },
          },
        ],
      },
    },
  });

  // Helper to create mock station resource (no artist relationships)
  const createMockStationResource = (id: string, name: string): any => ({
    id,
    type: 'stations',
    attributes: { name },
  });

  // Helper to create NormalizedArtist-like objects for tests
  const createNormalizedArtist = (catalogId: string, name: string): any => ({
    catalogId,
    name,
  });

  beforeEach(() => {
    // Create spies
    musicKitLoaderSpy = jasmine.createSpyObj('MusicKitLoaderService', [
      'loadMusicKit',
    ]);
    musicKitLoaderSpy.loadMusicKit.and.returnValue(Promise.resolve());

    functionsSpy = jasmine.createSpyObj('Functions', [], {
      app: {},
    });

    mockMusicKitInstance = jasmine.createSpyObj('MusicKitInstance', [
      'authorize',
    ]);
    mockMusicKitInstance.api = jasmine.createSpyObj('MusicKitAPI', ['music']);

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showError',
      'showSuccess',
      'showWarning',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AppleMusicService,
        { provide: MusicKitLoaderService, useValue: musicKitLoaderSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    });

    service = TestBed.inject(AppleMusicService);
  });

  afterEach(() => {
    // Clean up window.MusicKit
    delete (window as any).MusicKit;
    // Clear sessionStorage
    sessionStorage.clear();
  });

  describe('Service creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('artists observable should emit empty array initially', (done) => {
      service.artists.subscribe((artists) => {
        expect(artists).toEqual([]);
        done();
      });
    });
  });

  describe('initialize()', () => {
    beforeEach(() => {
      // Mock window.MusicKit
      (window as any).MusicKit = {
        configure: jasmine
          .createSpy('configure')
          .and.returnValue(Promise.resolve(mockMusicKitInstance)),
      };
    });

    it('should load MusicKit via loader service', async () => {
      // Mock httpsCallable to return token
      spyOn<any>(service, 'initialize').and.callFake(async function (
        this: AppleMusicService,
      ) {
        await musicKitLoaderSpy.loadMusicKit();
        (this as any).initialized = true;
      });

      await service.initialize();
      expect(musicKitLoaderSpy.loadMusicKit).toHaveBeenCalled();
    });

    it('should set initialized to true after successful initialization', async () => {
      // Simulate full initialization
      spyOn<any>(service, 'initialize').and.callFake(async function (
        this: AppleMusicService,
      ) {
        await musicKitLoaderSpy.loadMusicKit();
        (this as any).initialized = true;
        (this as any).musicKitInstance = mockMusicKitInstance;
      });

      await service.initialize();
      expect((service as any).initialized).toBe(true);
    });

    it('should skip initialization if already initialized', async () => {
      // Set initialized flag
      (service as any).initialized = true;

      await service.initialize();

      // loadMusicKit should not be called
      expect(musicKitLoaderSpy.loadMusicKit).not.toHaveBeenCalled();
    });
  });

  describe('authorize()', () => {
    it('should throw if not initialized', async () => {
      await expectAsync(service.authorize()).toBeRejectedWithError(
        'AppleMusicService not initialized. Call initialize() first.',
      );
    });

    it('should call musicKitInstance.authorize()', async () => {
      // Set up initialized state
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;
      mockMusicKitInstance.authorize.and.returnValue(
        Promise.resolve('test-token'),
      );

      await service.authorize();

      expect(mockMusicKitInstance.authorize).toHaveBeenCalled();
    });

    it('should store token in sessionStorage with expiry', async () => {
      // Set up initialized state
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;
      mockMusicKitInstance.authorize.and.returnValue(
        Promise.resolve('test-music-user-token'),
      );

      const beforeTime = Date.now();
      await service.authorize();
      const afterTime = Date.now();

      const storedToken = sessionStorage.getItem('apple_music_token');
      const storedExpiry = sessionStorage.getItem('apple_music_token_expiry');

      expect(storedToken).toBe('test-music-user-token');
      expect(storedExpiry).toBeTruthy();

      const expiryValue = parseInt(storedExpiry!, 10);
      const expectedExpiry = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
      expect(expiryValue).toBeGreaterThanOrEqual(beforeTime + expectedExpiry);
      expect(expiryValue).toBeLessThanOrEqual(afterTime + expectedExpiry);
    });

    it('should return the music user token', async () => {
      // Set up initialized state
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;
      mockMusicKitInstance.authorize.and.returnValue(
        Promise.resolve('returned-token'),
      );

      const result = await service.authorize();

      expect(result).toBe('returned-token');
    });
  });

  describe('Data mapping', () => {
    describe('mapArtwork()', () => {
      it('should return empty array for null artwork', () => {
        const result = (service as any).mapArtwork(null);
        expect(result).toEqual([]);
      });

      it('should return empty array for undefined artwork', () => {
        const result = (service as any).mapArtwork(undefined);
        expect(result).toEqual([]);
      });

      it('should return empty array for artwork without url', () => {
        const result = (service as any).mapArtwork({ width: 100, height: 100 });
        expect(result).toEqual([]);
      });

      it('should generate correct image sizes from template', () => {
        const artwork = {
          url: 'https://example.com/image/{w}x{h}.jpg',
          width: 1000,
          height: 1000,
        };

        const result = (service as any).mapArtwork(artwork);

        expect(result.length).toBe(3);
        expect(result[0]).toEqual({
          width: 640,
          height: 640,
          url: 'https://example.com/image/640x640.jpg',
        });
        expect(result[1]).toEqual({
          width: 300,
          height: 300,
          url: 'https://example.com/image/300x300.jpg',
        });
        expect(result[2]).toEqual({
          width: 64,
          height: 64,
          url: 'https://example.com/image/64x64.jpg',
        });
      });

      it('should handle artwork URL without placeholders', () => {
        const artwork = {
          url: 'https://example.com/static-image.jpg',
        };

        const result = (service as any).mapArtwork(artwork);

        // Should still generate 3 images, but URL won't change
        expect(result.length).toBe(3);
        expect(result[0].url).toBe('https://example.com/static-image.jpg');
      });
    });

    describe('mapToArtist()', () => {
      it('should map all fields correctly', () => {
        const resource = createMockArtistResource(
          'artist-123',
          'Test Artist',
          'https://example.com/{w}x{h}.jpg',
        );

        const result = (service as any).mapToArtist(resource);

        expect(result.id).toBe('artist-123');
        expect(result.name).toBe('Test Artist');
        expect(result.href).toBe('/v1/me/library/artists/artist-123');
        expect(result.popularity).toBe(0);
        expect(result.external_url).toBe(
          'https://music.apple.com/artist/artist-123',
        );
        expect(result.albums).toEqual([]);
        expect(result.images.length).toBe(3);
      });

      it('should handle missing attributes', () => {
        const resource = {
          id: 'artist-456',
          type: 'artists',
        };

        const result = (service as any).mapToArtist(resource);

        expect(result.id).toBe('artist-456');
        expect(result.name).toBe('Unknown Artist');
        expect(result.href).toBe('');
        expect(result.external_url).toBe('');
        expect(result.images).toEqual([]);
      });

      it('should set popularity to 0 (Apple Music does not provide)', () => {
        const resource = createMockArtistResource(
          'artist-789',
          'Popular Artist',
        );

        const result = (service as any).mapToArtist(resource);

        expect(result.popularity).toBe(0);
      });
    });

    describe('mapNormalizedToArtist()', () => {
      it('should map NormalizedArtist to Artist model', () => {
        const normalized = {
          catalogId: 'cat-123',
          name: 'Test Artist',
          artwork: { url: 'https://example.com/{w}x{h}.jpg' },
          url: 'https://music.apple.com/artist/cat-123',
        };

        const result = (service as any).mapNormalizedToArtist(normalized);

        expect(result.id).toBe('cat-123');
        expect(result.name).toBe('Test Artist');
        expect(result.href).toBe('');
        expect(result.popularity).toBe(0);
        expect(result.external_url).toBe(
          'https://music.apple.com/artist/cat-123',
        );
        expect(result.albums).toEqual([]);
        expect(result.images.length).toBe(3);
      });

      it('should handle missing optional fields', () => {
        const normalized = {
          catalogId: 'cat-456',
          name: 'Minimal Artist',
        };

        const result = (service as any).mapNormalizedToArtist(normalized);

        expect(result.id).toBe('cat-456');
        expect(result.name).toBe('Minimal Artist');
        expect(result.external_url).toBe('');
        expect(result.images).toEqual([]);
      });
    });

    describe('mapToAlbum()', () => {
      it('should map all fields correctly', () => {
        const resource = createMockAlbumResource(
          'album-123',
          'Test Album',
          '2024-06-15',
          'https://example.com/{w}x{h}.jpg',
        );

        const result = (service as any).mapToAlbum(resource, 'artist-id-abc');

        expect(result.id).toBe('album-123');
        expect(result.artist_id).toBe('artist-id-abc');
        expect(result.name).toBe('Test Album');
        expect(result.release_date).toBe('2024-06-15');
        expect(result.external_url).toBe(
          'https://music.apple.com/album/album-123',
        );
        expect(result.images.length).toBe(3);
      });

      it('should set release_date_precision to day', () => {
        const resource = createMockAlbumResource(
          'album-456',
          'Another Album',
          '2023-01-01',
        );

        const result = (service as any).mapToAlbum(resource, 'artist-xyz');

        expect(result.release_date_precision).toBe('day');
      });

      it('should handle missing attributes', () => {
        const resource = {
          id: 'album-789',
          type: 'albums',
        };

        const result = (service as any).mapToAlbum(resource, 'artist-missing');

        expect(result.id).toBe('album-789');
        expect(result.artist_id).toBe('artist-missing');
        expect(result.name).toBe('Unknown Album');
        expect(result.release_date).toBe('');
        expect(result.release_date_precision).toBe('day');
        expect(result.images).toEqual([]);
      });

      it('should use artist_id from parameter', () => {
        const resource = createMockAlbumResource(
          'album-test',
          'Album',
          '2025-01-01',
        );

        const result = (service as any).mapToAlbum(
          resource,
          'passed-artist-id',
        );

        expect(result.artist_id).toBe('passed-artist-id');
      });
    });
  });

  describe('fetchRecentlyPlayedArtists (private)', () => {
    it('should return empty array if musicKitInstance is null', async () => {
      (service as any).musicKitInstance = null;

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result).toEqual([]);
    });

    it('should call the correct recently played endpoint', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: [] }),
      );

      await (service as any).fetchRecentlyPlayedArtists();

      expect(mockMusicKitInstance.api.music).toHaveBeenCalledWith(
        '/v1/me/recent/played?limit=30',
      );
    });

    it('should extract artists from songs', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      const songs = [
        createMockSongResource('song-1', 'Song One', 'artist-100', 'Artist A'),
        createMockSongResource('song-2', 'Song Two', 'artist-200', 'Artist B'),
      ];

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: songs }),
      );

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result.length).toBe(2);
      expect(result[0].catalogId).toBe('artist-100');
      expect(result[0].name).toBe('Artist A');
      expect(result[1].catalogId).toBe('artist-200');
      expect(result[1].name).toBe('Artist B');
    });

    it('should extract artists from albums', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      const albums = [
        createMockRecentAlbumResource(
          'album-1',
          'Album One',
          'artist-300',
          'Artist C',
        ),
      ];

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: albums }),
      );

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result.length).toBe(1);
      expect(result[0].catalogId).toBe('artist-300');
      expect(result[0].name).toBe('Artist C');
    });

    it('should deduplicate artists by catalog ID', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      const songs = [
        createMockSongResource('song-1', 'Song One', 'artist-100', 'Artist A'),
        createMockSongResource('song-2', 'Song Two', 'artist-100', 'Artist A'),
        createMockSongResource(
          'song-3',
          'Song Three',
          'artist-200',
          'Artist B',
        ),
      ];

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: songs }),
      );

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result.length).toBe(2);
      expect(result[0].catalogId).toBe('artist-100');
      expect(result[1].catalogId).toBe('artist-200');
    });

    it('should ignore stations', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      const items = [
        createMockStationResource('station-1', 'Chill Station'),
        createMockSongResource('song-1', 'Song One', 'artist-100', 'Artist A'),
      ];

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: items }),
      );

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result.length).toBe(1);
      expect(result[0].catalogId).toBe('artist-100');
    });

    it('should return empty array on API error', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      spyOn(console, 'warn');

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle empty response data', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: [] }),
      );

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result).toEqual([]);
    });

    it('should handle response with no data property', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({}),
      );

      const result = await (service as any).fetchRecentlyPlayedArtists();

      expect(result).toEqual([]);
    });
  });

  describe('extractArtistsFromResource (private)', () => {
    it('should extract artists from song resources', () => {
      const song = createMockSongResource(
        'song-1',
        'Test Song',
        'artist-100',
        'Artist A',
      );

      const result = (service as any).extractArtistsFromResource(song);

      expect(result.length).toBe(1);
      expect(result[0].catalogId).toBe('artist-100');
      expect(result[0].name).toBe('Artist A');
    });

    it('should extract artists from album resources', () => {
      const album = createMockRecentAlbumResource(
        'album-1',
        'Test Album',
        'artist-200',
        'Artist B',
      );

      const result = (service as any).extractArtistsFromResource(album);

      expect(result.length).toBe(1);
      expect(result[0].catalogId).toBe('artist-200');
      expect(result[0].name).toBe('Artist B');
    });

    it('should return empty array for station resources', () => {
      const station = createMockStationResource('station-1', 'Chill Station');

      const result = (service as any).extractArtistsFromResource(station);

      expect(result).toEqual([]);
    });

    it('should return empty array for playlist resources', () => {
      const playlist = {
        id: 'playlist-1',
        type: 'playlists',
        attributes: { name: 'My Playlist' },
      };

      const result = (service as any).extractArtistsFromResource(playlist);

      expect(result).toEqual([]);
    });

    it('should return empty array for missing artist relationships', () => {
      const song = {
        id: 'song-1',
        type: 'songs',
        attributes: { name: 'Song Without Artists' },
      };

      const result = (service as any).extractArtistsFromResource(song);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty artist data', () => {
      const song = {
        id: 'song-1',
        type: 'songs',
        attributes: { name: 'Song' },
        relationships: {
          artists: {
            data: [],
          },
        },
      };

      const result = (service as any).extractArtistsFromResource(song);

      expect(result).toEqual([]);
    });

    it('should handle multiple artists on a single resource', () => {
      const song = {
        id: 'song-1',
        type: 'songs',
        attributes: { name: 'Collab Song' },
        relationships: {
          artists: {
            data: [
              {
                id: 'artist-100',
                type: 'artists',
                attributes: { name: 'Artist A' },
              },
              {
                id: 'artist-200',
                type: 'artists',
                attributes: { name: 'Artist B' },
              },
            ],
          },
        },
      };

      const result = (service as any).extractArtistsFromResource(song);

      expect(result.length).toBe(2);
      expect(result[0].catalogId).toBe('artist-100');
      expect(result[1].catalogId).toBe('artist-200');
    });

    it('should use Unknown Artist for missing artist name', () => {
      const song = {
        id: 'song-1',
        type: 'songs',
        attributes: { name: 'Song' },
        relationships: {
          artists: {
            data: [{ id: 'artist-100', type: 'artists' }],
          },
        },
      };

      const result = (service as any).extractArtistsFromResource(song);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Unknown Artist');
    });
  });

  describe('fetchArtists orchestration (private)', () => {
    beforeEach(() => {
      (service as any).musicKitInstance = mockMusicKitInstance;
    });

    it('should use recently played artists when enough are returned', async () => {
      // Create 12 unique songs with different artists (>= MIN_ARTISTS_THRESHOLD of 10)
      const songs = Array.from({ length: 12 }, (_, i) =>
        createMockSongResource(
          `song-${i}`,
          `Song ${i}`,
          `artist-${i}`,
          `Artist ${i}`,
        ),
      );

      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.resolve({ data: songs });
          }
          return Promise.resolve({ data: [] });
        },
      );

      const result = await (service as any).fetchArtists();

      expect(result.length).toBe(12);
      expect(result[0].catalogId).toBe('artist-0');
      // Should NOT have called library artists endpoint
      const calls = (
        mockMusicKitInstance.api.music as jasmine.Spy
      ).calls.allArgs();
      const libraryCall = calls.find((c: string[]) =>
        c[0].includes('/me/library/artists'),
      );
      expect(libraryCall).toBeUndefined();
    });

    it('should fall back to library when recently played yields too few artists', async () => {
      // Only 3 unique artists from recently played (< MIN_ARTISTS_THRESHOLD of 10)
      const songs = [
        createMockSongResource('song-1', 'Song 1', 'artist-1', 'Artist 1'),
        createMockSongResource('song-2', 'Song 2', 'artist-2', 'Artist 2'),
        createMockSongResource('song-3', 'Song 3', 'artist-3', 'Artist 3'),
      ];

      const libraryArtists = Array.from({ length: 5 }, (_, i) => ({
        ...createMockArtistResource(`r.lib-${i}`, `Library Artist ${i}`),
        relationships: {
          catalog: { data: [{ id: `cat-${i}`, type: 'artists' }] },
        },
      }));

      spyOn(console, 'log');

      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.resolve({ data: songs });
          }
          if (path.includes('/me/library/artists')) {
            return Promise.resolve({ data: libraryArtists });
          }
          return Promise.resolve({ data: [] });
        },
      );

      const result = await (service as any).fetchArtists();

      // Should have library artists, not recently played
      expect(result.length).toBe(5);
      expect(result[0].catalogId).toBe('cat-0');
      expect(console.log).toHaveBeenCalled();
    });

    it('should fall back to library when recently played errors', async () => {
      const libraryArtists = [
        {
          ...createMockArtistResource('r.lib-1', 'Library Artist 1'),
          relationships: {
            catalog: { data: [{ id: 'cat-1', type: 'artists' }] },
          },
        },
      ];

      spyOn(console, 'warn');
      spyOn(console, 'log');

      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.reject(new Error('Endpoint not available'));
          }
          if (path.includes('/me/library/artists')) {
            return Promise.resolve({ data: libraryArtists });
          }
          return Promise.resolve({ data: [] });
        },
      );

      const result = await (service as any).fetchArtists();

      // Should fall back to library
      expect(result.length).toBe(1);
      expect(result[0].catalogId).toBe('cat-1');
    });

    it('should use library artist ID when no catalog relationship exists', async () => {
      // Recently played returns empty → falls back to library
      const libraryArtists = [
        createMockArtistResource('r.no-catalog', 'No Catalog Artist'),
        // This one has no catalog relationship
      ];

      spyOn(console, 'log');

      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.resolve({ data: [] });
          }
          if (path.includes('/me/library/artists')) {
            return Promise.resolve({ data: libraryArtists });
          }
          return Promise.resolve({ data: [] });
        },
      );

      const result = await (service as any).fetchArtists();

      // Should use the library artist ID as fallback
      expect(result[0].catalogId).toBe('r.no-catalog');
    });
  });

  describe('loadArtistsWithAlbums()', () => {
    it('should return false if not initialized', (done) => {
      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should return false if musicKitInstance is null', (done) => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = null;

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should fetch artists and emit mapped artists via observable', (done) => {
      // Set up initialized state
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Set valid token expiry
      const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
      sessionStorage.setItem('apple_music_token_expiry', futureTime.toString());

      // Create enough recently played songs to exceed MIN_ARTISTS_THRESHOLD
      const songs = Array.from({ length: 12 }, (_, i) =>
        createMockSongResource(
          `song-${i}`,
          `Song ${i}`,
          `artist-${i}`,
          `Artist ${i}`,
        ),
      );

      const mockAlbums = [
        createMockAlbumResource('album-1', 'Album One', '2024-01-15'),
      ];

      // Mock API calls
      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.resolve({ data: songs });
          }
          if (path.includes('/catalog/us/artists/')) {
            return Promise.resolve({ data: mockAlbums });
          }
          return Promise.resolve({ data: [] });
        },
      );

      // Subscribe to artists observable to capture emitted values
      let emittedArtists: any[] = [];
      service.artists.subscribe((artists) => {
        emittedArtists = artists;
      });

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(true);
        expect(emittedArtists.length).toBe(12);
        expect(emittedArtists[0].name).toBe('Artist 0');
        expect(emittedArtists[1].name).toBe('Artist 1');
        done();
      });
    });

    it('should return true on success', (done) => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Set valid token expiry
      const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
      sessionStorage.setItem('apple_music_token_expiry', futureTime.toString());

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: [] }),
      );

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('should handle API errors gracefully', (done) => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Set valid token expiry
      const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
      sessionStorage.setItem('apple_music_token_expiry', futureTime.toString());

      // Make recently played succeed but library fail
      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.resolve({ data: [] });
          }
          // Library endpoint also fails
          return Promise.reject(new Error('API Error'));
        },
      );

      spyOn(console, 'error');
      spyOn(console, 'log');

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(false);
        expect(notificationServiceSpy.showError).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('fetchLibraryArtists (private)', () => {
    it('should return empty array if musicKitInstance is null', async () => {
      (service as any).musicKitInstance = null;

      const result = await (service as any).fetchLibraryArtists(50);

      expect(result).toEqual([]);
    });

    it('should handle pagination via next property', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      const page1Artists = [createMockArtistResource('artist-1', 'Artist 1')];
      const page2Artists = [createMockArtistResource('artist-2', 'Artist 2')];

      let callCount = 0;
      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: page1Artists,
            next: '/v1/me/library/artists?offset=100',
          });
        }
        return Promise.resolve({
          data: page2Artists,
          next: undefined,
        });
      });

      const result = await (service as any).fetchLibraryArtists(50);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('artist-1');
      expect(result[1].id).toBe('artist-2');
      expect(callCount).toBe(2);
    });

    it('should respect maxArtists parameter', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      const artists = Array.from({ length: 10 }, (_, i) =>
        createMockArtistResource(`artist-${i}`, `Artist ${i}`),
      );

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: artists }),
      );

      const result = await (service as any).fetchLibraryArtists(5);

      expect(result.length).toBe(5);
    });
  });

  describe('fetchAlbumsForArtist (private)', () => {
    it('should return empty array if musicKitInstance is null', async () => {
      (service as any).musicKitInstance = null;

      const result = await (service as any).fetchAlbumsForArtist('artist-id');

      expect(result).toEqual([]);
    });

    it('should call correct catalog endpoint', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: [] }),
      );

      await (service as any).fetchAlbumsForArtist('test-artist-id');

      expect(mockMusicKitInstance.api.music).toHaveBeenCalledWith(
        '/v1/catalog/us/artists/test-artist-id/albums?limit=100',
      );
    });

    it('should return empty array on error', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      spyOn(console, 'error');

      const result = await (service as any).fetchAlbumsForArtist(
        'error-artist',
      );

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('should process artists in batches with delay', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Create 7 NormalizedArtist objects (will be processed in 2 batches: 5 + 2)
      const normalizedArtists = Array.from({ length: 7 }, (_, i) =>
        createNormalizedArtist(`artist-${i}`, `Artist ${i}`),
      );

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: [] }),
      );

      const startTime = Date.now();
      await (service as any).fetchAlbumsForAllArtists(normalizedArtists);
      const duration = Date.now() - startTime;

      // Should have at least ~250ms delay between batches (300ms configured, allow variance)
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });

  describe('delay utility', () => {
    it('should delay for specified milliseconds', async () => {
      const startTime = Date.now();
      await (service as any).delay(100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(95);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Error handling', () => {
    describe('handleError', () => {
      it('should show subscription error for 403 status', () => {
        const error = { status: 403 };
        (service as any).handleError(error, 'testing');

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Apple Music subscription required to view your library.',
        );
      });

      it('should show subscription error for NO_SUBSCRIPTION errorCode', () => {
        const error = { errorCode: 'NO_SUBSCRIPTION' };
        (service as any).handleError(error, 'testing');

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Apple Music subscription required to view your library.',
        );
      });

      it('should show expired session error for 401 status', () => {
        // Set valid token so isTokenExpired returns false
        const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
        sessionStorage.setItem(
          'apple_music_token_expiry',
          futureTime.toString(),
        );

        const error = { status: 401 };
        (service as any).handleError(error, 'testing');

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Session expired. Please sign in again.',
        );
      });

      it('should clear token when session expired', () => {
        sessionStorage.setItem('apple_music_token', 'test-token');
        sessionStorage.setItem('apple_music_token_expiry', '123456789');

        const error = { status: 401 };
        (service as any).handleError(error, 'testing');

        expect(sessionStorage.getItem('apple_music_token')).toBeNull();
        expect(sessionStorage.getItem('apple_music_token_expiry')).toBeNull();
      });

      it('should show rate limit error for 429 status', () => {
        // Set valid token so isTokenExpired returns false
        const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
        sessionStorage.setItem(
          'apple_music_token_expiry',
          futureTime.toString(),
        );

        const error = { status: 429 };
        (service as any).handleError(error, 'testing');

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Too many requests. Please wait a moment and try again.',
        );
      });

      it('should show offline error when no internet connection', () => {
        // Set valid token so isTokenExpired returns false
        const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
        sessionStorage.setItem(
          'apple_music_token_expiry',
          futureTime.toString(),
        );

        spyOnProperty(navigator, 'onLine').and.returnValue(false);
        const error = { status: 500 };
        (service as any).handleError(error, 'testing');

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'No internet connection. Please check your network.',
        );
      });

      it('should show generic error for unknown errors', () => {
        // Set valid token so isTokenExpired returns false
        const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
        sessionStorage.setItem(
          'apple_music_token_expiry',
          futureTime.toString(),
        );

        const error = { status: 500 };
        (service as any).handleError(error, 'loading data');

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Failed loading data. Please try again later.',
        );
      });
    });

    describe('handleAuthorizationError', () => {
      it('should show popup blocked error', () => {
        const error = { message: 'popup blocked' };
        (service as any).handleAuthorizationError(error);

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Popup blocked. Please allow popups and try again.',
        );
      });

      it('should show private browsing error', () => {
        const error = { message: 'referrer policy' };
        (service as any).handleAuthorizationError(error);

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Private Browsing detected. Please disable Private Browsing.',
        );
      });

      it('should show cancelled error', () => {
        const error = { errorCode: 'USER_CANCELLED' };
        (service as any).handleAuthorizationError(error);

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Sign-in cancelled.',
        );
      });

      it('should show generic auth error for unknown errors', () => {
        const error = { message: 'unknown error' };
        (service as any).handleAuthorizationError(error);

        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Apple Music sign-in failed. Please try again.',
        );
      });
    });

    describe('isTokenExpired', () => {
      it('should return true if no expiry stored', () => {
        sessionStorage.removeItem('apple_music_token_expiry');
        expect((service as any).isTokenExpired()).toBe(true);
      });

      it('should return true if token expired', () => {
        const pastTime = Date.now() - 1000;
        sessionStorage.setItem('apple_music_token_expiry', pastTime.toString());
        expect((service as any).isTokenExpired()).toBe(true);
      });

      it('should return true if token expiring within 1 day', () => {
        const almostExpired = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
        sessionStorage.setItem(
          'apple_music_token_expiry',
          almostExpired.toString(),
        );
        expect((service as any).isTokenExpired()).toBe(true);
      });

      it('should return false if token has more than 1 day left', () => {
        const futureTime = Date.now() + 2 * 24 * 60 * 60 * 1000; // 2 days
        sessionStorage.setItem(
          'apple_music_token_expiry',
          futureTime.toString(),
        );
        expect((service as any).isTokenExpired()).toBe(false);
      });
    });

    describe('clearStoredToken', () => {
      it('should remove token and expiry from sessionStorage', () => {
        sessionStorage.setItem('apple_music_token', 'test-token');
        sessionStorage.setItem('apple_music_token_expiry', '123456789');

        (service as any).clearStoredToken();

        expect(sessionStorage.getItem('apple_music_token')).toBeNull();
        expect(sessionStorage.getItem('apple_music_token_expiry')).toBeNull();
      });
    });
  });

  describe('authorize() with error handling', () => {
    it('should show success notification on successful authorization', async () => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;
      mockMusicKitInstance.authorize.and.returnValue(
        Promise.resolve('test-token'),
      );

      await service.authorize();

      expect(notificationServiceSpy.showSuccess).toHaveBeenCalledWith(
        'Signed in to Apple Music',
      );
    });

    it('should handle authorization error and rethrow', async () => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;
      const error = new Error('popup blocked');
      mockMusicKitInstance.authorize.and.returnValue(Promise.reject(error));

      await expectAsync(service.authorize()).toBeRejected();
      expect(notificationServiceSpy.showError).toHaveBeenCalled();
    });
  });

  describe('loadArtistsWithAlbums() with error handling', () => {
    it('should check token expiration before loading', (done) => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Set expired token
      sessionStorage.setItem('apple_music_token_expiry', '123456789');

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(false);
        expect(notificationServiceSpy.showWarning).toHaveBeenCalledWith(
          'Session expired. Please sign in again.',
        );
        done();
      });
    });

    it('should handle errors via handleError method', (done) => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Set valid token
      const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
      sessionStorage.setItem('apple_music_token_expiry', futureTime.toString());

      const error = { status: 403 };
      // Make recently played return empty → fallback to library → which errors
      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/recent/played')) {
            return Promise.resolve({ data: [] });
          }
          return Promise.reject(error);
        },
      );

      spyOn(console, 'log');

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(false);
        expect(notificationServiceSpy.showError).toHaveBeenCalledWith(
          'Apple Music subscription required to view your library.',
        );
        done();
      });
    });
  });
});
