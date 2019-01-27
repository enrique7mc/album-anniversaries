import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Album } from '../album';

@Component({
  selector: 'app-album-list-item',
  templateUrl: './album-list-item.component.html',
  styleUrls: ['./album-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumListItemComponent {
  @Input()
  album: Album;

  get altTag(): string {
    return `${this.album.name} photo`;
  }

  get albumCoverUrl(): string {
    const thumbnail = this.album.images[2];
    return thumbnail != null ? thumbnail.url : 'https://via.placeholder.com/40';
  }
}
