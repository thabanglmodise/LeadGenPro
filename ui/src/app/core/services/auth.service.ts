import { Injectable, computed, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase.client';

type ProfileStatus =
  | 'pending_verification'
  | 'pending_approval'
  | 'active'
  | 'suspended'
  | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);
  private readonly _profileStatus = signal<ProfileStatus>(null);
  private readonly _profileLoaded = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly role = computed(
    () => (this._user()?.app_metadata?.['role'] as string) ?? null,
  );
  readonly profileStatus = this._profileStatus.asReadonly();

  constructor() {
    supabase.auth.getSession().then(({ data }) => {
      this._user.set(data.session?.user ?? null);
      this.loadProfileStatus(data.session?.user?.id);
    });

    supabase.auth.onAuthStateChange((_, session) => {
      this._user.set(session?.user ?? null);
      this._profileLoaded.set(false);
      this.loadProfileStatus(session?.user?.id);
    });
  }

  private async loadProfileStatus(userId: string | undefined): Promise<void> {
    if (!userId) {
      this._profileStatus.set(null);
      this._profileLoaded.set(true);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();

    this._profileStatus.set((data?.status as ProfileStatus) ?? null);
    this._profileLoaded.set(true);
  }

  ensureProfileLoaded(): Promise<void> {
    if (this._profileLoaded()) return Promise.resolve();

    return new Promise((_resolve) => {
      function check(resolve: () => void, loaded: () => boolean) {
        if (loaded()) {
          resolve();
        } else {
          setTimeout(() => check(resolve, loaded), 50);
        }
      }
      check(_resolve, () => this._profileLoaded());
    });
  }

  /** Re-fetches the profile status from the DB — call after advanceStatus mutation. */
  async refreshProfileStatus(): Promise<void> {
    const _userId = this._user()?.id;
    if (!_userId) return;
    this._profileLoaded.set(false);
    await this.loadProfileStatus(_userId);
  }

  signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  }

  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email);
  }

  signOut() {
    return supabase.auth.signOut();
  }
}
