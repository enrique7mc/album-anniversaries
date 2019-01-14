import { Image } from './image';

export interface Album {
  id: string;
  artist_id: string;
  name: string;
  release_date: string;
  release_date_precision: string;
  images: Image[];
}
