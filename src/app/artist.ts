import { Image } from './image';

export interface Artist {
  id: string;
  href: string;
  name: string;
  popularity: number;
  images: Image[];
  external_url: string;
}
