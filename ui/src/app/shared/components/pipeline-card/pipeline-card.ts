import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Lead, LeadStatus } from '../../../core/models/lead.model';
import { LeadScoreBadgeComponent } from '../lead-score-badge/lead-score-badge';

const STAGES: LeadStatus[] = ['new', 'contacted', 'replied', 'converted'];

@Component({
  selector: 'app-pipeline-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LeadScoreBadgeComponent],
  templateUrl: './pipeline-card.html',
})
export class PipelineCardComponent implements OnChanges {
  @Input({ required: true }) lead!: Lead;
  @Output() statusChange = new EventEmitter<LeadStatus>();

  readonly stages = STAGES;
  readonly displayStatus = signal<LeadStatus>('new');

  ngOnChanges() {
    this.displayStatus.set(this.lead.status);
  }

  onStageChange(value: string) {
    const _prev = this.displayStatus();
    const _next = value as LeadStatus;
    this.displayStatus.set(_next);
    this.statusChange.emit(_next);
  }

  revertStatus(status: LeadStatus) {
    this.displayStatus.set(status);
  }
}
