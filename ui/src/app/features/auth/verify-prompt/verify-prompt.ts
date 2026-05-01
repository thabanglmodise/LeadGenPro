import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-verify-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './verify-prompt.html',
})
export class VerifyPromptComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly advancing = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.tryAdvance();
  }

  private async tryAdvance(): Promise<void> {
    const _user = this.auth.user();
    if (!_user) return;

    /* email_confirmed_at is set once the user clicks the verification link */
    const _confirmed = !!(_user as { email_confirmed_at?: string }).email_confirmed_at;
    if (!_confirmed) return;

    this.advancing.set(true);
    this.error.set('');

    try {
      const _result = await trpc.auth.advanceStatus.mutate();
      await this.auth.refreshProfileStatus();

      if (_result.status === 'active') {
        await this.router.navigateByUrl('/dashboard');
      } else if (_result.status === 'pending_approval') {
        await this.router.navigateByUrl('/auth/pending');
      }
    } catch {
      this.error.set('Could not advance account status. Please try signing in again.');
    } finally {
      this.advancing.set(false);
    }
  }

  async resendVerification(): Promise<void> {
    const _email = this.auth.user()?.email;
    if (!_email) return;
    await this.auth.resetPassword(_email);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
