import { Signal, signal } from '@angular/core';

// Tracks first-load + in-flight state for a cached data set.
// loaded: true once any load has settled (success or failure) → drives skeleton vs content.
// loading: true while a request is in flight (incl. quiet background refreshes).
export class LoadTracker {
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);
  private inFlight: Promise<void> | null = null;

  readonly loaded: Signal<boolean> = this._loaded.asReadonly();
  readonly loading: Signal<boolean> = this._loading.asReadonly();

  // Concurrent callers share one request. Errors still propagate to callers.
  run(fn: () => Promise<void>): Promise<void> {
    if (this.inFlight) return this.inFlight;

    this._loading.set(true);
    const _self = this;
    this.inFlight = fn().finally(function settle() {
      _self._loaded.set(true);
      _self._loading.set(false);
      _self.inFlight = null;
    });
    return this.inFlight;
  }
}
