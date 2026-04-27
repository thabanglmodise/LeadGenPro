import { Injectable, computed, inject, signal } from '@angular/core';
import { Lead } from '../models/lead.model';
import { supabase } from '../supabase.client';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private readonly auth = inject(AuthService);
  private readonly _leads = signal<Lead[]>([]);

  readonly leads = this._leads.asReadonly();
  readonly totalLeads = computed(() => this._leads().length);
  readonly hotLeads = computed(() => this._leads().filter(l => l.ai_score === 'hot').length);
  readonly contactedLeads = computed(() => this._leads().filter(l => l.status === 'contacted').length);
  readonly newLeads = computed(() => this._leads().filter(l => l.status === 'new'));
  readonly contactedList = computed(() => this._leads().filter(l => l.status === 'contacted'));
  readonly repliedList = computed(() => this._leads().filter(l => l.status === 'replied'));
  readonly convertedList = computed(() => this._leads().filter(l => l.status === 'converted'));

  async loadLeads(): Promise<void> {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    this._leads.set((data as Lead[]) ?? []);
  }

  async addLeads(leads: Omit<Lead, 'id' | 'user_id' | 'created_at'>[]): Promise<void> {
    const userId = this.auth.user()!.id;
    const rows = leads.map(l => ({ ...l, user_id: userId }));
    const { data } = await supabase.from('leads').insert(rows).select();
    this._leads.update(current => [...((data as Lead[]) ?? []), ...current]);
  }

  async updateLead(id: string, patch: Partial<Lead>): Promise<void> {
    await supabase.from('leads').update(patch).eq('id', id);
    this._leads.update(leads =>
      leads.map(l => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  async deleteLead(id: string): Promise<void> {
    await supabase.from('leads').delete().eq('id', id);
    this._leads.update(leads => leads.filter(l => l.id !== id));
  }

  async clearAllLeads(): Promise<void> {
    await supabase.from('leads').delete().eq('user_id', this.auth.user()!.id);
    this._leads.set([]);
  }
}
