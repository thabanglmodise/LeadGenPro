import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { OnboardingWidgetComponent } from './onboarding-widget';
import { OnboardingService } from '../../../core/services/onboarding.service';

function makeOnboardingService(progressValue: number) {
  return {
    progress: computed(() => progressValue),
    wizardSteps: computed(() => [
      { key: 'step_a', label: 'Step A', description: '', routerLink: '/' },
      { key: 'step_b', label: 'Step B', description: '', routerLink: '/' },
    ]),
    steps: signal<Record<string, boolean>>({}),
    openWizard: vi.fn(),
  } as unknown as OnboardingService;
}

describe('OnboardingWidgetComponent', () => {
  describe('showWidget computed', () => {
    it('is true when progress < 80', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: makeOnboardingService(50) }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      expect(_fixture.componentInstance.showWidget()).toBeTruthy();
    });

    it('is false when progress === 80', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: makeOnboardingService(80) }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      expect(_fixture.componentInstance.showWidget()).toBeFalsy();
    });

    it('is false when progress > 80', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: makeOnboardingService(100) }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      expect(_fixture.componentInstance.showWidget()).toBeFalsy();
    });
  });

  describe('template rendering', () => {
    it('renders the setup checklist link regardless of progress', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: makeOnboardingService(100) }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      _fixture.detectChanges();
      const _el: HTMLElement = _fixture.nativeElement;
      expect(_el.querySelector('.onboarding-widget__checklist-link')).toBeTruthy();
    });

    it('renders the progress widget when progress < 80', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: makeOnboardingService(25) }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      _fixture.detectChanges();
      const _el: HTMLElement = _fixture.nativeElement;
      expect(_el.querySelector('.onboarding-widget')).toBeTruthy();
    });

    it('does not render the progress widget when progress >= 80', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: makeOnboardingService(80) }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      _fixture.detectChanges();
      const _el: HTMLElement = _fixture.nativeElement;
      expect(_el.querySelector('.onboarding-widget')).toBeNull();
    });

    it('calls openWizard when checklist button is clicked', () => {
      const _svc = makeOnboardingService(50);
      TestBed.configureTestingModule({
        providers: [{ provide: OnboardingService, useValue: _svc }],
      });
      const _fixture = TestBed.createComponent(OnboardingWidgetComponent);
      _fixture.detectChanges();
      const _btn: HTMLButtonElement = _fixture.nativeElement.querySelector('.onboarding-widget__open-btn');
      _btn.click();
      expect(_svc.openWizard).toHaveBeenCalled();
    });
  });
});
