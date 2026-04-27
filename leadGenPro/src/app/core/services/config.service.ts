import { Injectable, computed, signal } from '@angular/core';
import { UserConfig } from '../models/user-config.model';
import { supabase } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly _config = signal<UserConfig | null>(null);

  readonly config = this._config.asReadonly();
  readonly hasGoogleKey = computed(() => !!this._config()?.gp_key);
  readonly hasClaudeKey = computed(() => !!this._config()?.cl_key);
  readonly hasGmail = computed(() => !!this._config()?.gm_email);

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('user_config')
      .select('*')
      .eq('id', userId)
      .single();
    this._config.set(data as UserConfig);
  }

  async save(patch: Partial<Omit<UserConfig, 'id'>>, userId: string): Promise<void> {
    await supabase
      .from('user_config')
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() });
    this._config.update(c => ({ ...c!, ...patch }));
  }
}
