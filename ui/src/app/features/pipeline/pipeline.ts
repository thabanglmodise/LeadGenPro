import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LeadsService } from '../../core/services/leads.service';
import { LeadScoreBadgeComponent } from '../../shared/components/lead-score-badge/lead-score-badge';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LeadScoreBadgeComponent],
  templateUrl: './pipeline.html',
})
export class PipelineComponent {
  protected readonly leadsService = inject(LeadsService);
}
