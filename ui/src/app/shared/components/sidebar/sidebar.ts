import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';
import { EmailService } from '../../../core/services/email.service';
import { LeadsService } from '../../../core/services/leads.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly config = inject(ConfigService);
  protected readonly leads = inject(LeadsService);
  protected readonly email = inject(EmailService);
  protected readonly themeService = inject(ThemeService);

  readonly gmailConnected = computed(() => this.config.hasGmail());
  readonly totalLeads = computed(() => this.leads.totalLeads());
  readonly sentCount = computed(() => this.email.sentCount());
  readonly isDark = computed(() => this.themeService.theme() === 'dark');
  readonly showByok = computed(() => {
    const _t = this.auth.tier();
    return _t === 'plus' || _t === 'pro';
  });

  async signOut() {
    await this.auth.signOut();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
