import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

function makeAuthService(overrides: { isLoggedIn?: boolean; role?: string | null }) {
  return {
    isLoggedIn: signal(overrides.isLoggedIn ?? false),
    role: signal(overrides.role ?? null),
  };
}

describe('adminGuard', () => {
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['parseUrl']);
    mockRouter.parseUrl.and.callFake((url: string) => url as unknown as ReturnType<Router['parseUrl']>);
  });

  function runGuard(authOverrides: { isLoggedIn?: boolean; role?: string | null }) {
    const _auth = makeAuthService(authOverrides);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: _auth },
        { provide: Router, useValue: mockRouter },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      adminGuard({} as never, {} as never),
    );
  }

  it('redirects to /auth/login when not logged in', () => {
    runGuard({ isLoggedIn: false });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('returns true for admin user', () => {
    const _result = runGuard({ isLoggedIn: true, role: 'admin' });
    expect(_result).toBeTrue();
  });

  it('redirects to /dashboard for a user with role "user"', () => {
    runGuard({ isLoggedIn: true, role: 'user' });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for a user with no role', () => {
    runGuard({ isLoggedIn: true, role: null });
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/dashboard');
  });
});
