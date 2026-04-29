import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pending',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './pending.html',
})
export class PendingComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
