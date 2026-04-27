import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { EmailService } from '../../core/services/email.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-sent',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './sent.html',
})
export class SentComponent implements OnInit {
  protected readonly emailService = inject(EmailService);
  private readonly auth = inject(AuthService);
  readonly confirming = signal(false);

  async ngOnInit() {
    const userId = this.auth.user()?.id;
    if (userId) await this.emailService.load(userId);
  }

  async clearLog() {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    await this.emailService.clearLog(userId);
    this.confirming.set(false);
  }
}
