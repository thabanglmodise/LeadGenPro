import { Injectable, signal } from '@angular/core';
import { Profile } from '../models/profile.model';
import { supabase } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly _profile = signal<Profile | null>(null);
  readonly profile = this._profile.asReadonly();

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    this._profile.set(data as Profile);
  }

  async save(patch: Partial<Omit<Profile, 'id'>>, userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() });
    this._profile.update(p => ({ ...p!, ...patch }));
  }
}
