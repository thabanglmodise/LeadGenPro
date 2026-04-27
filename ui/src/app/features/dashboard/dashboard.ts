import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivityService } from '../../core/services/activity.service';
import { EmailService } from '../../core/services/email.service';
import { LeadsService } from '../../core/services/leads.service';
import { AuthService } from '../../core/services/auth.service';
import { LeadScoreBadgeComponent } from '../../shared/components/lead-score-badge/lead-score-badge';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeadScoreBadgeComponent, DatePipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  protected readonly leadsService = inject(LeadsService);
  protected readonly emailService = inject(EmailService);
  protected readonly activityService = inject(ActivityService);
  protected readonly auth = inject(AuthService);

  readonly recentActivity = this.activityService.activity;

  async ngOnInit() {
    if (!this.auth.user()?.id) return;
    await Promise.all([
      this.leadsService.loadLeads(),
      this.emailService.load(),
      this.activityService.load(),
    ]);
  }
}
