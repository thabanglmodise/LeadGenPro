import { Injectable, signal } from '@angular/core';
import { ActivityEntry } from '../models/activity.model';
import { trpc } from '../trpc.client';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly _activity = signal<ActivityEntry[]>([]);
  readonly activity = this._activity.asReadonly();

  async load(): Promise<void> {
    const data = await trpc.activity.list.query();
    this._activity.set(data as ActivityEntry[]);
  }

  async add(message: string): Promise<void> {
    const entry = await trpc.activity.add.mutate({ message });
    if (entry) {
      this._activity.update(a => [entry as ActivityEntry, ...a].slice(0, 20));
    }
  }
}
