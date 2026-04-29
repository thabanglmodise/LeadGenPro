import { Injectable, signal } from '@angular/core';
import { Profile } from '../models/profile.model';
import { trpc } from '../trpc.client';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly _profile = signal<Profile | null>(null);
  readonly profile = this._profile.asReadonly();

  async load(): Promise<void> {
    const data = await trpc.profile.load.query();
    this._profile.set(data as Profile | null);
  }

  async save(patch: Partial<Omit<Profile, 'id'>>): Promise<void> {
    const updated = await trpc.profile.save.mutate(patch);
    this._profile.update(p => ({ ...p!, ...(updated as unknown as Profile) }));
  }
}
