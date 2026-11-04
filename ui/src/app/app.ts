import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashComponent } from './shared/components/splash/splash';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SplashComponent],
  // ngSkipHydration: splash state is browser-only (differs from prerendered HTML)
  template: `<app-splash ngSkipHydration /><router-outlet />`,
})
export class App {}
