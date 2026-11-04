import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingService, type OnboardingStep } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './onboarding-wizard.html',
})
export class OnboardingWizardComponent {
  protected readonly onboarding = inject(OnboardingService);

  readonly steps = computed(() => this.onboarding.wizardSteps());
  readonly progress = computed(() => this.onboarding.progress());

  readonly currentIndex = signal(0);

  readonly currentStep = computed<OnboardingStep | undefined>(
    () => this.steps()[this.currentIndex()],
  );

  readonly isCurrentDone = computed(() => {
    const _step = this.currentStep();
    return _step ? !!this.onboarding.steps()[_step.key] : false;
  });

  async markDone(): Promise<void> {
    const _step = this.currentStep();
    if (!_step) return;
    await this.onboarding.completeStep(_step.key);
    this.advance();
  }

  skip(): void {
    this.advance();
  }

  advance(): void {
    const _next = this.currentIndex() + 1;
    if (_next < this.steps().length) {
      this.currentIndex.set(_next);
    } else {
      this.onboarding.closeWizard();
    }
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  close(): void {
    this.onboarding.closeWizard();
  }

  stepDone(key: string): boolean {
    return !!this.onboarding.steps()[key];
  }
}
