import { Image } from './image';
import { Album } from './album';

export interface Artist {
  id: string;
  href: string;
  name: string;
  popularity: number;
  images: Image[];
  external_url: string;
  albums?: Album[];
}
