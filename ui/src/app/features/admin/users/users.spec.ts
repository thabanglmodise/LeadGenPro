import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AdminUsersComponent } from './users';

const MOCK_USERS = [
  { id: 'u1', full_name: 'Alice', biz_name: null, role: 'user',  status: 'active',           tier: 'basic', key_list: 'default', updated_at: null },
  { id: 'u2', full_name: 'Bob',   biz_name: null, role: 'user',  status: 'pending_approval', tier: 'basic', key_list: 'default', updated_at: null },
  { id: 'u3', full_name: null,    biz_name: null, role: 'admin', status: 'active',           tier: 'pro',   key_list: 'default', updated_at: null },
];

describe('AdminUsersComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('isActionable returns false for admin users', () => {
    const _fixture = TestBed.createComponent(AdminUsersComponent);
    const _comp = _fixture.componentInstance;
    const _adminUser = MOCK_USERS[2];
    expect(_comp.isActionable(_adminUser)).toBeFalsy();
  });

  it('isActionable returns true for non-admin users', () => {
    const _fixture = TestBed.createComponent(AdminUsersComponent);
    const _comp = _fixture.componentInstance;
    const _user = MOCK_USERS[0];
    expect(_comp.isActionable(_user)).toBeTruthy();
  });

  it('canApprove returns true for pending_approval status', () => {
    const _fixture = TestBed.createComponent(AdminUsersComponent);
    const _comp = _fixture.componentInstance;
    expect(_comp.canApprove(MOCK_USERS[1])).toBeTruthy();
  });

  it('canApprove returns false for active status', () => {
    const _fixture = TestBed.createComponent(AdminUsersComponent);
    const _comp = _fixture.componentInstance;
    expect(_comp.canApprove(MOCK_USERS[0])).toBeFalsy();
  });

  it('canSuspend returns true for active non-admin users', () => {
    const _fixture = TestBed.createComponent(AdminUsersComponent);
    const _comp = _fixture.componentInstance;
    expect(_comp.canSuspend(MOCK_USERS[0])).toBeTruthy();
  });

  it('canSuspend returns false for pending_approval users', () => {
    const _fixture = TestBed.createComponent(AdminUsersComponent);
    const _comp = _fixture.componentInstance;
    expect(_comp.canSuspend(MOCK_USERS[1])).toBeFalsy();
  });
});
