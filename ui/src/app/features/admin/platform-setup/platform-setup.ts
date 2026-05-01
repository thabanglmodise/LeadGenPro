import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { trpc } from '../../../core/trpc.client';

type HealthStatus = 'checking' | 'ok' | 'error';

@Component({
  selector: 'app-platform-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './platform-setup.html',
})
export class PlatformSetupComponent implements OnInit {
  readonly healthStatus = signal<HealthStatus>('checking');
  readonly healthTimestamp = signal('');
  readonly healthError = signal('');

  readonly hasGpKey = signal(false);
  readonly hasClKey = signal(false);
  readonly keyMode = signal('disabled');
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.checkHealth(), this.loadSettings()]);
  }

  async checkHealth(): Promise<void> {
    this.healthStatus.set('checking');
    try {
      const _result = await trpc.onboarding.healthCheck.query();
      this.healthStatus.set('ok');
      this.healthTimestamp.set(new Date(_result.timestamp).toLocaleTimeString());
    } catch {
      this.healthStatus.set('error');
      this.healthError.set('Could not reach the database.');
    }
  }

  private async loadSettings(): Promise<void> {
    this.loading.set(true);
    try {
      const _s = await trpc.admin.getFullSettings.query();
      this.hasGpKey.set(_s.has_gp_key);
      this.hasClKey.set(_s.has_cl_key);
      this.keyMode.set(_s.global_key_mode);
    } finally {
      this.loading.set(false);
    }
  }
}
