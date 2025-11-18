import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap } from 'rxjs';

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
  private apiUrl = 'https://pokeapi.co/api/v2';
  private pokemonGoData: Pokemon[] = [];
  private readonly pokemonGoMaxId = 1025; // Current max Pokemon in Pokemon Go

  constructor(private http: HttpClient) {}

  // Get all Pokemon available in Pokemon Go (up to generation 9)
  // Loads in batches for better performance
  getAllPokemon(): Observable<Pokemon[]> {
    if (this.pokemonGoData.length > 0) {
      return new Observable(observer => {
        observer.next(this.pokemonGoData);
        observer.complete();
      });
    }

    // Load Pokemon in batches of 100 for better performance
    const batchSize = 100;
    const batches: Observable<any>[] = [];
    
    for (let i = 1; i <= this.pokemonGoMaxId; i += batchSize) {
      const batch: Observable<any>[] = [];
      const end = Math.min(i + batchSize - 1, this.pokemonGoMaxId);
      for (let j = i; j <= end; j++) {
        batch.push(this.http.get(`${this.apiUrl}/pokemon/${j}`).pipe(
          switchMap((pokemonData: any) => {
            // Get species to find evolution chain URL
            return this.http.get(pokemonData.species.url).pipe(
              map((speciesData: any) => ({
                pokemon: pokemonData,
                evolutionChainUrl: speciesData.evolution_chain.url
              }))
            );
          })
        ));
      }
      batches.push(forkJoin(batch));
    }

    // Process batches sequentially using concatMap
    return forkJoin(batches).pipe(
      map((batchResults: any[][]) => {
        const allData: Pokemon[] = [];
        const chainIdMap = new Map<string, number>(); // Map evolution chain URL to family ID
        let familyIdCounter = 1;

        batchResults.forEach((responses: any[]) => {
          responses.forEach(({ pokemon: data, evolutionChainUrl }: any) => {
            // Use evolution chain URL as the key for grouping
            if (!chainIdMap.has(evolutionChainUrl)) {
              chainIdMap.set(evolutionChainUrl, familyIdCounter++);
            }
            const chainId = this.extractChainId(evolutionChainUrl);
            
            allData.push({
              id: data.id,
              name: this.capitalizeFirst(data.name),
              sprite: data.sprites.other['official-artwork']?.front_default || 
                      data.sprites.front_default || 
                      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`,
              types: data.types.map((t: any) => t.type.name),
              baseStats: {
                hp: data.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
                attack: data.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
                defense: data.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
              },
              maxCP: this.calculateMaxCP(
                data.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
                data.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
                data.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0
              ),
              generation: this.getGeneration(data.id),
              evolutionChainId: chainId,
              familyId: chainIdMap.get(evolutionChainUrl),
            });
          });
        });
        this.pokemonGoData = allData.sort((a, b) => a.id - b.id);
        return this.pokemonGoData;
      })
    );
  }

  // Extract chain ID from URL
  private extractChainId(url: string): number {
    const match = url.match(/\/(\d+)\/?$/);
    return match ? parseInt(match[1]) : 0;
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

  // Get a single Pokemon by ID
  getPokemonById(id: number): Observable<Pokemon> {
    return this.http.get(`${this.apiUrl}/pokemon/${id}`).pipe(
      map((data: any) => ({
        id: data.id,
        name: this.capitalizeFirst(data.name),
        sprite: data.sprites.other['official-artwork'].front_default || 
                data.sprites.front_default || 
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`,
        types: data.types.map((t: any) => t.type.name),
        baseStats: {
          hp: data.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
          attack: data.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
          defense: data.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
        },
        maxCP: this.calculateMaxCP(
          data.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
          data.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
          data.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0
        ),
        generation: this.getGeneration(data.id),
      }))
    );
  }

  // Calculate max CP for Pokemon Go (simplified formula)
  private calculateMaxCP(attack: number, defense: number, hp: number): number {
    const level = 50; // Max level in Pokemon Go
    const cpMultiplier = 0.79030001; // CP multiplier for level 50
    const baseCP = Math.floor((attack * Math.sqrt(defense) * Math.sqrt(hp) * cpMultiplier * cpMultiplier) / 10);
    return Math.max(10, baseCP);
  }

  // Get generation based on Pokemon ID
  private getGeneration(id: number): number {
    if (id <= 151) return 1;
    if (id <= 251) return 2;
    if (id <= 386) return 3;
    if (id <= 493) return 4;
    if (id <= 649) return 5;
    if (id <= 721) return 6;
    if (id <= 809) return 7;
    if (id <= 905) return 8;
    return 9;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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