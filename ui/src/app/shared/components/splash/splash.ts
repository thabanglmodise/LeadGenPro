import {
  ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject, signal,
} from '@angular/core';
import {
  Event, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router,
} from '@angular/router';

// Later navigations only show the splash if they take longer than this (avoids flash on fast clicks).
export const SPLASH_SHOW_DELAY_MS = 150;

// Prerendered pages already show content → skip the initial splash.
export function isServerRendered(doc: Document): boolean {
  return !!doc.querySelector('app-root[ng-server-context]');
}

function isNavigationDone(event: Event): boolean {
  return event instanceof NavigationEnd
    || event instanceof NavigationCancel
    || event instanceof NavigationError;
}

@Component({
  selector: 'app-splash',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './splash.html',
})
export class SplashComponent {
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);

  // Initial navigation (incl. guard redirects) is covered from the start.
  readonly visible = signal(!isServerRendered(this.doc));

  private showTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const _sub = this.router.events.subscribe((event) => this.onRouterEvent(event));
    inject(DestroyRef).onDestroy(() => {
      _sub.unsubscribe();
      this.clearShowTimer();
    });
  }

  private onRouterEvent(event: Event): void {
    if (event instanceof NavigationStart && !this.visible()) {
      this.scheduleShow();
      return;
    }
    if (isNavigationDone(event)) {
      this.clearShowTimer();
      this.visible.set(false);
    }
  }

  private scheduleShow(): void {
    this.clearShowTimer();
    this.showTimer = setTimeout(() => this.visible.set(true), SPLASH_SHOW_DELAY_MS);
  }

  private clearShowTimer(): void {
    if (this.showTimer === null) return;
    clearTimeout(this.showTimer);
    this.showTimer = null;
  }
}
