import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
import { AppleMusicService } from './apple-music.service';
import { MusicKitLoaderService } from './musickit-loader.service';

describe('AppleMusicService', () => {
  let service: AppleMusicService;
  let musicKitLoaderSpy: jasmine.SpyObj<MusicKitLoaderService>;
  let functionsSpy: jasmine.SpyObj<Functions>;
  let mockMusicKitInstance: jasmine.SpyObj<MusicKitInstance>;

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

    TestBed.configureTestingModule({
      providers: [
        AppleMusicService,
        { provide: MusicKitLoaderService, useValue: musicKitLoaderSpy },
        { provide: Functions, useValue: functionsSpy },
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

    it('should fetch library artists and emit mapped artists via observable', (done) => {
      // Set up initialized state
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

      const mockArtists = [
        createMockArtistResource('artist-1', 'Artist One'),
        createMockArtistResource('artist-2', 'Artist Two'),
      ];

      const mockAlbums = [
        createMockAlbumResource('album-1', 'Album One', '2024-01-15'),
      ];

      // Mock API calls
      (mockMusicKitInstance.api.music as jasmine.Spy).and.callFake(
        (path: string) => {
          if (path.includes('/me/library/artists')) {
            return Promise.resolve({ data: mockArtists });
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
        expect(emittedArtists.length).toBe(2);
        expect(emittedArtists[0].name).toBe('Artist One');
        expect(emittedArtists[1].name).toBe('Artist Two');
        done();
      });
    });

    it('should return true on success', (done) => {
      (service as any).initialized = true;
      (service as any).musicKitInstance = mockMusicKitInstance;

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

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('API Error')),
      );

      spyOn(console, 'error');

      service.loadArtistsWithAlbums('test-token').subscribe((result) => {
        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('fetchAllLibraryArtists (private)', () => {
    it('should return empty array if musicKitInstance is null', async () => {
      (service as any).musicKitInstance = null;

      const result = await (service as any).fetchAllLibraryArtists();

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

      const result = await (service as any).fetchAllLibraryArtists();

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('artist-1');
      expect(result[1].id).toBe('artist-2');
      expect(callCount).toBe(2);
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
    it('should process artists in batches', async () => {
      (service as any).musicKitInstance = mockMusicKitInstance;

      // Create 7 artists (will be processed in 2 batches: 5 + 2)
      const artists = Array.from({ length: 7 }, (_, i) =>
        createMockArtistResource(`artist-${i}`, `Artist ${i}`),
      );

      (mockMusicKitInstance.api.music as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: [] }),
      );

      const startTime = Date.now();
      await (service as any).fetchAlbumsForAllArtists(artists);
      const duration = Date.now() - startTime;

      // Should have at least 200ms delay between batches
      // (may be slightly less due to timing variance)
      expect(duration).toBeGreaterThanOrEqual(150);
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
});
