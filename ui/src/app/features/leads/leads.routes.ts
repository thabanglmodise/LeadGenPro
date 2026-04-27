import { Routes } from '@angular/router';

export const LEADS_ROUTES: Routes = [
  {
    path: 'find',
    loadComponent: () =>
      import('./find/find-leads').then(m => m.FindLeadsComponent),
  },
  { path: '', redirectTo: 'find', pathMatch: 'full' },
];
