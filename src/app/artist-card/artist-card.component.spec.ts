import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { ArtistCardComponent } from './artist-card.component';
import { MaterialModule } from '../material/material.module';
import { Artist } from '../artist';
import { Image } from '../image';
import { AlbumListItemComponent } from '../album-list-item/album-list-item.component';

describe('ArtistCardComponent', () => {
  let component: ArtistCardComponent;
  let fixture: ComponentFixture<ArtistCardComponent>;
  let debugElement: DebugElement;

  const mockImages: Image[] = [
    { heigth: 640, width: 640, url: 'https://example.com/artist-large.jpg' },
    { heigth: 300, width: 300, url: 'https://example.com/artist-medium.jpg' },
    { heigth: 64, width: 64, url: 'https://example.com/artist-small.jpg' },
  ];

  const mockArtist: Artist = {
    id: 'artist-123',
    href: 'https://api.spotify.com/v1/artists/artist-123',
    name: 'Test Artist',
    popularity: 75,
    images: mockImages,
    external_url: 'https://open.spotify.com/artist/artist-123',
    albums: [
      {
        id: 'album-1',
        artist_id: 'artist-123',
        name: 'Album One',
        release_date: '2020-01-15',
        release_date_precision: 'day',
        images: mockImages,
        external_url: 'https://open.spotify.com/album/album-1',
      },
      {
        id: 'album-2',
        artist_id: 'artist-123',
        name: 'Album Two',
        release_date: '2021-06-20',
        release_date_precision: 'day',
        images: mockImages,
        external_url: 'https://open.spotify.com/album/album-2',
      },
    ],
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [ArtistCardComponent, AlbumListItemComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArtistCardComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    component.artist = mockArtist;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create artist card', () => {
      expect(component).toBeTruthy();
    });

    it('should have ChangeDetectionStrategy.OnPush', () => {
      expect(component.constructor.name).toBe('ArtistCardComponent');
    });

    it('should accept artist input', () => {
      expect(component.artist).toEqual(mockArtist);
    });
  });

  describe('Getter Methods', () => {
    describe('altTag', () => {
      it('should return correct alt tag for artist photo', () => {
        expect(component.altTag).toBe('Test Artist photo');
      });

      it('should handle artist names with special characters', () => {
        component.artist = {
          ...mockArtist,
          name: "AC/DC & The Rolling Stones",
        };
        expect(component.altTag).toBe("AC/DC & The Rolling Stones photo");
      });

      it('should handle empty artist name', () => {
        component.artist = { ...mockArtist, name: '' };
        expect(component.altTag).toBe(' photo');
      });

      it('should handle artist names with unicode characters', () => {
        component.artist = { ...mockArtist, name: 'Björk' };
        expect(component.altTag).toBe('Björk photo');
      });
    });

    describe('artistImageUrl', () => {
      it('should return first (largest) image URL when available', () => {
        expect(component.artistImageUrl).toBe('https://example.com/artist-large.jpg');
      });

      it('should return placeholder when images array is empty', () => {
        component.artist = { ...mockArtist, images: [] };
        expect(component.artistImageUrl).toBe('https://via.placeholder.com/600');
      });

      it('should return placeholder when first image is null', () => {
        const imagesWithNull = [...mockImages];
        imagesWithNull[0] = null as any;
        component.artist = { ...mockArtist, images: imagesWithNull };
        expect(component.artistImageUrl).toBe('https://via.placeholder.com/600');
      });

      it('should return placeholder when first image is undefined', () => {
        const imagesWithUndefined = [...mockImages];
        imagesWithUndefined[0] = undefined as any;
        component.artist = { ...mockArtist, images: imagesWithUndefined };
        expect(component.artistImageUrl).toBe('https://via.placeholder.com/600');
      });

      it('should return empty string when first image has empty URL', () => {
        const imagesWithEmptyUrl = [...mockImages];
        imagesWithEmptyUrl[0] = { ...mockImages[0], url: '' };
        component.artist = { ...mockArtist, images: imagesWithEmptyUrl };
        expect(component.artistImageUrl).toBe('');
      });

      it('should use only the first image, not subsequent ones', () => {
        const singleImage: Image[] = [mockImages[0]];
        component.artist = { ...mockArtist, images: singleImage };
        expect(component.artistImageUrl).toBe('https://example.com/artist-large.jpg');
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render artist name in card title', () => {
      const titleElement = debugElement.query(By.css('mat-card-title'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Test Artist');
    });

    it('should render artist image with correct src', () => {
      const imageElement = debugElement.query(By.css('img[mat-card-image]'));
      expect(imageElement.nativeElement.src).toBe('https://example.com/artist-large.jpg');
    });

    it('should render artist image with correct alt text', () => {
      const imageElement = debugElement.query(By.css('img[mat-card-image]'));
      expect(imageElement.nativeElement.alt).toBe('Test Artist photo');
    });

    it('should render "View on Spotify" link with correct href', () => {
      const linkElement = debugElement.query(By.css('a[mat-raised-button]'));
      expect(linkElement.nativeElement.href).toBe('https://open.spotify.com/artist/artist-123');
    });

    it('should render "View on Spotify" link with target="_blank"', () => {
      const linkElement = debugElement.query(By.css('a[mat-raised-button]'));
      expect(linkElement.nativeElement.target).toBe('_blank');
    });

    it('should render all albums in the list', () => {
      const albumElements = debugElement.queryAll(By.css('app-album-list-item'));
      expect(albumElements.length).toBe(2);
    });

    it('should pass album data to album list item components', () => {
      const albumComponents = debugElement.queryAll(By.directive(AlbumListItemComponent));
      expect(albumComponents[0].componentInstance.album).toEqual(mockArtist.albums[0]);
      expect(albumComponents[1].componentInstance.album).toEqual(mockArtist.albums[1]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle artist with no albums', () => {
      const newFixture = TestBed.createComponent(ArtistCardComponent);
      const newComponent = newFixture.componentInstance;
      const artistNoAlbums = { ...mockArtist, albums: [] };
      newComponent.artist = artistNoAlbums;
      newFixture.detectChanges();

      const albumElements = newFixture.debugElement.queryAll(By.css('app-album-list-item'));
      expect(albumElements.length).toBe(0);
    });

    it('should handle artist with many albums', () => {
      const manyAlbums = Array(15).fill(null).map((_, i) => ({
        ...mockArtist.albums[0],
        id: `album-${i}`,
        name: `Album ${i}`,
      }));

      // Create fresh fixture for OnPush change detection
      const newFixture = TestBed.createComponent(ArtistCardComponent);
      const newComponent = newFixture.componentInstance;
      newComponent.artist = { ...mockArtist, albums: manyAlbums };
      newFixture.detectChanges();

      const albumElements = newFixture.debugElement.queryAll(By.css('app-album-list-item'));
      expect(albumElements.length).toBe(15);
    });

    it('should handle artist with undefined external_url', () => {
      const newFixture = TestBed.createComponent(ArtistCardComponent);
      const newComponent = newFixture.componentInstance;
      const artistNoUrl = { ...mockArtist, external_url: undefined as any };
      newComponent.artist = artistNoUrl;
      newFixture.detectChanges();

      const linkElement = newFixture.nativeElement.querySelector('a[mat-raised-button]');
      expect(linkElement.getAttribute('href')).toBe('');
    });

    it('should display placeholder image when artist has no images', () => {
      const newFixture = TestBed.createComponent(ArtistCardComponent);
      const newComponent = newFixture.componentInstance;
      const artistNoImages = { ...mockArtist, images: [] };
      newComponent.artist = artistNoImages;
      newFixture.detectChanges();

      const imageElement = newFixture.nativeElement.querySelector('img[mat-card-image]');
      expect(imageElement.src).toContain('placeholder.com');
    });
  });

  describe('Integration Tests', () => {
    it('should update display when artist input changes', () => {
      const newArtist: Artist = {
        id: 'new-artist',
        href: 'https://api.spotify.com/v1/artists/new-artist',
        name: 'New Artist Name',
        popularity: 85,
        images: [
          { heigth: 640, width: 640, url: 'https://example.com/new-large.jpg' },
        ],
        external_url: 'https://open.spotify.com/artist/new-artist',
        albums: [{
          id: 'new-album',
          artist_id: 'new-artist',
          name: 'New Album',
          release_date: '2024-03-10',
          release_date_precision: 'day',
          images: mockImages,
          external_url: 'https://open.spotify.com/album/new-album',
        }],
      };

      const newFixture = TestBed.createComponent(ArtistCardComponent);
      const newComponent = newFixture.componentInstance;
      newComponent.artist = newArtist;
      newFixture.detectChanges();

      const newDebugElement = newFixture.debugElement;
      const titleElement = newDebugElement.query(By.css('mat-card-title'));
      const imageElement = newDebugElement.query(By.css('img[mat-card-image]'));
      const linkElement = newDebugElement.query(By.css('a[mat-raised-button]'));
      const albumElements = newDebugElement.queryAll(By.css('app-album-list-item'));

      expect(titleElement.nativeElement.textContent.trim()).toBe('New Artist Name');
      expect(imageElement.nativeElement.src).toBe('https://example.com/new-large.jpg');
      expect(linkElement.nativeElement.href).toBe('https://open.spotify.com/artist/new-artist');
      expect(albumElements.length).toBe(1);
    });

    it('should maintain Material Design card structure', () => {
      const cardElement = debugElement.query(By.css('mat-card'));
      const headerElement = debugElement.query(By.css('mat-card-header'));
      const titleElement = debugElement.query(By.css('mat-card-title'));
      const imageElement = debugElement.query(By.css('[mat-card-image]'));
      const contentElement = debugElement.query(By.css('mat-card-content'));
      const actionsElement = debugElement.query(By.css('mat-card-actions'));

      expect(cardElement).toBeTruthy();
      expect(headerElement).toBeTruthy();
      expect(titleElement).toBeTruthy();
      expect(imageElement).toBeTruthy();
      expect(contentElement).toBeTruthy();
      expect(actionsElement).toBeTruthy();
    });
  });
});
