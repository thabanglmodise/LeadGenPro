import { Injectable, computed, signal } from '@angular/core';
import { trpc } from '../trpc.client';

interface ConfigState {
  hasGpKey: boolean;
  hasClKey: boolean;
  gmEmail: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly _config = signal<ConfigState | null>(null);

  readonly config = this._config.asReadonly();
  readonly hasGoogleKey = computed(() => this._config()?.hasGpKey ?? false);
  readonly hasClaudeKey = computed(() => this._config()?.hasClKey ?? false);
  readonly hasGmail = computed(() => !!this._config()?.gmEmail);
  readonly gmEmail = computed(() => this._config()?.gmEmail ?? '');

  async load(): Promise<void> {
    const data = await trpc.config.load.query();
    this._config.set(data);
  }

  async save(patch: { gm_email?: string }): Promise<void> {
    await trpc.config.save.mutate(patch);
    this._config.update(c => ({
      hasGpKey: c?.hasGpKey ?? false,
      hasClKey: c?.hasClKey ?? false,
      gmEmail: patch.gm_email ?? (c?.gmEmail ?? ''),
    }));
  }
}
