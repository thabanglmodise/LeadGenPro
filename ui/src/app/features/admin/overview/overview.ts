import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { trpc } from '../../../core/trpc.client';

interface OverviewStats {
  total: number;
  active: number;
  pendingApproval: number;
  suspended: number;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
})
export class AdminOverviewComponent implements OnInit {
  readonly stats = signal<OverviewStats>({ total: 0, active: 0, pendingApproval: 0, suspended: 0 });
  readonly autoApprove = signal(true);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const [_users, _settings] = await Promise.all([
        trpc.admin.listUsers.query(),
        trpc.admin.getSettings.query(),
      ]);

      this.stats.set({
        total: _users.length,
        active: _users.filter(u => u.status === 'active').length,
        pendingApproval: _users.filter(u => u.status === 'pending_approval').length,
        suspended: _users.filter(u => u.status === 'suspended').length,
      });

      this.autoApprove.set(_settings.auto_approve);
    } finally {
      this.loading.set(false);
    }
  }
}
