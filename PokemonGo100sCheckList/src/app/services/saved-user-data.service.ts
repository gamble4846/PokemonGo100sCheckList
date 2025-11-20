import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, map, catchError, of, firstValueFrom } from 'rxjs';

export interface SavedUserData {
  id?: number;
  PokemonNumber: number;
  '100IV': boolean;
  'Shiny 100IV': boolean;
  'Dynamax Best IV': number;
  userId: string;
}

@Injectable({
  providedIn: 'root',
})
export class SavedUserDataService {
  private supabase;
  private readonly TABLE_NAME = 'SavedUserData';

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  // Get all saved data for the current user
  getUserData(userId: string): Observable<SavedUserData[]> {
    return from(
      this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('userId', userId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as SavedUserData[];
      }),
      catchError((error) => {
        console.error('Error fetching user data:', error);
        return of([]);
      })
    );
  }

  // Save or update a single Pokemon's data
  async savePokemonData(data: SavedUserData): Promise<{ error: any }> {
    // Check if record exists for this Pokemon and user
    const { data: existing, error: fetchError } = await this.supabase
      .from(this.TABLE_NAME)
      .select('id')
      .eq('PokemonNumber', data.PokemonNumber)
      .eq('userId', data.userId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError };
    }

    // Prepare data object with proper column names matching the schema
    const insertData: any = {
      PokemonNumber: data.PokemonNumber,
      '100IV': data['100IV'],
      'Shiny 100IV': data['Shiny 100IV'],
      'Dynamax Best IV': data['Dynamax Best IV'],
      userId: data.userId,
    };

    if (existing) {
      // Update existing record
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .update({
          '100IV': data['100IV'],
          'Shiny 100IV': data['Shiny 100IV'],
          'Dynamax Best IV': data['Dynamax Best IV'],
        })
        .eq('id', existing.id);
      return { error };
    } else {
      // Insert new record
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .insert(insertData);
      return { error };
    }
  }

  // Delete a Pokemon's data
  async deletePokemonData(pokemonNumber: number, userId: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('PokemonNumber', pokemonNumber)
      .eq('userId', userId);
    return { error };
  }

  // Get checkbox states as Sets (for easier use in components)
  async getCheckboxStates(userId: string): Promise<{
    checked100iv: Set<number>;
    checkedShiny100iv: Set<number>;
  }> {
    const data = await firstValueFrom(this.getUserData(userId));
    const checked100iv = new Set<number>();
    const checkedShiny100iv = new Set<number>();

    data?.forEach((item) => {
      if (item['100IV']) {
        checked100iv.add(item.PokemonNumber);
      }
      if (item['Shiny 100IV']) {
        checkedShiny100iv.add(item.PokemonNumber);
      }
    });

    return { checked100iv, checkedShiny100iv };
  }
}

