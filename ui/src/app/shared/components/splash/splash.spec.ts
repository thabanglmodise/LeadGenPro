import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, Event } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import {
  SplashComponent, SPLASH_SHOW_DELAY_MS, isServerRendered, shouldShowInitially,
} from './splash';

function setup(opts: { serverRendered?: boolean; elapsedMs?: number } = {}) {
  vi.spyOn(performance, 'now').mockReturnValue(opts.elapsedMs ?? 0);
  const _events = new Subject<Event>();
  const _doc = document.implementation.createHTMLDocument('t');
  const _root = _doc.createElement('app-root');
  if (opts.serverRendered) _root.setAttribute('ng-server-context', 'ssg');
  _doc.body.appendChild(_root);

  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { events: _events.asObservable() } },
      { provide: DOCUMENT, useValue: _doc },
    ],
  });
  const _fixture = TestBed.createComponent(SplashComponent);
  _fixture.detectChanges();
  return { fixture: _fixture, events: _events, cmp: _fixture.componentInstance };
}

function isHidden(fixture: { nativeElement: HTMLElement }): boolean {
  return (fixture.nativeElement.querySelector('.splash') as HTMLElement)
    .classList.contains('splash--hidden');
}

describe('isServerRendered', () => {
  it('true when app-root has ng-server-context', () => {
    const _doc = document.implementation.createHTMLDocument('t');
    _doc.body.innerHTML = '<app-root ng-server-context="ssg"></app-root>';
    expect(isServerRendered(_doc)).toBe(true);
  });

  it('false for CSR shell', () => {
    const _doc = document.implementation.createHTMLDocument('t');
    _doc.body.innerHTML = '<app-root></app-root>';
    expect(isServerRendered(_doc)).toBe(false);
  });
});

describe('shouldShowInitially', () => {
  it('false when boot was fast', () => {
    expect(shouldShowInitially(SPLASH_SHOW_DELAY_MS - 1, false)).toBe(false);
  });

  it('true when boot was slow (static splash already visible)', () => {
    expect(shouldShowInitially(SPLASH_SHOW_DELAY_MS, false)).toBe(true);
  });

  it('false on prerendered page even if slow', () => {
    expect(shouldShowInitially(SPLASH_SHOW_DELAY_MS * 10, true)).toBe(false);
  });
});

describe('SplashComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('hidden initially after fast boot', () => {
    const { fixture, cmp } = setup({ elapsedMs: 50 });
    expect(cmp.visible()).toBe(false);
    expect(isHidden(fixture)).toBe(true);
  });

  it('visible initially after slow boot, hides on NavigationEnd', () => {
    const { fixture, events, cmp } = setup({ elapsedMs: 1000 });
    expect(cmp.visible()).toBe(true);
    expect(isHidden(fixture)).toBe(false);

    events.next(new NavigationEnd(1, '/auth/login', '/auth/login'));
    fixture.detectChanges();
    expect(cmp.visible()).toBe(false);
    expect(isHidden(fixture)).toBe(true);
  });

  it('hidden initially on prerendered page', () => {
    const { cmp } = setup({ serverRendered: true, elapsedMs: 1000 });
    expect(cmp.visible()).toBe(false);
  });

  it('fast navigation never shows splash', () => {
    vi.useFakeTimers();
    const { events, cmp } = setup();
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(SPLASH_SHOW_DELAY_MS - 1);
    events.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    vi.advanceTimersByTime(SPLASH_SHOW_DELAY_MS);
    expect(cmp.visible()).toBe(false);
  });

  it('slow navigation shows splash after delay, hides on end', () => {
    vi.useFakeTimers();
    const { events, cmp } = setup();
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(SPLASH_SHOW_DELAY_MS);
    expect(cmp.visible()).toBe(true);
    events.next(new NavigationEnd(1, '/auth/login', '/auth/login'));
    expect(cmp.visible()).toBe(false);
  });
});
