import { Injectable, signal } from '@angular/core';
import { ActivityEntry } from '../models/activity.model';
import { trpc } from '../trpc.client';
import { LoadTracker } from '../utils/load-tracker';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly _activity = signal<ActivityEntry[]>([]);
  private readonly tracker = new LoadTracker();

  // false until first load settles → pages show skeletons
  readonly loaded = this.tracker.loaded;
  readonly activity = this._activity.asReadonly();

  load(): Promise<void> {
    const _activitySignal = this._activity;
    return this.tracker.run(async function fetchActivity() {
      const data = await trpc.activity.list.query();
      _activitySignal.set(data as ActivityEntry[]);
    });
  }

  async add(message: string): Promise<void> {
    const entry = await trpc.activity.add.mutate({ message });
    if (entry) {
      this._activity.update(a => [entry as ActivityEntry, ...a].slice(0, 20));
    }
  }
}
