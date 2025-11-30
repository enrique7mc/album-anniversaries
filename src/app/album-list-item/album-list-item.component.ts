import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  NgZone,
} from '@angular/core';
import { Album } from '../album';
import { SpotifyService } from '../spotify.service';
import { GsapService } from '../gsap.service';
import { accessTokenKey } from '../constants';

@Component({
  selector: 'app-album-list-item',
  templateUrl: './album-list-item.component.html',
  styleUrls: ['./album-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumListItemComponent {
  @Input()
  album: Album;

  @ViewChild('cardWrapper') wrapperRef: ElementRef<HTMLElement>;
  @ViewChild('card') cardRef: ElementRef<HTMLElement>;

  isAddingToQueue: boolean = false;

  constructor(
    private spotifyService: SpotifyService,
    private cdr: ChangeDetectorRef,
    private gsapService: GsapService,
    private ngZone: NgZone,
  ) {}

  get altTag(): string {
    if (!this.album.name || this.album.name.trim() === '') {
      return 'Album cover';
    }
    return `Album cover for ${this.album.name}`;
  }

  get albumCoverUrl(): string {
    // Use the largest image (images[0]) for better quality in grid layout
    const image =
      this.album.images && this.album.images.length > 0
        ? this.album.images[0]
        : null;
    return image != null ? image.url : 'https://via.placeholder.com/300';
  }

  /**
   * Adds the album to the user's Spotify queue
   */
  addToQueue(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isAddingToQueue) {
      return;
    }

    const accessToken = localStorage.getItem(accessTokenKey);
    if (!accessToken) {
      console.log('Please log in to Spotify to add albums to your queue');
      return;
    }

    this.isAddingToQueue = true;
    this.cdr.markForCheck();

    this.spotifyService.addAlbumToQueue(accessToken, this.album.id).subscribe({
      next: () => {
        this.isAddingToQueue = false;
        this.cdr.markForCheck();
        console.log(`"${this.album.name}" added to queue`);
      },
      error: (error) => {
        this.isAddingToQueue = false;
        this.cdr.markForCheck();
        console.error('Error adding album to queue:', error);

        let errorMessage = 'Failed to add album to queue';
        if (error.status === 404) {
          errorMessage =
            'No active Spotify device found. Please start playing music on Spotify first.';
        } else if (error.status === 403) {
          errorMessage =
            'Permission denied. Please make sure you have granted queue permissions.';
        }

        console.error(errorMessage);
      },
    });
  }

  /**
   * Handle mouse move for 3D tilt effect
   * Calculates rotation based on mouse position relative to card center
   */
  onMouseMove(event: MouseEvent): void {
    // Skip on mobile devices
    if (window.innerWidth <= 768) {
      return;
    }

    if (!this.wrapperRef || !this.cardRef) {
      return;
    }

    const wrapper = this.wrapperRef.nativeElement;
    const card = this.cardRef.nativeElement;
    const rect = wrapper.getBoundingClientRect();

    // Get mouse position relative to card
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (max 15 degrees)
    const rotateY = ((x - centerX) / centerX) * 15;
    const rotateX = ((centerY - y) / centerY) * 15;

    // Apply tilt using GSAP
    this.gsapService.tilt3D(card, rotateX, rotateY, 0.3);
  }

  /**
   * Reset 3D tilt when mouse leaves the card
   */
  onMouseLeave(): void {
    if (window.innerWidth <= 768) {
      return;
    }

    if (!this.cardRef) {
      return;
    }

    // Reset tilt to neutral position
    this.gsapService.resetTilt3D(this.cardRef.nativeElement, 0.5);
  }
}
