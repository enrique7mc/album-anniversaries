import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { AlbumListItemComponent } from './album-list-item.component';
import { MaterialModule } from '../material/material.module';
import { Album } from '../album';
import { Image } from '../image';

describe('AlbumListItemComponent', () => {
  let component: AlbumListItemComponent;
  let fixture: ComponentFixture<AlbumListItemComponent>;
  let debugElement: DebugElement;

  const mockImages: Image[] = [
    { heigth: 640, width: 640, url: 'https://example.com/large.jpg' },
    { heigth: 300, width: 300, url: 'https://example.com/medium.jpg' },
    { heigth: 64, width: 64, url: 'https://example.com/small.jpg' },
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
      imports: [MaterialModule],
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
          "Album cover for Artist's Greatest Hits & More"
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
      it('should return third image URL when available', () => {
        expect(component.albumCoverUrl).toBe('https://example.com/small.jpg');
      });

      it('should return placeholder when no images exist', () => {
        component.album = { ...mockAlbum, images: [] };
        expect(component.albumCoverUrl).toBe('https://via.placeholder.com/40');
      });

      it('should return placeholder when images array has less than 3 items', () => {
        component.album = {
          ...mockAlbum,
          images: [mockImages[0], mockImages[1]],
        };
        expect(component.albumCoverUrl).toBe('https://via.placeholder.com/40');
      });

      it('should return placeholder when third image is null', () => {
        const imagesWithNull = [...mockImages];
        imagesWithNull[2] = null as any;
        component.album = { ...mockAlbum, images: imagesWithNull };
        expect(component.albumCoverUrl).toBe('https://via.placeholder.com/40');
      });

      it('should return empty URL when third image URL is empty', () => {
        const imagesWithEmptyUrl = [...mockImages];
        imagesWithEmptyUrl[2] = { ...mockImages[2], url: '' };
        component.album = { ...mockAlbum, images: imagesWithEmptyUrl };
        expect(component.albumCoverUrl).toBe('');
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render album name in title', () => {
      const titleElement = debugElement.query(By.css('[matListItemTitle]'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Test Album');
    });

    it('should render release date in subtitle', () => {
      const subtitleElement = debugElement.query(By.css('[matListItemLine]'));
      expect(subtitleElement.nativeElement.textContent.trim()).toBe(
        '2023-01-15'
      );
    });

    it('should render album cover image with correct src', () => {
      const imageElement = debugElement.query(By.css('img[matListItemAvatar]'));
      expect(imageElement.nativeElement.src).toBe(
        'https://example.com/small.jpg'
      );
    });

    it('should render album cover image with correct alt text', () => {
      const imageElement = debugElement.query(By.css('img[matListItemAvatar]'));
      expect(imageElement.nativeElement.alt).toBe('Album cover for Test Album');
    });

    it('should render external link with correct href', () => {
      const linkElement = debugElement.query(By.css('a[mat-list-item]'));
      expect(linkElement.nativeElement.href).toBe(
        'https://open.spotify.com/album/test'
      );
    });

    it('should render external link with target="_blank"', () => {
      const linkElement = debugElement.query(By.css('a[mat-list-item]'));
      expect(linkElement.nativeElement.target).toBe('_blank');
    });

    it('should have avatar class on image', () => {
      const imageElement = debugElement.query(By.css('img'));
      expect(imageElement.nativeElement.classList.contains('avatar')).toBe(
        true
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle album with undefined external_url', () => {
      const newFixture = TestBed.createComponent(AlbumListItemComponent);
      const newComponent = newFixture.componentInstance;
      const newAlbum = { ...mockAlbum, external_url: undefined as any };
      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const linkElement =
        newFixture.nativeElement.querySelector('a[mat-list-item]');
      expect(linkElement.getAttribute('href')).toBe('');
    });

    it('should handle album with null release_date', () => {
      const newFixture = TestBed.createComponent(AlbumListItemComponent);
      const newComponent = newFixture.componentInstance;
      const newAlbum = { ...mockAlbum, release_date: null as any };
      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const subtitleElement =
        newFixture.nativeElement.querySelector('[matListItemLine]');
      expect(subtitleElement.textContent.trim()).toBe('');
    });

    it('should handle album with null name', () => {
      const newFixture = TestBed.createComponent(AlbumListItemComponent);
      const newComponent = newFixture.componentInstance;
      const newAlbum = { ...mockAlbum, name: null as any };
      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const titleElement =
        newFixture.nativeElement.querySelector('[matListItemTitle]');
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

      expect(component.albumCoverUrl).toBe('https://via.placeholder.com/40');
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
          { heigth: 640, width: 640, url: 'https://example.com/new-large.jpg' },
          {
            heigth: 300,
            width: 300,
            url: 'https://example.com/new-medium.jpg',
          },
          { heigth: 64, width: 64, url: 'https://example.com/new-small.jpg' },
        ],
        external_url: 'https://open.spotify.com/album/new',
      };

      newComponent.album = newAlbum;
      newFixture.detectChanges();

      const newDebugElement = newFixture.debugElement;
      const titleElement = newDebugElement.query(By.css('[matListItemTitle]'));
      const subtitleElement = newDebugElement.query(
        By.css('[matListItemLine]')
      );
      const imageElement = newDebugElement.query(
        By.css('img[matListItemAvatar]')
      );
      const linkElement = newDebugElement.query(By.css('a[mat-list-item]'));

      expect(titleElement.nativeElement.textContent.trim()).toBe(
        'New Album Name'
      );
      expect(subtitleElement.nativeElement.textContent.trim()).toBe(
        '2024-05-20'
      );
      expect(imageElement.nativeElement.src).toBe(
        'https://example.com/new-small.jpg'
      );
      expect(linkElement.nativeElement.href).toBe(
        'https://open.spotify.com/album/new'
      );
    });

    it('should maintain Material Design list item structure', () => {
      const listItemElement = debugElement.query(By.css('a[mat-list-item]'));
      const avatarElement = debugElement.query(By.css('[matListItemAvatar]'));
      const titleElement = debugElement.query(By.css('[matListItemTitle]'));
      const lineElement = debugElement.query(By.css('[matListItemLine]'));

      expect(listItemElement).toBeTruthy();
      expect(avatarElement).toBeTruthy();
      expect(titleElement).toBeTruthy();
      expect(lineElement).toBeTruthy();
    });
  });
});
