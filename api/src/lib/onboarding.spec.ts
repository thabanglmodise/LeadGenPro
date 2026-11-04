import { describe, it, expect } from 'vitest';
import { computeOnboardingProgress } from './onboarding.js';

describe('computeOnboardingProgress', () => {
  it('returns 0 for null steps', () => {
    expect(computeOnboardingProgress(null, 4)).toBe(0);
  });

  it('returns 0 for empty steps object', () => {
    expect(computeOnboardingProgress({}, 4)).toBe(0);
  });

  it('returns 0 when all steps are false', () => {
    expect(computeOnboardingProgress({ a: false, b: false, c: false, d: false }, 4)).toBe(0);
  });

  it('returns 75 when 3 of 4 steps are complete', () => {
    expect(computeOnboardingProgress({ a: true, b: true, c: true, d: false }, 4)).toBe(75);
  });

  it('returns 100 when all steps are complete', () => {
    expect(computeOnboardingProgress({ a: true, b: true, c: true, d: true }, 4)).toBe(100);
  });

  it('returns 25 when 1 of 4 steps is complete', () => {
    expect(computeOnboardingProgress({ a: true, b: false, c: false, d: false }, 4)).toBe(25);
  });

  it('returns 0 when totalSteps is 0', () => {
    expect(computeOnboardingProgress({ a: true }, 0)).toBe(0);
  });
});
