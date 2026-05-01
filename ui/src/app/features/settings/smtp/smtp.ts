import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-smtp-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './smtp.html',
})
export class SmtpSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    smtp_host: ['', Validators.required],
    smtp_port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
    smtp_user: ['', Validators.required],
    smtp_pass: ['', Validators.required],
    smtp_from_name: ['', Validators.required],
    smtp_from_email: ['', [Validators.required, Validators.email]],
  });

  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly saveSuccess = signal(false);
  readonly testResult = signal<'ok' | 'error' | null>(null);
  readonly error = signal('');
  readonly hasSavedCreds = signal(false);

  async ngOnInit() {
    const _status = await trpc.userApiKeys.load.query();
    this.hasSavedCreds.set(_status.has_smtp);
  }

  async save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.saveSuccess.set(false);
    try {
      const _v = this.form.value;
      await trpc.userApiKeys.saveSmtp.mutate({
        smtp_host: _v.smtp_host!,
        smtp_port: Number(_v.smtp_port),
        smtp_user: _v.smtp_user!,
        smtp_pass: _v.smtp_pass!,
        smtp_from_name: _v.smtp_from_name!,
        smtp_from_email: _v.smtp_from_email!,
      });
      this.saveSuccess.set(true);
      this.hasSavedCreds.set(true);
      this.form.patchValue({ smtp_pass: '' });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  async testConnection() {
    if (this.testing()) return;
    this.testing.set(true);
    this.testResult.set(null);
    this.error.set('');
    try {
      await trpc.email.testSmtp.mutate();
      this.testResult.set('ok');
    } catch (err) {
      this.testResult.set('error');
      this.error.set(err instanceof Error ? err.message : 'SMTP test failed');
    } finally {
      this.testing.set(false);
    }
  }
}
