import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { AiScore } from '../../../core/models/lead.model';

@Component({
  selector: 'app-lead-score-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UpperCasePipe],
  template: `
    @if (score()) {
      <span class="lead-score-badge" [class]="'lead-score-badge--' + score()">
        {{ score() | uppercase }}
      </span>
    } @else {
      <span class="lead-score-badge lead-score-badge--none">—</span>
    }
  `,
  styles: [`
    .lead-score-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .lead-score-badge--hot { background: hsl(var(--hot) / 0.2); color: hsl(var(--hot)); }
    .lead-score-badge--warm { background: hsl(var(--warm) / 0.2); color: hsl(var(--warm)); }
    .lead-score-badge--cold { background: hsl(var(--accent) / 0.15); color: hsl(var(--accent)); }
    .lead-score-badge--none { background: hsl(var(--bg-4)); color: hsl(var(--muted)); }
  `],
})
export class LeadScoreBadgeComponent {
  readonly score = input<AiScore | null>(null);
}
