import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: 'setup',
    loadComponent: () => import('./setup/setup').then(m => m.SetupComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile').then(m => m.ProfileComponent),
  },
  {
    path: 'api-keys',
    loadComponent: () => import('./api-keys/api-keys').then(m => m.SettingsApiKeysComponent),
  },
  {
    path: 'smtp',
    loadComponent: () => import('./smtp/smtp').then(m => m.SmtpSettingsComponent),
  },
  { path: '', redirectTo: 'setup', pathMatch: 'full' },
];
