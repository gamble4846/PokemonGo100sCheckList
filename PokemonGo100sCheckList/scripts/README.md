# Pokemon Data Fetch Script

This PowerShell script fetches all Pokemon data from the PokeAPI and saves it to a local JSON file.

## Usage

1. Open PowerShell
2. Navigate to the project root directory
3. Run the script:

```powershell
.\Scripts\fetch-pokemon-data.ps1
```

Or if you're in the Scripts folder:

```powershell
.\fetch-pokemon-data.ps1
```

## What it does

- Fetches data for all 1025 Pokemon from PokeAPI
- Processes Pokemon in batches of 50 to avoid rate limiting
- Groups Pokemon by evolution families
- Saves all data to `public/JSONs/pokemon.json`

## Output

The script will create/update `public/JSONs/pokemon.json` with all Pokemon data.

## Notes

- The script includes delays between requests to avoid rate limiting
- It may take 15-30 minutes to complete depending on your internet connection
- If the script fails partway through, you can run it again - it will overwrite the previous file

## Troubleshooting

If you get execution policy errors, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try running the script again.
