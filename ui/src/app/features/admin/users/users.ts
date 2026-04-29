import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { trpc } from '../../../core/trpc.client';

type UserRow = {
  id: string;
  biz_name: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  tier: string | null;
  key_list: string | null;
  updated_at: Date | null;
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.html',
})
export class AdminUsersComponent implements OnInit {
  readonly users = signal<UserRow[]>([]);
  readonly loading = signal(true);
  readonly actionError = signal('');

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const _result = await trpc.admin.listUsers.query();
      this.users.set(_result as UserRow[]);
    } finally {
      this.loading.set(false);
    }
  }

  async approve(userId: string): Promise<void> {
    this.actionError.set('');
    try {
      await trpc.admin.approveUser.mutate({ userId });
      await this.loadUsers();
    } catch {
      this.actionError.set('Failed to approve user. Try again.');
    }
  }

  async suspend(userId: string): Promise<void> {
    this.actionError.set('');
    try {
      await trpc.admin.suspendUser.mutate({ userId });
      await this.loadUsers();
    } catch {
      this.actionError.set('Failed to suspend user. Try again.');
    }
  }

  isActionable(user: UserRow): boolean {
    return user.role !== 'admin';
  }

  canApprove(user: UserRow): boolean {
    return user.status === 'pending_approval' || user.status === 'pending_verification';
  }

  canSuspend(user: UserRow): boolean {
    return user.status === 'active';
  }
}
