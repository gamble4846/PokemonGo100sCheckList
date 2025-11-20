import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PokemonService, Pokemon, PokemonFamily } from '../../services/pokemon';
import { AuthService } from '../../services/auth.service';
import { SavedUserDataService } from '../../services/saved-user-data.service';

@Component({
  selector: 'app-pokemon-list',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pokemon-list.html',
  styleUrl: './pokemon-list.css',
})
export class PokemonList implements OnInit {
  pokemon = signal<Pokemon[]>([]);
  filteredPokemon = signal<Pokemon[]>([]);
  filteredFamilies = signal<PokemonFamily[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(true);

  // Track checkbox states for each Pokemon
  checked100iv = signal<Set<number>>(new Set());
  checkedShiny100iv = signal<Set<number>>(new Set());

  // Track image loading states
  imageLoading = signal<Set<number>>(new Set());

  // Expose auth state for template
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  constructor(
    private pokemonService: PokemonService,
    private authService: AuthService,
    private savedUserDataService: SavedUserDataService
  ) {
    // Reload data when user logs in/out
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadCheckboxStates();
      } else {
        // Clear checkboxes when logged out
        this.checked100iv.set(new Set());
        this.checkedShiny100iv.set(new Set());
      }
    });
  }

  ngOnInit() {
    this.loadPokemon();
    if (this.authService.isAuthenticated()) {
      this.loadCheckboxStates();
    }
  }

  // Load checkbox states from Supabase
  private async loadCheckboxStates() {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }

    try {
      const { checked100iv, checkedShiny100iv } = 
        await this.savedUserDataService.getCheckboxStates(userId);
      this.checked100iv.set(checked100iv);
      this.checkedShiny100iv.set(checkedShiny100iv);
    } catch (error) {
      console.error('Error loading checkbox states from Supabase:', error);
    }
  }

  // Save checkbox state to Supabase
  private async savePokemonData(pokemonId: number, field100iv: boolean, fieldShiny100iv: boolean) {
    const userId = this.authService.getUserId();
    if (!userId) {
      console.warn('User not authenticated. Cannot save data.');
      return;
    }

    try {
      await this.savedUserDataService.savePokemonData({
        PokemonNumber: pokemonId,
        '100IV': field100iv,
        'Shiny 100IV': fieldShiny100iv,
        'Dynamax Best IV': 0,
        userId: userId,
      });
    } catch (error) {
      console.error('Error saving Pokemon data to Supabase:', error);
    }
  }

  loadPokemon() {
    this.isLoading.set(true);
    this.pokemonService.getAllPokemon().subscribe({
      next: (data) => {
        this.pokemon.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading Pokemon:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.pokemon()];

    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.id.toString().includes(search)
      );
    }

    // Sort by ID
    filtered.sort((a, b) => a.id - b.id);

    this.filteredPokemon.set(filtered);
    
    // Group filtered Pokemon by families
    const families = this.pokemonService.groupByFamilies(filtered);
    this.filteredFamilies.set(families);
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }

  isChecked100iv(pokemonId: number): boolean {
    return this.checked100iv().has(pokemonId);
  }

  isCheckedShiny100iv(pokemonId: number): boolean {
    return this.checkedShiny100iv().has(pokemonId);
  }

  toggle100iv(pokemonId: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.authService.isAuthenticated()) {
      return; // Checkbox is disabled, so this shouldn't fire, but just in case
    }

    const current = new Set(this.checked100iv());
    const isChecked = current.has(pokemonId);
    if (isChecked) {
      current.delete(pokemonId);
    } else {
      current.add(pokemonId);
    }
    this.checked100iv.set(current);
    
    // Save to Supabase
    this.savePokemonData(
      pokemonId,
      !isChecked,
      this.checkedShiny100iv().has(pokemonId)
    );
  }

  toggleShiny100iv(pokemonId: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.authService.isAuthenticated()) {
      return; // Checkbox is disabled, so this shouldn't fire, but just in case
    }

    const current = new Set(this.checkedShiny100iv());
    const isChecked = current.has(pokemonId);
    if (isChecked) {
      current.delete(pokemonId);
    } else {
      current.add(pokemonId);
    }
    this.checkedShiny100iv.set(current);
    
    // Save to Supabase
    this.savePokemonData(
      pokemonId,
      this.checked100iv().has(pokemonId),
      !isChecked
    );
  }

  onImageLoad(pokemonId: number) {
    // Remove from loading set when image loads
    const current = new Set(this.imageLoading());
    current.delete(pokemonId);
    this.imageLoading.set(current);
  }

  onImageStartLoad(pokemonId: number) {
    // Add to loading set when image starts loading
    const current = new Set(this.imageLoading());
    current.add(pokemonId);
    this.imageLoading.set(current);
  }

  onImageError(pokemonId: number) {
    // Remove from loading set on error (show broken image or placeholder)
    const current = new Set(this.imageLoading());
    current.delete(pokemonId);
    this.imageLoading.set(current);
  }

  isImageLoading(pokemonId: number): boolean {
    return this.imageLoading().has(pokemonId);
  }

  // Computed counts
  count100iv = computed(() => this.checked100iv().size);
  countShiny100iv = computed(() => this.checkedShiny100iv().size);
  pending100iv = computed(() => {
    const total = this.pokemon().length;
    return total - this.checked100iv().size;
  });
  pendingShiny100iv = computed(() => {
    const total = this.pokemon().length;
    return total - this.checkedShiny100iv().size;
  });
}