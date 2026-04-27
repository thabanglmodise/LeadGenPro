import { PLATFORM_ID, Injectable, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SentEmail } from '../models/sent-email.model';
import { supabase } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _sent = signal<SentEmail[]>([]);
  readonly sent = this._sent.asReadonly();
  readonly sentCount = computed(() => this._sent().length);

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('sent_emails')
      .select('id, to_email, subject, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });
    this._sent.set((data as SentEmail[]) ?? []);
  }

  async logSent(to: string, subject: string, body: string, userId: string): Promise<void> {
    const { data } = await supabase
      .from('sent_emails')
      .insert({ user_id: userId, to_email: to, subject, body })
      .select('id, to_email, subject, sent_at')
      .single();
    if (data) {
      this._sent.update(s => [data as SentEmail, ...s]);
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
    const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async clearLog(userId: string): Promise<void> {
    await supabase.from('sent_emails').delete().eq('user_id', userId);
    this._sent.set([]);
  }
}
