import { PLATFORM_ID, Injectable, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SentEmail } from '../models/sent-email.model';
import { trpc } from '../trpc.client';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _sent = signal<SentEmail[]>([]);
  readonly sent = this._sent.asReadonly();
  readonly sentCount = computed(() => this._sent().length);

  async load(): Promise<void> {
    const data = await trpc.email.list.query();
    this._sent.set(data as SentEmail[]);
  }

  async logSent(to: string, subject: string, body: string, send_method?: 'smtp' | 'mailto' | 'clipboard'): Promise<void> {
    const entry = await trpc.email.log.mutate({ to_email: to, subject, body, send_method });
    if (entry) {
      this._sent.update(s => [entry as SentEmail, ...s]);
    }
  }

  openGmailCompose(to: string, subject: string, body: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }

  exportCSV(rows: Record<string, unknown>[], filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const header = Object.keys(rows[0] ?? {}).join(',');
    const body = rows
      .map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async clearLog(): Promise<void> {
    await trpc.email.clearLog.mutate();
    this._sent.set([]);
  }
}
