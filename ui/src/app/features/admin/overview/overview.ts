import { ChangeDetectionStrategy, Component } from '@angular/core';

/* Stub — full admin panel built in Phase 3 */
@Component({
  selector: 'app-admin-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">Admin Overview</h1>
        <p class="page__subtitle">Admin panel — coming in Phase 3</p>
      </div>
    </div>
  `,
})
export class AdminOverviewComponent {}
