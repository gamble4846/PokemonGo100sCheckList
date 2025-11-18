import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PokemonService, Pokemon } from '../../services/pokemon';

@Component({
  selector: 'app-pokemon-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './pokemon-detail.html',
  styleUrl: './pokemon-detail.css',
})
export class PokemonDetail implements OnInit {
  pokemon: Pokemon | null = null;
  isLoading = true;
  pokemonId = 0;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.pokemonId = +params['id'];
      this.loadPokemon();
    });
  }

  loadPokemon() {
    this.isLoading = true;
    this.pokemonService.getPokemonById(this.pokemonId).subscribe({
      next: (data) => {
        this.pokemon = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading Pokemon:', error);
        this.isLoading = false;
      }
    });
  }

  getTypeColor(type: string): string {
    return this.pokemonService.getTypeColor(type);
  }

  getPreviousPokemon(): number {
    return Math.max(1, this.pokemonId - 1);
  }

  getNextPokemon(): number {
    return this.pokemonId + 1;
  }
}