import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-invite-user',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './invite.html',
})
export class InviteUserComponent {
  readonly email = signal('');
  readonly sending = signal(false);
  readonly success = signal(false);
  readonly error = signal('');

  async send(): Promise<void> {
    const _email = this.email().trim();
    if (!_email) return;

    this.sending.set(true);
    this.success.set(false);
    this.error.set('');

    try {
      await trpc.admin.inviteUser.mutate({ email: _email });
      this.success.set(true);
      this.email.set('');
    } catch (err: unknown) {
      const _msg = err instanceof Error ? err.message : 'Failed to send invite.';
      this.error.set(_msg);
    } finally {
      this.sending.set(false);
    }
  }
}
