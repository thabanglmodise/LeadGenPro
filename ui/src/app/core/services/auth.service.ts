import { Injectable, computed, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());

  constructor() {
    supabase.auth.getSession().then(({ data }) => {
      this._user.set(data.session?.user ?? null);
    });
    supabase.auth.onAuthStateChange((_, session) => {
      this._user.set(session?.user ?? null);
    });
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
