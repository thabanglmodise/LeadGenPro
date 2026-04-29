import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup').then(m => m.SignupComponent),
  },
  {
    path: 'reset',
    loadComponent: () => import('./reset/reset').then(m => m.ResetComponent),
  },
  {
    path: 'verify-prompt',
    loadComponent: () => import('./verify-prompt/verify-prompt').then(m => m.VerifyPromptComponent),
  },
  {
    path: 'pending',
    loadComponent: () => import('./pending/pending').then(m => m.PendingComponent),
  },
  {
    path: 'suspended',
    loadComponent: () => import('./suspended/suspended').then(m => m.SuspendedComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
