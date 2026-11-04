import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar';
import { OnboardingWizardComponent } from './shared/components/onboarding-wizard/onboarding-wizard';
import { ThemeService } from './core/services/theme.service';
import { OnboardingService } from './core/services/onboarding.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, OnboardingWizardComponent],
  template: `
    <div class="flex min-h-screen" style="background: hsl(var(--bg))">
      @if (!isAuthRoute()) {
        <app-sidebar />
      }
      <main class="flex-1 min-w-0 overflow-auto">
        <router-outlet />
      </main>
    </div>
    @if (!isAuthRoute() && onboarding.showWizard()) {
      <app-onboarding-wizard />
    }
  `,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly _theme = inject(ThemeService);
  protected readonly onboarding = inject(OnboardingService);

  readonly isAuthRoute = computed(() => this.router.url.startsWith('/auth'));

  constructor() {
    effect(() => {
      const _user = this.auth.user();
      const _onAuth = this.isAuthRoute();
      if (_user && !_onAuth) {
        this.onboarding.load();
      }
    });
  }
}
