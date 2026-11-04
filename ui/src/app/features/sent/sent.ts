import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { EmailService } from '../../core/services/email.service';
import { DatePipe } from '@angular/common';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-sent',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, SkeletonComponent],
  templateUrl: './sent.html',
})
export class SentComponent implements OnInit {
  protected readonly emailService = inject(EmailService);
  private readonly auth = inject(AuthService);
  readonly confirming = signal(false);

  async ngOnInit() {
    if (this.auth.user()?.id) await this.emailService.load();
  }

  async clearLog() {
    if (!this.auth.user()?.id) return;
    await this.emailService.clearLog();
    this.confirming.set(false);
  }
}
