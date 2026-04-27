import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: 'setup',
    loadComponent: () => import('./setup/setup').then(m => m.SetupComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile').then(m => m.ProfileComponent),
  },
  { path: '', redirectTo: 'setup', pathMatch: 'full' },
];
