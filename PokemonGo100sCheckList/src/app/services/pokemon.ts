import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs';

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
  };
  maxCP?: number;
  generation?: number;
  evolutionChainId?: number;
  familyId?: number;
}

export interface PokemonFamily {
  familyId: number;
  pokemon: Pokemon[];
  familyName: string;
}

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private pokemonGoData: Pokemon[] = [];
  private readonly jsonPath = '/JSONs/pokemon.json';

  constructor(private http: HttpClient) {}

  // Get all Pokemon from local JSON file
  getAllPokemon(): Observable<Pokemon[]> {
    if (this.pokemonGoData.length > 0) {
      return new Observable(observer => {
        observer.next(this.pokemonGoData);
        observer.complete();
      });
    }

    // Load from local JSON file
    return this.http.get<any[]>(this.jsonPath).pipe(
      map((data: any[]) => {
        // Ensure types is always an array (fix for JSON files where types might be strings)
        const processedData: Pokemon[] = data.map((pokemon: any) => {
          // If types is a string, convert it to an array
          if (typeof pokemon.types === 'string') {
            pokemon.types = [pokemon.types];
          }
          // Ensure types is an array
          if (!Array.isArray(pokemon.types)) {
            pokemon.types = [];
          }
          return pokemon as Pokemon;
        });
        
        this.pokemonGoData = processedData.sort((a, b) => a.id - b.id);
        return this.pokemonGoData;
      }),
      catchError((error) => {
        console.error('Error loading Pokemon data from JSON:', error);
        console.error('Please run Scripts/fetch-pokemon-data.ps1 to generate the JSON file');
        return of([]);
      })
    );
  }

  // Group Pokemon by families
  groupByFamilies(pokemon: Pokemon[]): PokemonFamily[] {
    const familyMap = new Map<number, Pokemon[]>();
    
    pokemon.forEach(p => {
      const familyId = p.familyId || p.id; // Use familyId if available, otherwise use id
      if (!familyMap.has(familyId)) {
        familyMap.set(familyId, []);
      }
      familyMap.get(familyId)!.push(p);
    });

    const families: PokemonFamily[] = [];
    familyMap.forEach((pokemonList, familyId) => {
      // Sort by ID within family
      pokemonList.sort((a, b) => a.id - b.id);
      families.push({
        familyId,
        pokemon: pokemonList,
        familyName: pokemonList[0].name // Use first Pokemon as family name
      });
    });

    // Sort families by the lowest ID in each family
    families.sort((a, b) => a.pokemon[0].id - b.pokemon[0].id);
    return families;
  }

  // Get a single Pokemon by ID from cached data
  getPokemonById(id: number): Observable<Pokemon> {
    // If data is already loaded, return from cache
    if (this.pokemonGoData.length > 0) {
      const pokemon = this.pokemonGoData.find(p => p.id === id);
      if (pokemon) {
        return of(pokemon);
      }
    }

    // Otherwise, load all data first, then find the Pokemon
    return this.getAllPokemon().pipe(
      map((allPokemon: Pokemon[]) => {
        const pokemon = allPokemon.find(p => p.id === id);
        if (!pokemon) {
          throw new Error(`Pokemon with ID ${id} not found`);
        }
        return pokemon;
      })
    );
  }

  // Get type color for styling
  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC',
    };
    return colors[type.toLowerCase()] || '#68A090';
  }
}