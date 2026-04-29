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
    ensureProfileLoaded: jasmine.createSpy('ensureProfileLoaded').and.returnValue(Promise.resolve()),
  };
}

describe('authGuard', () => {
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['parseUrl']);
    mockRouter.parseUrl.and.callFake((url: string) => url as unknown as ReturnType<Router['parseUrl']>);
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
    const _result = await runGuard({ isLoggedIn: false });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('returns true for active user', async () => {
    const _result = await runGuard({ isLoggedIn: true, profileStatus: 'active' });
    expect(_result).toBeTrue();
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
