import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-settings-api-keys',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './api-keys.html',
})
export class SettingsApiKeysComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly tier = computed(() => this.auth.tier());
  readonly isPro = computed(() => this.tier() === 'pro');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');

  readonly gpKey = signal('');
  readonly clKey = signal('');
  readonly hasGpKey = signal(false);
  readonly hasClKey = signal(false);
  readonly preferGlobal = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const _data = await trpc.userApiKeys.load.query();
      this.hasGpKey.set(_data.has_gp_key);
      this.hasClKey.set(_data.has_cl_key);
      this.preferGlobal.set(_data.prefer_global);
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    try {
      const _input: { gp_key?: string; cl_key?: string; prefer_global?: boolean } = {};
      const _gp = this.gpKey().trim();
      const _cl = this.clKey().trim();
      if (_gp) _input.gp_key = _gp;
      if (_cl) _input.cl_key = _cl;
      _input.prefer_global = this.preferGlobal();

      await trpc.userApiKeys.save.mutate(_input);
      if (_gp) { this.hasGpKey.set(true); this.gpKey.set(''); }
      if (_cl) { this.hasClKey.set(true); this.clKey.set(''); }
      this.saved.set(true);
    } catch {
      this.error.set('Failed to save. Try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
