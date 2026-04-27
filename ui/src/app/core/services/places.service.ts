import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface PlaceResult {
  name: string;
  formatted_address: string;
  place_id: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  website?: string;
  formatted_phone_number?: string;
}

interface PlacesResponse {
  status: string;
  results: PlaceResult[];
  error_message?: string;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly http = inject(HttpClient);

  search(type: string, city: string, apiKey: string): Observable<PlaceResult[]> {
    const query = encodeURIComponent(`${type} in ${city}`);
    const target = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    const url = `https://corsproxy.io/?${encodeURIComponent(target)}`;
    return this.http.get<PlacesResponse>(url).pipe(
      map(res => {
        if (res.status !== 'OK' && res.status !== 'ZERO_RESULTS') {
          throw new Error(res.error_message ?? res.status);
        }
        return res.results ?? [];
      })
    );
  }
}
