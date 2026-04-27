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
    const v = this.form.value;
    await this.config.save({
      ...(v.gp_key ? { gp_key: v.gp_key } : {}),
      ...(v.cl_key ? { cl_key: v.cl_key } : {}),
      ...(v.gm_email ? { gm_email: v.gm_email } : {}),
    });
    this.form.patchValue({ gp_key: '', cl_key: '' });
    this.saving.set(false);
  }

  async testGoogle() {
    this.testingGoogle.set(true);
    this.googleStatus.set('');
    try {
      const result = await trpc.config.testGoogle.query();
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
      const result = await trpc.config.testClaude.query();
      this.claudeStatus.set(result.ok ? '✓ Connected' : '❌ Invalid key');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      this.claudeStatus.set(`❌ ${msg}`);
    }
    this.testingClaude.set(false);
  }
}
