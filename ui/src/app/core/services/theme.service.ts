import { Injectable, signal } from '@angular/core';
import { trpc } from '../trpc.client';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'prospekt-theme';
const DEFAULT_THEME: Theme = 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(DEFAULT_THEME);

  constructor() {
    this.init();
  }

  private init(): void {
    const _stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const _theme: Theme = _stored === 'light' || _stored === 'dark' ? _stored : DEFAULT_THEME;
    this.apply(_theme);
  }

  toggle(): void {
    const _next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.apply(_next);
    trpc.profile.setTheme.mutate({ theme: _next }).catch(() => {});
  }

  syncFromDb(theme: Theme): void {
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    const _html = document.documentElement;
    _html.classList.remove('dark', 'light');
    _html.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.theme.set(theme);
  }
}
