import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trpc } from '../../../core/trpc.client';

type KeyMode = 'whitelist' | 'blacklist' | 'disabled';
type KeyList = 'default' | 'whitelisted' | 'blacklisted';
type Tier = 'basic' | 'plus' | 'pro';

type UserRow = {
  id: string;
  full_name: string | null;
  biz_name: string | null;
  status: string | null;
  tier: string | null;
  key_list: string | null;
};

const MODE_LABELS: Record<KeyMode, string> = {
  disabled: 'Disabled — no shared keys',
  blacklist: 'Blacklist — all users except blocked',
  whitelist: 'Whitelist — only explicitly allowed users',
};

@Component({
  selector: 'app-admin-api-keys',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './api-keys.html',
})
export class AdminApiKeysComponent implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly saved = signal('');

  readonly gpKey = signal('');
  readonly clKey = signal('');
  readonly hasGpKey = signal(false);
  readonly hasClKey = signal(false);
  readonly keyMode = signal<KeyMode>('disabled');
  readonly modeCycle: KeyMode[] = ['disabled', 'blacklist', 'whitelist'];
  readonly modeLabels = MODE_LABELS;

  readonly testing = signal<'gp' | 'cl' | null>(null);
  readonly testResult = signal('');
  readonly saving = signal(false);

  readonly users = signal<UserRow[]>([]);
  readonly loadingUsers = signal(true);
  readonly userActionError = signal('');

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSettings(), this.loadUsers()]);
  }

  private async loadSettings(): Promise<void> {
    this.loading.set(true);
    try {
      const _s = await trpc.admin.getFullSettings.query();
      this.keyMode.set((_s.global_key_mode as KeyMode) ?? 'disabled');
      this.hasGpKey.set(_s.has_gp_key);
      this.hasClKey.set(_s.has_cl_key);
    } catch {
      this.error.set('Failed to load settings.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadUsers(): Promise<void> {
    this.loadingUsers.set(true);
    try {
      this.users.set(await trpc.admin.listUsers.query() as UserRow[]);
    } finally {
      this.loadingUsers.set(false);
    }
  }

  currentModeLabel(): string {
    return this.modeLabels[this.keyMode()];
  }

  async cycleMode(): Promise<void> {
    const _idx = this.modeCycle.indexOf(this.keyMode());
    const _next = this.modeCycle[(_idx + 1) % this.modeCycle.length];
    this.saving.set(true);
    this.saved.set('');
    try {
      await trpc.admin.setGlobalKeyMode.mutate({ mode: _next });
      this.keyMode.set(_next);
      this.saved.set('Key policy updated.');
    } catch {
      this.error.set('Failed to update key policy.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveGpKey(): Promise<void> {
    const _key = this.gpKey().trim();
    if (!_key) return;
    this.saving.set(true);
    this.saved.set('');
    try {
      await trpc.admin.setGlobalKeys.mutate({ gp_key: _key });
      this.hasGpKey.set(true);
      this.gpKey.set('');
      this.saved.set('Google Places key saved.');
    } catch {
      this.error.set('Failed to save Google Places key.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveClKey(): Promise<void> {
    const _key = this.clKey().trim();
    if (!_key) return;
    this.saving.set(true);
    this.saved.set('');
    try {
      await trpc.admin.setGlobalKeys.mutate({ cl_key: _key });
      this.hasClKey.set(true);
      this.clKey.set('');
      this.saved.set('Anthropic key saved.');
    } catch {
      this.error.set('Failed to save Anthropic key.');
    } finally {
      this.saving.set(false);
    }
  }

  async testKey(type: 'gp' | 'cl'): Promise<void> {
    const _key = type === 'gp' ? this.gpKey().trim() : this.clKey().trim();
    if (!_key) return;
    this.testing.set(type);
    this.testResult.set('');
    try {
      await trpc.admin.testGlobalKey.mutate({ keyType: type, key: _key });
      this.testResult.set('✓ Key is valid.');
    } catch (err: unknown) {
      const _msg = err instanceof Error ? err.message : 'Key test failed.';
      this.testResult.set(`✗ ${_msg}`);
    } finally {
      this.testing.set(null);
    }
  }

  async setUserTier(userId: string, tier: string): Promise<void> {
    this.userActionError.set('');
    try {
      await trpc.admin.setUserTier.mutate({ userId, tier: tier as Tier });
      await this.loadUsers();
    } catch {
      this.userActionError.set('Failed to update tier.');
    }
  }

  async setKeyList(userId: string, key_list: string): Promise<void> {
    this.userActionError.set('');
    try {
      await trpc.admin.setUserKeyList.mutate({ userId, key_list: key_list as KeyList });
      await this.loadUsers();
    } catch {
      this.userActionError.set('Failed to update list membership.');
    }
  }

  displayName(user: UserRow): string {
    return user.full_name ?? user.biz_name ?? '—';
  }
}
