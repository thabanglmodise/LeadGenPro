import { Injectable, signal } from '@angular/core';
import { ActivityEntry } from '../models/activity.model';
import { supabase } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly _activity = signal<ActivityEntry[]>([]);
  readonly activity = this._activity.asReadonly();

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('activity_log')
      .select('id, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    this._activity.set((data as ActivityEntry[]) ?? []);
  }

  async add(message: string, userId: string): Promise<void> {
    const { data } = await supabase
      .from('activity_log')
      .insert({ user_id: userId, message })
      .select('id, message, created_at')
      .single();
    if (data) {
      this._activity.update(a => [data as ActivityEntry, ...a].slice(0, 20));
    }
  }
}
