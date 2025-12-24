import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Album } from '../album';
import { GsapService } from '../gsap.service';

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

  showOverlay: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private gsapService: GsapService,
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
   * Open album in Spotify
   */
  openAlbum(): void {
    if (this.album?.external_url) {
      window.open(this.album.external_url, '_blank');
    }
  }

  /**
   * Show overlay when mouse enters the card
   */
  onMouseEnter(): void {
    if (window.innerWidth <= 768) {
      return;
    }

    this.showOverlay = true;
    this.cdr.markForCheck();
  }

  /**
   * Handle mouse move for 3D tilt effect
   * Calculates rotation based on mouse position relative to card center
   * TODO: Find a way to make overlay buttons clickable without disabling 3D tilt
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
   * Reset 3D tilt and hide overlay when mouse leaves the card
   */
  onMouseLeave(): void {
    if (window.innerWidth <= 768) {
      return;
    }

    this.showOverlay = false;
    this.cdr.markForCheck();

    if (!this.cardRef) {
      return;
    }

    // Reset tilt to neutral position
    this.gsapService.resetTilt3D(this.cardRef.nativeElement, 0.5);
  }
}
