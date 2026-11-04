import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureProfileLoaded();

  if (!auth.isLoggedIn()) return router.parseUrl('/auth/login');

  const _status = auth.profileStatus();

  if (_status === 'pending_verification') return router.parseUrl('/auth/verify-prompt');
  if (_status === 'pending_approval') return router.parseUrl('/auth/pending');
  if (_status === 'suspended') return router.parseUrl('/auth/suspended');

  return true;
};
