import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtistCardComponent } from './artist-card.component';
import { MaterialModule } from '../material/material.module';
import { Artist } from '../artist';
import { AlbumListItemComponent } from '../album-list-item/album-list-item.component';

describe('ArtistCardComponent', () => {
  let component: ArtistCardComponent;
  let fixture: ComponentFixture<ArtistCardComponent>;

  const artist: Artist = {
    id: '',
    href: '',
    name: '',
    popularity: 0,
    images: [{ heigth: 0, width: 0, url: '' }],
    external_url: '',
    albums: []
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
    component.artist = artist;
    fixture.detectChanges();
  });

  it('should create artist card', () => {
    expect(component).toBeTruthy();
  });
});
