import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants/supabase.config';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      SUPABASE_CONFIG.SUPABASE_URL,
      SUPABASE_CONFIG.SUPABASE_ANON_KEY,
      {
        auth: SUPABASE_CONFIG.AUTH_OPTIONS,
      }
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}

