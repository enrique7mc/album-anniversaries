import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { APP_CONFIG, SPOTIFY_APP_CONFIG } from './app-config';
import { SpotifyService } from './spotify.service';
import { Album } from './album';

// Helper to create ISO date string at local midnight, avoiding UTC timezone issues
const createLocalDateString = (daysOffset: number, year?: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  if (year !== undefined) {
    date.setFullYear(year);
  }
  // Use local date components to avoid UTC timezone shifts
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Shared helper function for creating test albums
const createAlbum = (releaseDate: string): Album => ({
  id: 'test-id',
  artist_id: 'artist-id',
  name: 'Test Album',
  release_date: releaseDate,
  release_date_precision: 'day',
  images: [],
  external_url: 'https://open.spotify.com/album/test',
});

describe('SpotifyService', () => {
  let service: SpotifyService;

  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: APP_CONFIG, useValue: { ...SPOTIFY_APP_CONFIG, isDev: true } }],
    });
    service = TestBed.inject(SpotifyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('dev-only caching (getWithCache)', () => {
    const testUrl = 'https://example.com/test';

    afterEach(() => {
      httpMock.verify();
    });

    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should cache GET responses for 5 minutes in dev', (done) => {
      const first$ = (service as any).getWithCache(testUrl, {}, false);
      first$.subscribe((data: any) => {
        expect(data).toEqual({ items: [1] });

        const second$ = (service as any).getWithCache(testUrl, {}, false);
        second$.subscribe((cached: any) => {
          expect(cached).toEqual({ items: [1] });
          httpMock.expectNone(testUrl);
          done();
        });
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('GET');
      req1.flush({ items: [1] });
    });

    it('should bypass cache when bypass flag is true', (done) => {
      const first$ = (service as any).getWithCache(testUrl, {}, false);
      first$.subscribe(() => {
        const bypass$ = (service as any).getWithCache(testUrl, {}, true);
        bypass$.subscribe((data: any) => {
          expect(data).toEqual({ items: [2] });
          done();
        });

        const req2 = httpMock.expectOne(testUrl);
        expect(req2.request.method).toBe('GET');
        req2.flush({ items: [2] });
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('GET');
      req1.flush({ items: [1] });
    });

    it('should not cache in production mode (isDev=false)', (done) => {
      const http = TestBed.inject(HttpClient);
      const prodService = new SpotifyService(http, { title: '', redirectUrl: '', isDev: false } as any);

      const first$ = (prodService as any).getWithCache(testUrl, {}, false);
      first$.subscribe(() => {
        const second$ = (prodService as any).getWithCache(testUrl, {}, false);
        second$.subscribe(() => {
          done();
        });

        const req2 = httpMock.expectOne(testUrl);
        expect(req2.request.method).toBe('GET');
        req2.flush({ items: [2] });
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('GET');
      req1.flush({ items: [1] });
    });

    it('should expire cache after 5 minutes TTL', (done) => {
      const first$ = (service as any).getWithCache(testUrl, {}, false);
      first$.subscribe(() => {
        // advance time beyond 5 minutes TTL
        jasmine.clock().tick(5 * 60 * 1000 + 1);

        const second$ = (service as any).getWithCache(testUrl, {}, false);
        second$.subscribe(() => {
          done();
        });

        const req2 = httpMock.expectOne(testUrl);
        expect(req2.request.method).toBe('GET');
        req2.flush({ items: [2] });
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('GET');
      req1.flush({ items: [1] });
    });
  });

  describe('albumHadBirthdayPastWeek', () => {
    it('should return true for album birthday exactly 1 day ago', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setFullYear(2010); // Set to past year to simulate anniversary
      const releaseDate = yesterday.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(true);
    });

    it('should return true for album birthday 6 days ago', () => {
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      sixDaysAgo.setFullYear(2005);
      const releaseDate = sixDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(true);
    });

    it('should return true for album birthday 3 days ago', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setFullYear(2015);
      const releaseDate = threeDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(true);
    });

    it('should return false for album birthday exactly 7 days ago (edge of window)', () => {
      const releaseDate = createLocalDateString(-7, 2012);

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(false);
    });

    it('should return false for album birthday 8 days ago (outside window)', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      eightDaysAgo.setFullYear(2011);
      const releaseDate = eightDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(false);
    });

    it('should return true for album birthday today (if current time is past midnight)', () => {
      const releaseDate = createLocalDateString(0, 2008);

      const album = createAlbum(releaseDate);
      // Birthday today: albumDate is set to midnight today, and current time is likely after midnight
      // So dateDiffMillis will be positive (hours since midnight) and less than a week
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(true);
    });

    it('should return false for album birthday in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setFullYear(2020);
      const releaseDate = tomorrow.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(false);
    });

    it('should return false for album birthday 30 days ago', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setFullYear(2018);
      const releaseDate = thirtyDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(false);
    });

    it('should return true for albums released today this year (counts as birthday)', () => {
      const releaseDate = createLocalDateString(0);

      const album = createAlbum(releaseDate);
      // Album released today: when set to this year (no change), it's the same as birthday today
      // So it returns true if current time is after midnight
      expect(SpotifyService.albumHadBirthdayPastWeek(album)).toBe(true);
    });

    it('should correctly parse ISO date format (Safari compatibility)', () => {
      // Safari has issues with dates like '2020-01-15' without time component
      // The function adds 'T00:00:00' to ensure cross-browser compatibility
      const album = createAlbum('2020-01-15');

      // This should not throw an error
      expect(() =>
        SpotifyService.albumHadBirthdayPastWeek(album),
      ).not.toThrow();
    });

    it('should handle leap year dates correctly', () => {
      // Test with Feb 29 (leap year birthday)
      const album = createAlbum('2020-02-29');

      // Should not throw an error even in non-leap years
      expect(() =>
        SpotifyService.albumHadBirthdayPastWeek(album),
      ).not.toThrow();
    });
  });

  describe('albumReleasedPastYear', () => {
    it('should return true for album released yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const releaseDate = yesterday.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(true);
    });

    it('should return true for album released today', () => {
      const releaseDate = createLocalDateString(0);

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(true);
    });

    it('should return true for album released 6 months ago', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const releaseDate = sixMonthsAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(true);
    });

    it('should return true for album released 364 days ago', () => {
      const almostAYearAgo = new Date();
      almostAYearAgo.setDate(almostAYearAgo.getDate() - 364);
      const releaseDate = almostAYearAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(true);
    });

    it('should return false for album released exactly 365 days ago (just at edge)', () => {
      const releaseDate = createLocalDateString(-365);

      const album = createAlbum(releaseDate);
      // 365 days is exactly 31,536,000,000 ms, but due to time precision it's likely just over
      // The function uses < not <=, so exactly 365 days or slightly over returns false
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(false);
    });

    it('should return false for album released 366 days ago (just outside window)', () => {
      const overAYearAgo = new Date();
      overAYearAgo.setDate(overAYearAgo.getDate() - 366);
      const releaseDate = overAYearAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(false);
    });

    it('should return false for album released 2 years ago', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const releaseDate = twoYearsAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(false);
    });

    it('should return false for album to be released 1 week from now (future)', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const releaseDate = nextWeek.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      // Future releases should not count as "released in the past year"
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(false);
    });

    it('should return false for album to be released in 6 months (future)', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      const releaseDate = futureDate.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      // Future releases should not count as "released in the past year"
      expect(SpotifyService.albumReleasedPastYear(album)).toBe(false);
    });

    it('should correctly parse ISO date format (Safari compatibility)', () => {
      const album = createAlbum('2024-06-15');

      // This should not throw an error
      expect(() => SpotifyService.albumReleasedPastYear(album)).not.toThrow();
    });

    it('should handle leap year dates correctly', () => {
      const album = createAlbum('2024-02-29');

      // Should not throw an error
      expect(() => SpotifyService.albumReleasedPastYear(album)).not.toThrow();
    });

    it('should handle dates at year boundaries', () => {
      // Test December 31st
      const endOfYear = createAlbum('2023-12-31');
      expect(() =>
        SpotifyService.albumReleasedPastYear(endOfYear),
      ).not.toThrow();

      // Test January 1st
      const startOfYear = createAlbum('2024-01-01');
      expect(() =>
        SpotifyService.albumReleasedPastYear(startOfYear),
      ).not.toThrow();
    });
  });
});
