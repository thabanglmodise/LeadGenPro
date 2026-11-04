import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ApprovalQueueComponent } from './approval-queue';

describe('ApprovalQueueComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders with empty pending list by default', () => {
    const _fixture = TestBed.createComponent(ApprovalQueueComponent);
    const _comp = _fixture.componentInstance;
    expect(_comp.pending()).toHaveLength(0);
  });

  it('pending computed filters to only pending_approval status', () => {
    const _fixture = TestBed.createComponent(ApprovalQueueComponent);
    const _comp = _fixture.componentInstance;

    /* reach into private signal via cast — keeps tests simple */
    const _allUsers = (_comp as unknown as { _allUsers: ReturnType<typeof signal> })['_allUsers'];
    _allUsers.set([
      { id: 'u1', full_name: 'Alice', biz_name: null, status: 'active',           tier: 'basic' },
      { id: 'u2', full_name: 'Bob',   biz_name: null, status: 'pending_approval', tier: 'basic' },
      { id: 'u3', full_name: 'Carol', biz_name: null, status: 'pending_approval', tier: 'plus' },
    ]);

    expect(_comp.pending()).toHaveLength(2);
    expect(_comp.pending().map(u => u.id)).toEqual(['u2', 'u3']);
  });

  it('pending is empty when all users are active', () => {
    const _fixture = TestBed.createComponent(ApprovalQueueComponent);
    const _comp = _fixture.componentInstance;

    const _allUsers = (_comp as unknown as { _allUsers: ReturnType<typeof signal> })['_allUsers'];
    _allUsers.set([
      { id: 'u1', full_name: 'Alice', biz_name: null, status: 'active', tier: 'basic' },
    ]);

    expect(_comp.pending()).toHaveLength(0);
  });
});
