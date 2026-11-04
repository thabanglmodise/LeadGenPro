import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LeadsService } from '../../core/services/leads.service';
import { PipelineCardComponent } from '../../shared/components/pipeline-card/pipeline-card';
import { LeadStatus } from '../../core/models/lead.model';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PipelineCardComponent],
  templateUrl: './pipeline.html',
})
export class PipelineComponent {
  protected readonly leadsService = inject(LeadsService);

  async onStatusChange(leadId: string, status: LeadStatus, cardRef: PipelineCardComponent) {
    const _prev = this.leadsService.leads().find(l => l.id === leadId)?.status ?? 'new';
    try {
      await this.leadsService.updateStatus(leadId, status);
    } catch {
      cardRef.revertStatus(_prev);
    }
  }
}
