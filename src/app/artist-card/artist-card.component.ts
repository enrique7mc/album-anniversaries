import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Artist } from '../artist';
import { Album } from '../album';

@Component({
  selector: 'app-artist-card',
  templateUrl: './artist-card.component.html',
  styleUrls: ['./artist-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistCardComponent {
  @Input()
  artist: Artist;

  get altTag(): string {
    return `${this.artist.name} photo`;
  }

  get artistImageUrl(): string {
    const largestImage = this.artist.images[0];
    return largestImage != null
      ? largestImage.url
      : 'https://via.placeholder.com/600';
  }
}
