import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { trpc } from '../trpc.client';

export interface PlaceResult {
  name: string;
  formatted_address: string;
  place_id: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  website?: string;
  formatted_phone_number?: string;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  search(type: string, city: string): Observable<PlaceResult[]> {
    return from(trpc.places.search.query({ type, city })) as Observable<PlaceResult[]>;
  }
}
