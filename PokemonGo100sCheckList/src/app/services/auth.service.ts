import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase;
  currentUser = signal<User | null>(null);
  session = signal<Session | null>(null);
  isLoading = signal<boolean>(true);

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
    this.initializeAuth();
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.currentUser.set(session?.user ?? null);
      this.isLoading.set(false);
    });
  }

  private async initializeAuth() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      this.session.set(session);
      this.currentUser.set(session?.user ?? null);
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signUp(email: string, password: string): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  }

  async signIn(email: string, password: string): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async signOut(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  getUserId(): string | null {
    return this.currentUser()?.id ?? null;
  }
}

