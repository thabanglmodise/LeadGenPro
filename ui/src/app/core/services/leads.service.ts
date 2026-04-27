import { Injectable, computed, signal } from '@angular/core';
import { Lead } from '../models/lead.model';
import { trpc } from '../trpc.client';

@Injectable({ providedIn: 'root' })
export class LeadsService {
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
    const data = await trpc.leads.list.query();
    this._leads.set(data as Lead[]);
  }

  async addLeads(_leads: Omit<Lead, 'id' | 'user_id' | 'created_at'>[]): Promise<void> {
    const data = await trpc.leads.createMany.mutate(_leads);
    this._leads.update(current => [...(data as Lead[]), ...current]);
  }

  async updateLead(id: string, patch: Partial<Lead>): Promise<void> {
    await trpc.leads.update.mutate({ id, patch });
    this._leads.update(list => list.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }

  async deleteLead(id: string): Promise<void> {
    await trpc.leads.delete.mutate({ id });
    this._leads.update(list => list.filter(l => l.id !== id));
  }

  async clearAllLeads(): Promise<void> {
    await trpc.leads.clearAll.mutate();
    this._leads.set([]);
  }
}
