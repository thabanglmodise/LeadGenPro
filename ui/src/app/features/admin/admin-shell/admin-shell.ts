import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { trpc } from '../../../core/trpc.client';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
})
export class AdminShellComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly isDark = computed(() => this.themeService.theme() === 'dark');
  readonly pendingCount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadPendingCount();
  }

  private async loadPendingCount(): Promise<void> {
    try {
      const _users = await trpc.admin.listUsers.query();
      const _count = _users.filter(u => u.status === 'pending_approval').length;
      this.pendingCount.set(_count);
    } catch {
      /* non-fatal — badge simply stays at 0 */
    }
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/auth/login');
  }
}
