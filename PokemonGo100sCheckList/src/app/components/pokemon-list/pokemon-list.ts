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
  selectedType = signal<string>('all');
  selectedGeneration = signal<string>('all');
  sortBy = signal<string>('id');
  isLoading = signal<boolean>(true);

  types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  generations = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  constructor(private pokemonService: PokemonService) {}

  ngOnInit() {
    this.loadPokemon();
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

  onTypeChange(value: string) {
    this.selectedType.set(value);
    this.applyFilters();
  }

  onGenerationChange(value: string) {
    this.selectedGeneration.set(value);
    this.applyFilters();
  }

  onSortChange(value: string) {
    this.sortBy.set(value);
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

    // Type filter
    if (this.selectedType() !== 'all') {
      filtered = filtered.filter(p => 
        p.types.some(t => t.toLowerCase() === this.selectedType().toLowerCase())
      );
    }

    // Generation filter
    if (this.selectedGeneration() !== 'all') {
      filtered = filtered.filter(p => 
        p.generation === parseInt(this.selectedGeneration())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy()) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cp':
          return (b.maxCP || 0) - (a.maxCP || 0);
        case 'attack':
          return b.baseStats.attack - a.baseStats.attack;
        case 'defense':
          return b.baseStats.defense - a.baseStats.defense;
        case 'hp':
          return b.baseStats.hp - a.baseStats.hp;
        default:
          return a.id - b.id;
      }
    });

    this.filteredPokemon.set(filtered);
    
    // Group filtered Pokemon by families
    const families = this.pokemonService.groupByFamilies(filtered);
    this.filteredFamilies.set(families);
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }
}