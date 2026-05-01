import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function makeAuthService(overrides: {
  isLoggedIn?: boolean;
  profileStatus?: string | null;
}) {
  return {
    isLoggedIn: signal(overrides.isLoggedIn ?? false),
    profileStatus: signal(overrides.profileStatus ?? null),
    ensureProfileLoaded: vi.fn().mockResolvedValue(undefined),
  };
}

describe('authGuard', () => {
  let mockRouter: { parseUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = { parseUrl: vi.fn().mockImplementation((url: string) => url) };
  });

  async function runGuard(authOverrides: { isLoggedIn?: boolean; profileStatus?: string | null }) {
    const _auth = makeAuthService(authOverrides);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: _auth },
        { provide: Router, useValue: mockRouter },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    );
  }

  it('redirects to /auth/login when not logged in', async () => {
    await runGuard({ isLoggedIn: false });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('returns true for active user', async () => {
    const _result = await runGuard({ isLoggedIn: true, profileStatus: 'active' });
    expect(_result).toBeTruthy();
  });

  it('redirects to /auth/verify-prompt for pending_verification', async () => {
    await runGuard({ isLoggedIn: true, profileStatus: 'pending_verification' });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/auth/verify-prompt');
  });

  it('redirects to /auth/pending for pending_approval', async () => {
    await runGuard({ isLoggedIn: true, profileStatus: 'pending_approval' });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/auth/pending');
  });

  it('redirects to /auth/suspended for suspended', async () => {
    await runGuard({ isLoggedIn: true, profileStatus: 'suspended' });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/auth/suspended');
  });
});
