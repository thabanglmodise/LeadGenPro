import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./app-shell').then(m => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'leads',
        loadChildren: () =>
          import('./features/leads/leads.routes').then(m => m.LEADS_ROUTES),
      },
      {
        path: 'pipeline',
        loadComponent: () =>
          import('./features/pipeline/pipeline').then(m => m.PipelineComponent),
      },
      {
        path: 'compose',
        loadComponent: () =>
          import('./features/compose/compose').then(m => m.ComposeComponent),
      },
      {
        path: 'sent',
        loadComponent: () =>
          import('./features/sent/sent').then(m => m.SentComponent),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: 'dashboard' },
];
