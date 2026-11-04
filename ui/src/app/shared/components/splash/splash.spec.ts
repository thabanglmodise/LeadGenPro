import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, Event } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { SplashComponent, SPLASH_SHOW_DELAY_MS, isServerRendered } from './splash';

function setup(serverRendered = false) {
  const _events = new Subject<Event>();
  const _doc = document.implementation.createHTMLDocument('t');
  const _root = _doc.createElement('app-root');
  if (serverRendered) _root.setAttribute('ng-server-context', 'ssg');
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

function splashEl(fixture: { nativeElement: HTMLElement }): HTMLElement {
  return fixture.nativeElement.querySelector('.splash') as HTMLElement;
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

describe('SplashComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('visible initially on CSR, hides on first NavigationEnd', () => {
    const { fixture, events, cmp } = setup();
    expect(cmp.visible()).toBe(true);
    expect(splashEl(fixture).classList.contains('splash--hidden')).toBe(false);

    events.next(new NavigationEnd(1, '/auth/login', '/auth/login'));
    fixture.detectChanges();
    expect(cmp.visible()).toBe(false);
    expect(splashEl(fixture).classList.contains('splash--hidden')).toBe(true);
  });

  it('hidden initially on prerendered page', () => {
    const { cmp } = setup(true);
    expect(cmp.visible()).toBe(false);
  });

  it('later fast navigation never shows splash', () => {
    vi.useFakeTimers();
    const { events, cmp } = setup(true);
    events.next(new NavigationStart(2, '/dashboard'));
    vi.advanceTimersByTime(SPLASH_SHOW_DELAY_MS - 1);
    events.next(new NavigationEnd(2, '/dashboard', '/dashboard'));
    vi.advanceTimersByTime(SPLASH_SHOW_DELAY_MS);
    expect(cmp.visible()).toBe(false);
  });

  it('later slow navigation shows splash after delay, hides on end', () => {
    vi.useFakeTimers();
    const { events, cmp } = setup(true);
    events.next(new NavigationStart(2, '/dashboard'));
    vi.advanceTimersByTime(SPLASH_SHOW_DELAY_MS);
    expect(cmp.visible()).toBe(true);
    events.next(new NavigationEnd(2, '/auth/login', '/auth/login'));
    expect(cmp.visible()).toBe(false);
  });
});
