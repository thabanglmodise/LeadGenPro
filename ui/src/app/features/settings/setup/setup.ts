import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './setup.html',
})
export class SetupComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly config = inject(ConfigService);

  readonly form = this.fb.group({
    gp_key: [''],
    cl_key: [''],
    gm_email: [''],
  });

  readonly saving = signal(false);
  readonly testingGoogle = signal(false);
  readonly testingClaude = signal(false);
  readonly googleStatus = signal('');
  readonly claudeStatus = signal('');

  async ngOnInit() {
    if (!this.auth.user()?.id) return;
    await this.config.load();
    this.form.patchValue({ gm_email: this.config.gmEmail() });
  }

  async save() {
    if (!this.auth.user()?.id) return;
    this.saving.set(true);
    const _gp = this.form.value.gp_key?.trim();
    const _cl = this.form.value.cl_key?.trim();
    const _gm = this.form.value.gm_email?.trim();
    try {
      if (_gp || _cl) {
        await trpc.userApiKeys.save.mutate({
          ...(_gp ? { gp_key: _gp } : {}),
          ...(_cl ? { cl_key: _cl } : {}),
        });
      }
      if (_gm) await this.config.save({ gm_email: _gm });
      await this.config.load();
      this.form.patchValue({ gp_key: '', cl_key: '' });
    } finally {
      this.saving.set(false);
    }
  }

  async testGoogle() {
    this.testingGoogle.set(true);
    this.googleStatus.set('');
    try {
      const result = await trpc.config.testGoogle.query({ key: this.form.value.gp_key?.trim() || undefined });
      this.googleStatus.set(result.ok ? '✓ Connected' : `❌ ${result.status}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      this.googleStatus.set(`❌ ${msg}`);
    }
    this.testingGoogle.set(false);
  }

  async testClaude() {
    this.testingClaude.set(true);
    this.claudeStatus.set('');
    try {
      const result = await trpc.config.testClaude.query({ key: this.form.value.cl_key?.trim() || undefined });
      this.claudeStatus.set(result.ok ? '✓ Connected' : '❌ Invalid key');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      this.claudeStatus.set(`❌ ${msg}`);
    }
    this.testingClaude.set(false);
  }
}
