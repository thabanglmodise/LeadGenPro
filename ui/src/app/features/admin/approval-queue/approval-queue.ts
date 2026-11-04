import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { trpc } from '../../../core/trpc.client';

type UserRow = {
  id: string;
  biz_name: string | null;
  full_name: string | null;
  status: string | null;
  tier: string | null;
};

@Component({
  selector: 'app-approval-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './approval-queue.html',
})
export class ApprovalQueueComponent implements OnInit {
  private readonly _allUsers = signal<UserRow[]>([]);
  readonly pending = computed(() =>
    this._allUsers().filter(u => u.status === 'pending_approval'),
  );
  readonly loading = signal(true);
  readonly actionError = signal('');

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const _result = await trpc.admin.listUsers.query();
      this._allUsers.set(_result as UserRow[]);
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

  async reject(userId: string): Promise<void> {
    this.actionError.set('');
    try {
      await trpc.admin.suspendUser.mutate({ userId });
      await this.loadUsers();
    } catch {
      this.actionError.set('Failed to reject user. Try again.');
    }
  }
}
