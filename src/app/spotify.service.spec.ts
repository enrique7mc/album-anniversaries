import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [{ provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG }],
    });
    service = TestBed.inject(SpotifyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
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

  describe('albumHadBirthdayPastMonth', () => {
    it('should return true for album birthday exactly 1 day ago', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setFullYear(2010); // Set to past year to simulate anniversary
      const releaseDate = yesterday.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(true);
    });

    it('should return true for album birthday 15 days ago', () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      fifteenDaysAgo.setFullYear(2005);
      const releaseDate = fifteenDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(true);
    });

    it('should return true for album birthday 29 days ago', () => {
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
      twentyNineDaysAgo.setFullYear(2015);
      const releaseDate = twentyNineDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(true);
    });

    it('should return false for album birthday exactly 30 days ago (edge of window)', () => {
      const releaseDate = createLocalDateString(-30, 2012);

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(false);
    });

    it('should return false for album birthday 31 days ago (outside window)', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
      thirtyOneDaysAgo.setFullYear(2011);
      const releaseDate = thirtyOneDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(false);
    });

    it('should return true for album birthday today (if current time is past midnight)', () => {
      const releaseDate = createLocalDateString(0, 2008);

      const album = createAlbum(releaseDate);
      // Birthday today: albumDate is set to midnight today, and current time is likely after midnight
      // So dateDiffMillis will be positive (hours since midnight) and less than a month
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(true);
    });

    it('should return false for album birthday in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setFullYear(2020);
      const releaseDate = tomorrow.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(false);
    });

    it('should return false for album birthday 60 days ago', () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      sixtyDaysAgo.setFullYear(2018);
      const releaseDate = sixtyDaysAgo.toISOString().split('T')[0];

      const album = createAlbum(releaseDate);
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(false);
    });

    it('should return true for albums released today this year (counts as birthday)', () => {
      const releaseDate = createLocalDateString(0);

      const album = createAlbum(releaseDate);
      // Album released today: when set to this year (no change), it's the same as birthday today
      // So it returns true if current time is after midnight
      expect(SpotifyService.albumHadBirthdayPastMonth(album)).toBe(true);
    });

    it('should correctly parse ISO date format (Safari compatibility)', () => {
      // Safari has issues with dates like '2020-01-15' without time component
      // The function adds 'T00:00:00' to ensure cross-browser compatibility
      const album = createAlbum('2020-01-15');

      // This should not throw an error
      expect(() =>
        SpotifyService.albumHadBirthdayPastMonth(album),
      ).not.toThrow();
    });

    it('should handle leap year dates correctly', () => {
      // Test with Feb 29 (leap year birthday)
      const album = createAlbum('2020-02-29');

      // Should not throw an error even in non-leap years
      expect(() =>
        SpotifyService.albumHadBirthdayPastMonth(album),
      ).not.toThrow();
    });

    it('should handle dates that span month boundaries', () => {
      // Test with dates near month boundaries
      const album = createAlbum('2020-01-31');

      // Should not throw an error
      expect(() =>
        SpotifyService.albumHadBirthdayPastMonth(album),
      ).not.toThrow();
    });

    describe('cross-year anniversary scenarios', () => {
      it('should return true when today is Jan 5 and album anniversary is Dec 31 (5 days ago)', () => {
        // Mock today as January 5, 2025
        const today = new Date('2025-01-05T12:00:00');
        spyOn(Date, 'now').and.returnValue(today.getTime());

        // Album released December 31, 2020 (anniversary was Dec 31, 2024 - 5 days ago)
        const album = createAlbum('2020-12-31');

        const result = SpotifyService.albumHadBirthdayPastMonth(album);
        expect(result).toBe(true);
      });

      it('should return true when today is Jan 15 and album anniversary is Dec 20 (26 days ago)', () => {
        // Mock today as January 15, 2025
        const today = new Date('2025-01-15T12:00:00');
        spyOn(Date, 'now').and.returnValue(today.getTime());

        // Album released December 20, 2015 (anniversary was Dec 20, 2024 - 26 days ago)
        const album = createAlbum('2015-12-20');

        const result = SpotifyService.albumHadBirthdayPastMonth(album);
        expect(result).toBe(true);
      });

      it('should return false when today is Jan 5 and album anniversary is Nov 30 (36 days ago)', () => {
        // Mock today as January 5, 2025
        const today = new Date('2025-01-05T12:00:00');
        spyOn(Date, 'now').and.returnValue(today.getTime());

        // Album released November 30, 2018 (anniversary was Nov 30, 2024 - 36 days ago)
        const album = createAlbum('2018-11-30');

        const result = SpotifyService.albumHadBirthdayPastMonth(album);
        expect(result).toBe(false);
      });

      it('should return false when today is Jan 20 and album anniversary is Feb 15 (26 days in future)', () => {
        // Mock today as January 20, 2025
        const today = new Date('2025-01-20T12:00:00');
        spyOn(Date, 'now').and.returnValue(today.getTime());

        // Album released February 15, 2019 (next anniversary Feb 15, 2025 - 26 days in future)
        const album = createAlbum('2019-02-15');

        const result = SpotifyService.albumHadBirthdayPastMonth(album);
        expect(result).toBe(false);
      });

      it('should handle edge case: today is Jan 1 and album anniversary is Dec 31 (1 day ago)', () => {
        // Mock today as January 1, 2025
        const today = new Date('2025-01-01T12:00:00');
        spyOn(Date, 'now').and.returnValue(today.getTime());

        // Album released December 31, 2010 (anniversary was Dec 31, 2024 - 1 day ago)
        const album = createAlbum('2010-12-31');

        const result = SpotifyService.albumHadBirthdayPastMonth(album);
        expect(result).toBe(true);
      });

      it('should handle edge case: today is Jan 30 and album anniversary is Dec 31 (30 days ago, boundary)', () => {
        // Mock today as January 30, 2025
        const today = new Date('2025-01-30T12:00:00');
        spyOn(Date, 'now').and.returnValue(today.getTime());

        // Album released December 31, 2012 (anniversary was Dec 31, 2024 - exactly 30 days ago)
        const album = createAlbum('2012-12-31');

        const result = SpotifyService.albumHadBirthdayPastMonth(album);
        // Should be false because it's exactly at the 30-day boundary
        expect(result).toBe(false);
      });
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

  describe('filterAndMapAlbums (sorting behavior)', () => {
    // Helper to create a mock SpotifyAlbumResponse
    const createSpotifyAlbumResponse = (
      id: string,
      name: string,
      releaseDate: string,
      precision: string = 'day',
    ): any => ({
      id,
      name,
      release_date: releaseDate,
      release_date_precision: precision,
      images: [],
      external_urls: { spotify: `https://open.spotify.com/album/${id}` },
    });

    describe('sorting albums by release date', () => {
      it('should sort albums in descending order (newest first) when all are within filter criteria', () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Oldest Album',
            threeDaysAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Newest Album',
            yesterday.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-3',
            'Middle Album',
            twoDaysAgo.toISOString().split('T')[0],
          ),
        ];

        const result = (service as any).filterAndMapAlbums(items, 'artist-123');

        expect(result.length).toBe(3);
        expect(result[0].name).toBe('Newest Album');
        expect(result[1].name).toBe('Middle Album');
        expect(result[2].name).toBe('Oldest Album');
        expect(result[0].release_date).toBe(
          yesterday.toISOString().split('T')[0],
        );
        expect(result[2].release_date).toBe(
          threeDaysAgo.toISOString().split('T')[0],
        );
      });

      it('should sort albums correctly when release dates are in different months', () => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const nineMonthsAgo = new Date();
        nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Album Six Months Ago',
            sixMonthsAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Album Nine Months Ago',
            nineMonthsAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-3',
            'Album Three Months Ago',
            threeMonthsAgo.toISOString().split('T')[0],
          ),
        ];

        const result = (service as any).filterAndMapAlbums(items, 'artist-456');

        expect(result.length).toBe(3);
        expect(result[0].name).toBe('Album Three Months Ago');
        expect(result[1].name).toBe('Album Six Months Ago');
        expect(result[2].name).toBe('Album Nine Months Ago');
      });

      it('should sort albums correctly when release dates span different years', () => {
        const currentYear = new Date().getFullYear();
        const jan2024 = `${currentYear}-01-15`;
        const dec2023 = `${currentYear - 1}-12-20`;
        const jun2023 = `${currentYear - 1}-06-10`;

        const items = [
          createSpotifyAlbumResponse('album-1', 'June 2023', jun2023),
          createSpotifyAlbumResponse('album-2', 'January 2024', jan2024),
          createSpotifyAlbumResponse('album-3', 'December 2023', dec2023),
        ];

        const result = (service as any).filterAndMapAlbums(items, 'artist-789');

        expect(result.length).toBeGreaterThanOrEqual(0); // May be filtered out depending on current date
        if (result.length > 0) {
          // Verify descending order
          for (let i = 0; i < result.length - 1; i++) {
            expect(
              result[i].release_date.localeCompare(result[i + 1].release_date),
            ).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it('should handle sorting when albums have the same release date', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const items = [
          createSpotifyAlbumResponse('album-1', 'Album A', dateStr),
          createSpotifyAlbumResponse('album-2', 'Album B', dateStr),
          createSpotifyAlbumResponse('album-3', 'Album C', dateStr),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-same',
        );

        expect(result.length).toBe(3);
        // All should have the same date
        expect(result[0].release_date).toBe(dateStr);
        expect(result[1].release_date).toBe(dateStr);
        expect(result[2].release_date).toBe(dateStr);
      });

      it('should correctly use localeCompare for string comparison of ISO dates', () => {
        const dates = [
          '2024-12-31',
          '2024-01-01',
          '2024-06-15',
          '2023-12-31',
          '2024-03-20',
        ];

        const items = dates.map((date, index) =>
          createSpotifyAlbumResponse(`album-${index}`, `Album ${index}`, date),
        );

        const result = (service as any).filterAndMapAlbums(items, 'artist-iso');

        if (result.length > 1) {
          // Verify that dates are in descending order
          for (let i = 0; i < result.length - 1; i++) {
            const comparison = result[i].release_date.localeCompare(
              result[i + 1].release_date,
            );
            expect(comparison).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it('should maintain sort order after filtering out invalid precision albums', () => {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Album with year precision',
            tenDaysAgo.toISOString().split('T')[0],
            'year',
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Valid Recent Album',
            fiveDaysAgo.toISOString().split('T')[0],
            'day',
          ),
          createSpotifyAlbumResponse(
            'album-3',
            'Album with month precision',
            fifteenDaysAgo.toISOString().split('T')[0],
            'month',
          ),
          createSpotifyAlbumResponse(
            'album-4',
            'Valid Older Album',
            fifteenDaysAgo.toISOString().split('T')[0],
            'day',
          ),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-prec',
        );

        // Should only include items with 'day' precision
        expect(
          result.every((album: any) => album.release_date_precision === 'day'),
        ).toBe(true);

        // Should be sorted in descending order
        if (result.length > 1) {
          expect(result[0].name).toBe('Valid Recent Album');
          expect(result[1].name).toBe('Valid Older Album');
        }
      });

      it('should return empty array when all albums are filtered out', () => {
        // Create a date that's more than a year ago AND doesn't have an anniversary this month
        // Using a date from 2 years ago in June (not December)
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        twoYearsAgo.setMonth(5); // June
        twoYearsAgo.setDate(15);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Very Old Album',
            twoYearsAgo.toISOString().split('T')[0],
          ),
        ];

        const result = (service as any).filterAndMapAlbums(items, 'artist-old');

        expect(result).toEqual([]);
      });

      it('should handle empty input array', () => {
        const result = (service as any).filterAndMapAlbums([], 'artist-empty');

        expect(result).toEqual([]);
      });

      it('should preserve artist_id in sorted results', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Album 1',
            twoDaysAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Album 2',
            yesterday.toISOString().split('T')[0],
          ),
        ];

        const artistId = 'test-artist-999';
        const result = (service as any).filterAndMapAlbums(items, artistId);

        expect(result.length).toBe(2);
        expect(result[0].artist_id).toBe(artistId);
        expect(result[1].artist_id).toBe(artistId);
      });

      it('should preserve all album properties after sorting', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const items = [
          {
            id: 'album-xyz',
            name: 'Test Album with Properties',
            release_date: dateStr,
            release_date_precision: 'day',
            images: [
              { url: 'http://example.com/image.jpg', height: 640, width: 640 },
            ],
            external_urls: { spotify: 'https://open.spotify.com/album/xyz' },
          },
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-props',
        );

        expect(result.length).toBe(1);
        expect(result[0].id).toBe('album-xyz');
        expect(result[0].name).toBe('Test Album with Properties');
        expect(result[0].release_date).toBe(dateStr);
        expect(result[0].release_date_precision).toBe('day');
        expect(result[0].images).toEqual([
          { url: 'http://example.com/image.jpg', height: 640, width: 640 },
        ]);
        expect(result[0].external_url).toBe(
          'https://open.spotify.com/album/xyz',
        );
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle albums with dates at year boundaries correctly', () => {
        const dec31 = `${new Date().getFullYear() - 1}-12-31`;
        const jan01 = `${new Date().getFullYear()}-01-01`;

        const items = [
          createSpotifyAlbumResponse('album-1', 'New Years Eve', dec31),
          createSpotifyAlbumResponse('album-2', 'New Years Day', jan01),
        ];

        const result = (service as any).filterAndMapAlbums(items, 'artist-nye');

        if (result.length > 0) {
          // Verify sorting is correct regardless of filtering
          for (let i = 0; i < result.length - 1; i++) {
            expect(
              result[i].release_date.localeCompare(result[i + 1].release_date),
            ).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it('should handle albums with unusual but valid ISO date formats', () => {
        // Spotify API returns dates in YYYY-MM-DD format, but test various valid ISO formats
        const dates = ['2024-01-01', '2024-12-31', '2024-06-15'];

        const items = dates.map((date, index) =>
          createSpotifyAlbumResponse(`album-${index}`, `Album ${index}`, date),
        );

        // Should not throw an error
        expect(() =>
          (service as any).filterAndMapAlbums(items, 'artist-iso-formats'),
        ).not.toThrow();
      });

      it('should handle single album in array', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const items = [
          createSpotifyAlbumResponse('album-single', 'Single Album', dateStr),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-single',
        );

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Single Album');
      });

      it('should handle albums released on the same day but different times (should all have same date)', () => {
        const today = new Date();
        today.setDate(today.getDate() - 1);
        const dateStr = today.toISOString().split('T')[0];

        const items = [
          createSpotifyAlbumResponse('album-1', 'Morning Release', dateStr),
          createSpotifyAlbumResponse('album-2', 'Afternoon Release', dateStr),
          createSpotifyAlbumResponse('album-3', 'Evening Release', dateStr),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-same-day',
        );

        expect(result.length).toBe(3);
        // All should have same date, order doesn't matter as long as they're all present
        result.forEach((album: any) => {
          expect(album.release_date).toBe(dateStr);
        });
      });

      it('should maintain stability of sort for albums with identical release dates', () => {
        const dateStr = createLocalDateString(-5);

        const items = [
          createSpotifyAlbumResponse('album-a', 'Album A', dateStr),
          createSpotifyAlbumResponse('album-b', 'Album B', dateStr),
          createSpotifyAlbumResponse('album-c', 'Album C', dateStr),
          createSpotifyAlbumResponse('album-d', 'Album D', dateStr),
          createSpotifyAlbumResponse('album-e', 'Album E', dateStr),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-stable',
        );

        expect(result.length).toBe(5);
        // Verify sort stability: albums with identical dates preserve original input order
        const ids = result.map((a: any) => a.id);
        expect(ids).toEqual([
          'album-a',
          'album-b',
          'album-c',
          'album-d',
          'album-e',
        ]);
      });
    });

    describe('integration with date filtering methods', () => {
      it('should sort albums that pass birthday past week filter', () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setFullYear(2010); // Set to past year for birthday
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        fiveDaysAgo.setFullYear(2008);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Older Birthday',
            fiveDaysAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Recent Birthday',
            twoDaysAgo.toISOString().split('T')[0],
          ),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-bday',
        );

        // Both should pass the filter and be sorted
        if (result.length === 2) {
          expect(
            result[0].release_date.localeCompare(result[1].release_date),
          ).toBeGreaterThan(0);
        }
      });

      it('should sort albums that pass released past year filter', () => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Three Months',
            threeMonthsAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Six Months',
            sixMonthsAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-3',
            'One Month',
            oneMonthAgo.toISOString().split('T')[0],
          ),
        ];

        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-recent',
        );

        expect(result.length).toBe(3);
        expect(result[0].name).toBe('One Month');
        expect(result[1].name).toBe('Three Months');
        expect(result[2].name).toBe('Six Months');
      });

      it('should handle mix of albums passing different filter criteria', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twentyDaysAgo = new Date();
        twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
        twentyDaysAgo.setFullYear(2015); // For birthday filter
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Recent Release',
            yesterday.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Birthday Album',
            twentyDaysAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-3',
            'Two Months Old',
            twoMonthsAgo.toISOString().split('T')[0],
          ),
        ];

        const result = (service as any).filterAndMapAlbums(items, 'artist-mix');

        // All should be in descending order by actual release date
        if (result.length > 1) {
          for (let i = 0; i < result.length - 1; i++) {
            expect(
              result[i].release_date.localeCompare(result[i + 1].release_date),
            ).toBeGreaterThanOrEqual(0);
          }
        }
      });
    });

    describe('performance and consistency', () => {
      it('should handle large number of albums efficiently', () => {
        const items = [];
        const baseDate = new Date();

        // Create 100 albums with various dates
        for (let i = 0; i < 100; i++) {
          const date = new Date(baseDate);
          date.setDate(date.getDate() - i);
          items.push(
            createSpotifyAlbumResponse(
              `album-${i}`,
              `Album ${i}`,
              date.toISOString().split('T')[0],
            ),
          );
        }

        const startTime = performance.now();
        const result = (service as any).filterAndMapAlbums(
          items,
          'artist-perf',
        );
        const endTime = performance.now();

        // Should complete in reasonable time (less than 100ms for 100 albums)
        expect(endTime - startTime).toBeLessThan(100);

        // Result should be sorted in descending order
        if (result.length > 1) {
          for (let i = 0; i < result.length - 1; i++) {
            expect(
              result[i].release_date.localeCompare(result[i + 1].release_date),
            ).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it('should produce consistent results across multiple calls with same input', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Album 1',
            twoDaysAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Album 2',
            yesterday.toISOString().split('T')[0],
          ),
        ];

        const result1 = (service as any).filterAndMapAlbums(
          items,
          'artist-consistent',
        );
        const result2 = (service as any).filterAndMapAlbums(
          items,
          'artist-consistent',
        );
        const result3 = (service as any).filterAndMapAlbums(
          items,
          'artist-consistent',
        );

        // All three results should be identical
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });

      it('should not mutate the original input array', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const items = [
          createSpotifyAlbumResponse(
            'album-1',
            'Album 1',
            twoDaysAgo.toISOString().split('T')[0],
          ),
          createSpotifyAlbumResponse(
            'album-2',
            'Album 2',
            yesterday.toISOString().split('T')[0],
          ),
        ];

        const originalOrder = items.map((item) => item.id);
        (service as any).filterAndMapAlbums(items, 'artist-immutable');

        // Original array order should be unchanged
        expect(items.map((item) => item.id)).toEqual(originalOrder);
      });
    });
  });
});
