export const ADMIN_STEPS = [
  'supabase_verified',
  'api_keys_set',
  'key_policy_set',
  'first_client_invited',
] as const;

export const CLIENT_STEPS = [
  'profile_complete',
  'smtp_configured',
  'first_lead_found',
  'first_email_sent',
] as const;

export type AdminStep = (typeof ADMIN_STEPS)[number];
export type ClientStep = (typeof CLIENT_STEPS)[number];

export function computeOnboardingProgress(
  steps: Record<string, boolean> | null | undefined,
  totalSteps: number,
): number {
  if (!steps || totalSteps === 0) return 0;
  const _completed = Object.values(steps).filter(Boolean).length;
  return Math.round((_completed / totalSteps) * 100);
}
