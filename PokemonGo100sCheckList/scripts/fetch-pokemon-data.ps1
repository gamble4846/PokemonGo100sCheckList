# PowerShell script to fetch all Pokemon data and save to JSON
$ErrorActionPreference = "Stop"

$API_URL = "https://pokeapi.co/api/v2"
$MAX_POKEMON = 1025
$BATCH_SIZE = 50
$OUTPUT_DIR = Join-Path $PSScriptRoot "..\public\JSONs"
$OUTPUT_FILE = Join-Path $OUTPUT_DIR "pokemon.json"

# Ensure output directory exists
if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR -Force | Out-Null
}

Write-Host "Starting Pokemon data fetch..."
Write-Host "Output directory: $OUTPUT_DIR"

# Helper function to make HTTP requests
function Invoke-PokeAPI {
    param([string]$Url)
    
    $maxRetries = 3
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method Get -ErrorAction Stop
            return $response
        }
        catch {
            $retryCount++
            if ($retryCount -ge $maxRetries) {
                Write-Host "Failed to fetch $Url after $maxRetries attempts: $_"
                throw
            }
            Start-Sleep -Seconds (2 * $retryCount) # Exponential backoff
        }
    }
}

# Extract chain ID from URL
function Get-ChainId {
    param([string]$Url)
    
    if ($Url -match '/(\d+)/?$') {
        return [int]$matches[1]
    }
    return 0
}

# Calculate max CP
function Get-MaxCP {
    param([int]$Attack, [int]$Defense, [int]$HP)
    
    $level = 50
    $cpMultiplier = 0.79030001
    $baseCP = [math]::Floor(($Attack * [math]::Sqrt($Defense) * [math]::Sqrt($HP) * $cpMultiplier * $cpMultiplier) / 10)
    return [math]::Max(10, $baseCP)
}

# Get generation
function Get-Generation {
    param([int]$Id)
    
    if ($Id -le 151) { return 1 }
    if ($Id -le 251) { return 2 }
    if ($Id -le 386) { return 3 }
    if ($Id -le 493) { return 4 }
    if ($Id -le 649) { return 5 }
    if ($Id -le 721) { return 6 }
    if ($Id -le 809) { return 7 }
    if ($Id -le 905) { return 8 }
    return 9
}

# Capitalize first letter
function Format-Name {
    param([string]$Name)
    
    if ($Name.Length -eq 0) { return $Name }
    return $Name.Substring(0, 1).ToUpper() + $Name.Substring(1).ToLower()
}

# Process a single Pokemon
function Get-PokemonData {
    param([int]$Id)
    
    try {
        Write-Host "Fetching Pokemon $Id..."
        
        # Fetch Pokemon data
        $pokemonData = Invoke-PokeAPI -Url "$API_URL/pokemon/$Id"
        
        # Fetch species data to get evolution chain
        $speciesData = Invoke-PokeAPI -Url $pokemonData.species.url
        
        $evolutionChainUrl = $speciesData.evolution_chain.url
        $chainId = Get-ChainId -Url $evolutionChainUrl
        
        # Find stats
        $hpStat = $pokemonData.stats | Where-Object { $_.stat.name -eq "hp" } | Select-Object -First 1
        $attackStat = $pokemonData.stats | Where-Object { $_.stat.name -eq "attack" } | Select-Object -First 1
        $defenseStat = $pokemonData.stats | Where-Object { $_.stat.name -eq "defense" } | Select-Object -First 1
        
        $hp = if ($hpStat) { $hpStat.base_stat } else { 0 }
        $attack = if ($attackStat) { $attackStat.base_stat } else { 0 }
        $defense = if ($defenseStat) { $defenseStat.base_stat } else { 0 }
        
        # Get sprite
        $sprite = $pokemonData.sprites.other.'official-artwork'.front_default
        if (-not $sprite) {
            $sprite = $pokemonData.sprites.front_default
        }
        if (-not $sprite) {
            $sprite = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/$Id.png"
        }
        
        # Ensure types is an array
        $typesArray = @()
        foreach ($typeObj in $pokemonData.types) {
            $typesArray += $typeObj.type.name
        }
        
        $pokemon = @{
            id = $pokemonData.id
            name = Format-Name -Name $pokemonData.name
            sprite = $sprite
            types = $typesArray
            baseStats = @{
                hp = $hp
                attack = $attack
                defense = $defense
            }
            maxCP = Get-MaxCP -Attack $attack -Defense $defense -HP $hp
            generation = Get-Generation -Id $pokemonData.id
            evolutionChainId = $chainId
            evolutionChainUrl = $evolutionChainUrl
        }
        
        return $pokemon
    }
    catch {
        Write-Host "Error processing Pokemon $Id : $_"
        return $null
    }
}

# Main execution
$allPokemon = @()
$chainIdMap = @{}
$familyIdCounter = 1

# Process in batches
for ($i = 1; $i -le $MAX_POKEMON; $i += $BATCH_SIZE) {
    $end = [math]::Min($i + $BATCH_SIZE - 1, $MAX_POKEMON)
    Write-Host ""
    Write-Host "Processing batch $i-$end..."
    
    $batch = @()
    for ($j = $i; $j -le $end; $j++) {
        $pokemon = Get-PokemonData -Id $j
        if ($null -ne $pokemon) {
            $batch += $pokemon
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 100
    }
    
    # Assign family IDs
    foreach ($pokemon in $batch) {
        if (-not $chainIdMap.ContainsKey($pokemon.evolutionChainUrl)) {
            $chainIdMap[$pokemon.evolutionChainUrl] = $familyIdCounter++
        }
        $pokemon.familyId = $chainIdMap[$pokemon.evolutionChainUrl]
        $pokemon.PSObject.Properties.Remove('evolutionChainUrl')
        $allPokemon += $pokemon
    }
    
    Write-Host "Batch $i-$end completed. Total so far: $($allPokemon.Count)"
    
    # Delay between batches to avoid rate limiting
    if ($i + $BATCH_SIZE -le $MAX_POKEMON) {
        Start-Sleep -Seconds 2
    }
}

# Sort by ID
$allPokemon = $allPokemon | Sort-Object -Property id

# Convert to JSON and save
$json = $allPokemon | ConvertTo-Json -Depth 10
$json | Out-File -FilePath $OUTPUT_FILE -Encoding UTF8

Write-Host ""
Write-Host "Successfully fetched and saved $($allPokemon.Count) Pokemon to $OUTPUT_FILE"
Write-Host "Total families: $($familyIdCounter - 1)"
Write-Host ""
Write-Host "Done!"