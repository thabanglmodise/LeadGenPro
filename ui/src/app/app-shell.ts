import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { computed } from '@angular/core';
import { SidebarComponent } from './shared/components/sidebar/sidebar';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="flex min-h-screen" style="background: hsl(var(--bg))">
      @if (!isAuthRoute()) {
        <app-sidebar />
      }
      <main class="flex-1 min-w-0 overflow-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  readonly isAuthRoute = computed(() => this.router.url.startsWith('/auth'));
}
