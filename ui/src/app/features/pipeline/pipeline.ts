import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { LeadsService } from '../../core/services/leads.service';
import { PipelineCardComponent } from '../../shared/components/pipeline-card/pipeline-card';
import { LeadStatus } from '../../core/models/lead.model';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PipelineCardComponent, SkeletonComponent],
  templateUrl: './pipeline.html',
})
export class PipelineComponent implements OnInit {
  protected readonly leadsService = inject(LeadsService);

  // Load (or quietly refresh) leads — page previously relied on another page having loaded them.
  async ngOnInit(): Promise<void> {
    try {
      await this.leadsService.loadLeads();
    } catch {
      /* non-fatal — loaded() still settles, page shows empty columns */
    }
  }

  async onStatusChange(leadId: string, status: LeadStatus, cardRef: PipelineCardComponent) {
    const _prev = this.leadsService.leads().find(l => l.id === leadId)?.status ?? 'new';
    try {
      await this.leadsService.updateStatus(leadId, status);
    } catch {
      cardRef.revertStatus(_prev);
    }
  }
}
