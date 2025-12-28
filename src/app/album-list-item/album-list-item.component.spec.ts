import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AlbumListItemComponent } from './album-list-item.component';
import { Album } from '../album';
import { Image } from '../image';

describe('AlbumListItemComponent', () => {
  let component: AlbumListItemComponent;
  let fixture: ComponentFixture<AlbumListItemComponent>;
  let debugElement: DebugElement;

  const mockImages: Image[] = [
    { height: 640, width: 640, url: 'https://example.com/large.jpg' },
    { height: 300, width: 300, url: 'https://example.com/medium.jpg' },
    { height: 64, width: 64, url: 'https://example.com/small.jpg' },
  ];

  const mockAlbum: Album = {
    id: 'album-123',
    artist_id: 'artist-456',
    name: 'Test Album',
    release_date: '2023-01-15',
    release_date_precision: 'day',
    images: mockImages,
    external_url: 'https://open.spotify.com/album/test',
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [AlbumListItemComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AlbumListItemComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    component.album = mockAlbum;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have ChangeDetectionStrategy.OnPush', () => {
      expect(component.constructor.name).toBe('AlbumListItemComponent');
    });

    it('should accept album input', () => {
      expect(component.album).toEqual(mockAlbum);
    });
  });

  describe('Getter Methods', () => {
    describe('altTag', () => {
      it('should return correct alt tag for album', () => {
        expect(component.altTag).toBe('Album cover for Test Album');
      });

      it('should handle album names with special characters', () => {
        component.album = {
          ...mockAlbum,
          name: "Artist's Greatest Hits & More",
        };
        expect(component.altTag).toBe(
          "Album cover for Artist's Greatest Hits & More",
        );
      });

      it('should handle empty album name', () => {
        component.album = { ...mockAlbum, name: '' };
        expect(component.altTag).toBe('Album cover');
      });

      it('should handle null album name', () => {
        component.album = { ...mockAlbum, name: null as any };
        expect(component.altTag).toBe('Album cover');
      });

      it('should handle whitespace-only album name', () => {
        component.album = { ...mockAlbum, name: '   ' };
        expect(component.altTag).toBe('Album cover');
      });
    });

    describe('albumCoverUrl', () => {
      it('should return first image URL when available', () => {
        expect(component.albumCoverUrl).toBe('https://example.com/large.jpg');
      });

      it('should return placeholder when no images exist', () => {
        component.album = { ...mockAlbum, images: [] };
        expect(component.albumCoverUrl).toBe('https://via.placeholder.com/300');
      });

      it('should return placeholder when images array is null', () => {
        component.album = { ...mockAlbum, images: null as any };
        expect(component.albumCoverUrl).toBe('https://via.placeholder.com/300');
      });

      it('should return placeholder when first image is null', () => {
        component.album = { ...mockAlbum, images: [null as any] };
        expect(component.albumCoverUrl).toBe('https://via.placeholder.com/300');
      });

      it('should return empty URL when first image URL is empty', () => {
        const imagesWithEmptyUrl = [{ ...mockImages[0], url: '' }];
        component.album = { ...mockAlbum, images: imagesWithEmptyUrl };
        expect(component.albumCoverUrl).toBe('');
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render album name', () => {
      const titleElement = debugElement.query(By.css('.album-name'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Test Album');
    });

    it('should render release date', () => {
      const dateElement = debugElement.query(By.css('.album-date'));
      expect(dateElement.nativeElement.textContent.trim()).toBe('2023-01-15');
    });

    it('should render album cover image with correct src', () => {
      const imageElement = debugElement.query(By.css('.album-cover'));
      expect(imageElement.nativeElement.src).toContain(
        'https://example.com/large.jpg',
      );
    });

    it('should render album cover image with correct alt text', () => {
      const imageElement = debugElement.query(By.css('.album-cover'));
      expect(imageElement.nativeElement.alt).toBe('Album cover for Test Album');
    });

    it('should have album-card class', () => {
      const cardElement = debugElement.query(By.css('.album-card'));
      expect(cardElement).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle album with null release_date', () => {
      const newFixture = TestBed.createComponent(AlbumListItemComponent);
      const newComponent = newFixture.componentInstance;
      const newAlbum = { ...mockAlbum, release_date: null as any };
      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const dateElement = newFixture.nativeElement.querySelector('.album-date');
      expect(dateElement.textContent.trim()).toBe('');
    });

    it('should handle album with null name', () => {
      const newFixture = TestBed.createComponent(AlbumListItemComponent);
      const newComponent = newFixture.componentInstance;
      const newAlbum = { ...mockAlbum, name: null as any };
      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const titleElement =
        newFixture.nativeElement.querySelector('.album-name');
      expect(titleElement.textContent.trim()).toBe('');
    });

    it('should handle completely empty album object', () => {
      const emptyAlbum = {
        id: '',
        artist_id: '',
        name: '',
        release_date: '',
        release_date_precision: '',
        images: [],
        external_url: '',
      };

      component.album = emptyAlbum;
      fixture.detectChanges();

      expect(component.albumCoverUrl).toBe('https://via.placeholder.com/300');
      expect(component.altTag).toBe('Album cover');
    });
  });

  describe('Integration Tests', () => {
    it('should update display when album input changes', () => {
      // Create a fresh fixture with OnPush change detection
      const newFixture = TestBed.createComponent(AlbumListItemComponent);
      const newComponent = newFixture.componentInstance;

      const newAlbum: Album = {
        id: 'new-album',
        artist_id: 'new-artist',
        name: 'New Album Name',
        release_date: '2024-05-20',
        release_date_precision: 'day',
        images: [
          { height: 640, width: 640, url: 'https://example.com/new-large.jpg' },
          {
            height: 300,
            width: 300,
            url: 'https://example.com/new-medium.jpg',
          },
          { height: 64, width: 64, url: 'https://example.com/new-small.jpg' },
        ],
        external_url: 'https://open.spotify.com/album/new',
      };

      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const newDebugElement = newFixture.debugElement;
      const titleElement = newDebugElement.query(By.css('.album-name'));
      const dateElement = newDebugElement.query(By.css('.album-date'));
      const imageElement = newDebugElement.query(By.css('.album-cover'));

      expect(titleElement.nativeElement.textContent.trim()).toBe(
        'New Album Name',
      );
      expect(dateElement.nativeElement.textContent.trim()).toBe('2024-05-20');
      expect(imageElement.nativeElement.src).toContain(
        'https://example.com/new-large.jpg',
      );
    });

    it('should maintain card structure', () => {
      const cardWrapperElement = debugElement.query(By.css('.card-3d-wrapper'));
      const cardElement = debugElement.query(By.css('.album-card'));
      const titleElement = debugElement.query(By.css('.album-name'));
      const dateElement = debugElement.query(By.css('.album-date'));

      expect(cardWrapperElement).toBeTruthy();
      expect(cardElement).toBeTruthy();
      expect(titleElement).toBeTruthy();
      expect(dateElement).toBeTruthy();
    });
  });
});
