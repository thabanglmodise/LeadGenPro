import { Routes } from '@angular/router';

/* Admin panel routes — shell and pages built in Phase 3 */
export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  {
    path: 'overview',
    loadComponent: () => import('./overview/overview').then(m => m.AdminOverviewComponent),
  },
];
