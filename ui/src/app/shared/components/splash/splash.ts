import {
  ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject, signal,
} from '@angular/core';
import {
  Event, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router,
} from '@angular/router';

// Splash only appears if loading takes longer than this. Keep in sync with --splash-delay in styles.css.
export const SPLASH_SHOW_DELAY_MS = 300;

// Prerendered pages already show content → skip the initial splash.
export function isServerRendered(doc: Document): boolean {
  return !!doc.querySelector('app-root[ng-server-context]');
}

// Static index.html splash fades in after the delay; if boot took that long it's already
// on screen, so start visible to hand off without a gap.
export function shouldShowInitially(elapsedMs: number, serverRendered: boolean): boolean {
  return !serverRendered && elapsedMs >= SPLASH_SHOW_DELAY_MS;
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

  readonly visible = signal(shouldShowInitially(performance.now(), isServerRendered(this.doc)));

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
