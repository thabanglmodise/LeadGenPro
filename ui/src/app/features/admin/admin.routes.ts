import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell/admin-shell').then(m => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () => import('./overview/overview').then(m => m.AdminOverviewComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users').then(m => m.AdminUsersComponent),
      },
      {
        path: 'approval-queue',
        loadComponent: () => import('./approval-queue/approval-queue').then(m => m.ApprovalQueueComponent),
      },
      {
        path: 'invite',
        loadComponent: () => import('./invite/invite').then(m => m.InviteUserComponent),
      },
      {
        path: 'platform-settings',
        loadComponent: () => import('./platform-settings/platform-settings').then(m => m.PlatformSettingsComponent),
      },
      {
        path: 'api-keys',
        loadComponent: () => import('./api-keys/api-keys').then(m => m.AdminApiKeysComponent),
      },
    ],
  },
];
