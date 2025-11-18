import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PokemonService, Pokemon, PokemonFamily } from '../../services/pokemon';

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

  private readonly STORAGE_KEY_100IV = 'pokemon_100iv_checked';
  private readonly STORAGE_KEY_SHINY_100IV = 'pokemon_shiny_100iv_checked';

  constructor(private pokemonService: PokemonService) {}

  ngOnInit() {
    this.loadCheckboxStates();
    this.loadPokemon();
  }

  // Load checkbox states from localStorage
  private loadCheckboxStates() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Load 100iv checkboxes
        const saved100iv = localStorage.getItem(this.STORAGE_KEY_100IV);
        if (saved100iv) {
          const ids = JSON.parse(saved100iv) as number[];
          this.checked100iv.set(new Set(ids));
        }

        // Load Shiny 100iv checkboxes
        const savedShiny100iv = localStorage.getItem(this.STORAGE_KEY_SHINY_100IV);
        if (savedShiny100iv) {
          const ids = JSON.parse(savedShiny100iv) as number[];
          this.checkedShiny100iv.set(new Set(ids));
        }
      }
    } catch (error) {
      console.error('Error loading checkbox states from localStorage:', error);
    }
  }

  // Save checkbox states to localStorage
  private saveCheckboxStates() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Save 100iv checkboxes
        const ids100iv = Array.from(this.checked100iv());
        localStorage.setItem(this.STORAGE_KEY_100IV, JSON.stringify(ids100iv));

        // Save Shiny 100iv checkboxes
        const idsShiny100iv = Array.from(this.checkedShiny100iv());
        localStorage.setItem(this.STORAGE_KEY_SHINY_100IV, JSON.stringify(idsShiny100iv));
      }
    } catch (error) {
      console.error('Error saving checkbox states to localStorage:', error);
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
    const current = new Set(this.checked100iv());
    if (current.has(pokemonId)) {
      current.delete(pokemonId);
    } else {
      current.add(pokemonId);
    }
    this.checked100iv.set(current);
    this.saveCheckboxStates();
  }

  toggleShiny100iv(pokemonId: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const current = new Set(this.checkedShiny100iv());
    if (current.has(pokemonId)) {
      current.delete(pokemonId);
    } else {
      current.add(pokemonId);
    }
    this.checkedShiny100iv.set(current);
    this.saveCheckboxStates();
  }
}