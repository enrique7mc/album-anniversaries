import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumListItemComponent } from './album-list-item.component';
import { MaterialModule } from '../material/material.module';
import { Album } from '../album';

describe('AlbumListItemComponent', () => {
  let component: AlbumListItemComponent;
  let fixture: ComponentFixture<AlbumListItemComponent>;

  const album: Album = {
    id: '',
    artist_id: '',
    name: '',
    release_date: '',
    release_date_precision: '',
    images: [],
    external_url: ''
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [AlbumListItemComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AlbumListItemComponent);
    component = fixture.componentInstance;
    component.album = album;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
