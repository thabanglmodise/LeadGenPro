import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-platform-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './platform-settings.html',
})
export class PlatformSettingsComponent implements OnInit {
  readonly autoApprove = signal(true);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const _settings = await trpc.admin.getSettings.query();
      this.autoApprove.set(_settings.auto_approve);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleAutoApprove(): Promise<void> {
    const _next = !this.autoApprove();
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');

    try {
      await trpc.admin.setAutoApprove.mutate({ value: _next });
      this.autoApprove.set(_next);
      this.saved.set(true);
    } catch {
      this.error.set('Failed to save. Try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
