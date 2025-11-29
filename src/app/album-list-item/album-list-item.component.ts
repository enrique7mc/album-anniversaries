import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef,
} from '@angular/core';
import { Album } from '../album';
import { SpotifyService } from '../spotify.service';
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

  isAddingToQueue: boolean = false;

  constructor(
    private spotifyService: SpotifyService,
    private cdr: ChangeDetectorRef,
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
}
