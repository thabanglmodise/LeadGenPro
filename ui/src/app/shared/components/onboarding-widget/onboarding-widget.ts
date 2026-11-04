import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { OnboardingService } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-onboarding-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding-widget.html',
})
export class OnboardingWidgetComponent {
  protected readonly onboarding = inject(OnboardingService);

  readonly progress = computed(() => this.onboarding.progress());
  readonly showWidget = computed(() => this.progress() < 80);
  readonly steps = computed(() => this.onboarding.wizardSteps());

  openWizard(): void {
    this.onboarding.openWizard();
  }

  stepDone(key: string): boolean {
    return !!this.onboarding.steps()[key];
  }
}
