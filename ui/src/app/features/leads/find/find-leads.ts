import {
  ChangeDetectionStrategy, Component, OnInit, inject, signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Lead } from '../../../core/models/lead.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClaudeService } from '../../../core/services/claude.service';
import { ConfigService } from '../../../core/services/config.service';
import { LeadsService } from '../../../core/services/leads.service';
import { PlacesService } from '../../../core/services/places.service';
import { LeadScoreBadgeComponent } from '../../../shared/components/lead-score-badge/lead-score-badge';

@Component({
  selector: 'app-find-leads',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, LeadScoreBadgeComponent],
  templateUrl: './find-leads.html',
})
export class FindLeadsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly config = inject(ConfigService);
  protected readonly leadsService = inject(LeadsService);
  private readonly places = inject(PlacesService);
  private readonly claude = inject(ClaudeService);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.group({
    businessType: ['', Validators.required],
    city: ['', Validators.required],
    count: [20],
    offering: [''],
  });

  readonly searching = signal(false);
  readonly scoring = signal(false);
  readonly error = signal('');
  readonly displayedLeads = signal<Lead[]>([]);

  async ngOnInit() {
    await this.leadsService.loadLeads();
    const userId = this.auth.user()?.id;
    if (userId) {
      await this.config.load(userId);
    }
    this.displayedLeads.set(this.leadsService.leads());
  }

  async onSearch() {
    if (this.form.invalid || this.searching()) return;
    if (!this.config.hasGoogleKey()) {
      this.error.set('Add your Google Places API key in Settings → API Setup first.');
      return;
    }
    this.searching.set(true);
    this.error.set('');
    const { businessType, city, offering } = this.form.value;

    this.places.search(businessType!, city!, this.config.config()!.gp_key).subscribe({
      next: async (results) => {
        const newLeads = results.map(r => ({
          name: r.name,
          address: r.formatted_address ?? '',
          city: city!,
          type: businessType!,
          types: r.types ?? [],
          rating: r.rating ?? null,
          total_ratings: r.user_ratings_total ?? 0,
          place_id: r.place_id,
          website: r.website ?? '',
          phone: r.formatted_phone_number ?? '',
          contact_name: '',
          contact_email: '',
          ai_score: null,
          ai_reason: '',
          offering: offering ?? '',
          status: 'new' as const,
        }));
        await this.leadsService.addLeads(newLeads);
        this.displayedLeads.set(this.leadsService.leads());
        this.searching.set(false);
        if (this.config.hasClaudeKey()) {
          this.autoScore();
        }
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.searching.set(false);
      },
    });
  }

  autoScore() {
    const unscoredLeads = this.leadsService.leads().filter(l => !l.ai_score);
    if (unscoredLeads.length === 0 || !this.config.hasClaudeKey()) return;
    this.scoring.set(true);
    const offering = this.form.value.offering ?? '';
    const batches: Lead[][] = [];
    for (let i = 0; i < unscoredLeads.length; i += 5) {
      batches.push(unscoredLeads.slice(i, i + 5));
    }
    let done = 0;
    for (const batch of batches) {
      this.claude.scoreBatch(batch, offering, this.config.config()!.cl_key).subscribe({
        next: async (scores) => {
          for (const s of scores) {
            await this.leadsService.updateLead(s.id, { ai_score: s.score, ai_reason: s.reason });
          }
          done++;
          if (done === batches.length) this.scoring.set(false);
        },
        error: () => { done++; if (done === batches.length) this.scoring.set(false); },
      });
    }
  }

  exportCSV() {
    const rows = this.leadsService.leads() as unknown as Record<string, unknown>[];
    if (rows.length === 0) return;
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async deleteLead(id: string) {
    await this.leadsService.deleteLead(id);
    this.displayedLeads.set(this.leadsService.leads());
  }
}
