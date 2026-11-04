import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  function buildUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('role signal', () => {
    it('returns null when app_metadata is absent', () => {
      service = TestBed.inject(AuthService);
      expect(service.role()).toBeNull();
    });

    it('returns "admin" when app_metadata.role is "admin"', () => {
      service = TestBed.inject(AuthService);
      const _user = buildUser({ app_metadata: { role: 'admin' } });
      (service as unknown as { _user: { set: (v: unknown) => void } })._user.set(_user);
      expect(service.role()).toBe('admin');
    });

    it('returns "user" when app_metadata.role is "user"', () => {
      service = TestBed.inject(AuthService);
      const _user = buildUser({ app_metadata: { role: 'user' } });
      (service as unknown as { _user: { set: (v: unknown) => void } })._user.set(_user);
      expect(service.role()).toBe('user');
    });

    it('returns null when app_metadata has no role key', () => {
      service = TestBed.inject(AuthService);
      const _user = buildUser({ app_metadata: {} });
      (service as unknown as { _user: { set: (v: unknown) => void } })._user.set(_user);
      expect(service.role()).toBeNull();
    });
  });

  describe('profileStatus signal', () => {
    it('returns null when no user is set', () => {
      service = TestBed.inject(AuthService);
      expect(service.profileStatus()).toBeNull();
    });

    it('reflects the status set by loadProfileStatus', () => {
      service = TestBed.inject(AuthService);
      (service as unknown as { _profileStatus: { set: (v: unknown) => void } })._profileStatus.set('active');
      expect(service.profileStatus()).toBe('active');
    });

    it('reflects pending_approval status', () => {
      service = TestBed.inject(AuthService);
      (service as unknown as { _profileStatus: { set: (v: unknown) => void } })._profileStatus.set('pending_approval');
      expect(service.profileStatus()).toBe('pending_approval');
    });
  });

  describe('isLoggedIn', () => {
    it('is false when no user', () => {
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeFalsy();
    });

    it('is true when user is set', () => {
      service = TestBed.inject(AuthService);
      (service as unknown as { _user: { set: (v: unknown) => void } })._user.set(buildUser());
      expect(service.isLoggedIn()).toBeTruthy();
    });
  });
});
