import { Injectable, computed, signal } from '@angular/core';
import { trpc } from '../trpc.client';

export type OnboardingStep = {
  key: string;
  label: string;
  description: string;
  routerLink: string;
  skippable?: boolean;
};

const ADMIN_WIZARD_STEPS: OnboardingStep[] = [
  {
    key: 'supabase_verified',
    label: 'Verify database connection',
    description: 'Confirm Prospekt can reach your Supabase database.',
    routerLink: '/admin/platform-setup',
  },
  {
    key: 'api_keys_set',
    label: 'Set global API keys',
    description: 'Add a Google Places key and Anthropic key so clients can use AI features.',
    routerLink: '/admin/api-keys',
  },
  {
    key: 'key_policy_set',
    label: 'Configure key policy',
    description: 'Choose which users can access shared keys (whitelist / blacklist / disabled).',
    routerLink: '/admin/api-keys',
  },
  {
    key: 'first_client_invited',
    label: 'Invite your first client',
    description: 'Send an invite email to onboard the first client account.',
    routerLink: '/admin/invite',
  },
];

const CLIENT_WIZARD_STEPS: OnboardingStep[] = [
  {
    key: 'profile_complete',
    label: 'Complete your business profile',
    description: 'Add your company name, role, and offering so AI can personalise outreach.',
    routerLink: '/settings/profile',
  },
  {
    key: 'smtp_configured',
    label: 'Configure email sending',
    description: 'Set up SMTP credentials to send emails directly, or skip for now.',
    routerLink: '/settings/smtp',
    skippable: true,
  },
  {
    key: 'first_lead_found',
    label: 'Find your first leads',
    description: 'Search for local businesses to add to your pipeline.',
    routerLink: '/leads/find',
  },
  {
    key: 'first_email_sent',
    label: 'Send your first outreach email',
    description: 'Compose and send a cold email to your first lead.',
    routerLink: '/compose',
  },
];

const TOTAL_STEPS = 4;

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly _steps = signal<Record<string, boolean>>({});
  private readonly _isAdmin = signal(false);
  private readonly _showWizard = signal(false);
  private readonly _loaded = signal(false);

  readonly steps = this._steps.asReadonly();
  readonly isAdmin = this._isAdmin.asReadonly();
  readonly showWizard = this._showWizard.asReadonly();

  readonly wizardSteps = computed(() =>
    this._isAdmin() ? ADMIN_WIZARD_STEPS : CLIENT_WIZARD_STEPS
  );

  readonly progress = computed(() => {
    const _s = this._steps();
    const _completed = Object.values(_s).filter(Boolean).length;
    return TOTAL_STEPS > 0 ? Math.round((_completed / TOTAL_STEPS) * 100) : 0;
  });

  readonly isStepDone = (key: string) => computed(() => !!this._steps()[key]);

  async load(): Promise<void> {
    if (this._loaded()) return;
    try {
      const _status = await trpc.onboarding.getStatus.query();
      this._steps.set(_status.steps as Record<string, boolean>);
      this._isAdmin.set(_status.isAdmin);
      if (_status.isFirstRun) {
        this._showWizard.set(true);
      }
    } catch {
      /* non-fatal — wizard just won't appear */
    } finally {
      this._loaded.set(true);
    }
  }

  async completeStep(key: string): Promise<void> {
    try {
      await trpc.onboarding.completeStep.mutate({ step: key as never });
      this._steps.update(s => ({ ...s, [key]: true }));
    } catch {
      /* non-fatal */
    }
  }

  toggleWizard(): void {
    this._showWizard.update(v => !v);
  }

  openWizard(): void {
    this._showWizard.set(true);
  }

  closeWizard(): void {
    this._showWizard.set(false);
  }
}
