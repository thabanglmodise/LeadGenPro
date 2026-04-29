import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let html: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    html = document.documentElement;
    html.className = '';

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    html.className = '';
  });

  it('defaults to dark mode when localStorage has no entry', () => {
    expect(service.theme()).toBe('dark');
    expect(html.classList.contains('dark')).toBeTrue();
    expect(html.classList.contains('light')).toBeFalse();
  });

  it('restores dark theme from localStorage on init', () => {
    localStorage.setItem('prospekt-theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const _restored = TestBed.inject(ThemeService);
    expect(_restored.theme()).toBe('dark');
    expect(html.classList.contains('dark')).toBeTrue();
  });

  it('restores light theme from localStorage on init', () => {
    localStorage.setItem('prospekt-theme', 'light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const _restored = TestBed.inject(ThemeService);
    expect(_restored.theme()).toBe('light');
    expect(html.classList.contains('light')).toBeTrue();
    expect(html.classList.contains('dark')).toBeFalse();
  });

  it('toggles from dark to light and updates class + localStorage', () => {
    expect(service.theme()).toBe('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(html.classList.contains('light')).toBeTrue();
    expect(html.classList.contains('dark')).toBeFalse();
    expect(localStorage.getItem('prospekt-theme')).toBe('light');
  });

  it('toggles from light back to dark', () => {
    service.toggle(); // dark → light
    service.toggle(); // light → dark
    expect(service.theme()).toBe('dark');
    expect(html.classList.contains('dark')).toBeTrue();
    expect(html.classList.contains('light')).toBeFalse();
    expect(localStorage.getItem('prospekt-theme')).toBe('dark');
  });

  it('applies only one theme class at a time', () => {
    service.toggle();
    expect(html.classList.length).toBe(1);
    service.toggle();
    expect(html.classList.length).toBe(1);
  });
});
