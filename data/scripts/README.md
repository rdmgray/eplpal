# Premier League 2025-26 Fixtures Database

This project creates a SQLite database containing Premier League 2025-26 fixture information.

## Files

- `premier_league_fixtures.py` - Main script to download and create the database
- `premier_league_2025_26.db` - SQLite database (created when script runs)

## Usage

### Basic Usage (with sample data)
```bash
python premier_league_fixtures.py
```

### With Live Data (requires API key)
1. Get a free API key from [football-data.org](https://www.football-data.org)
2. Set the environment variable:
   ```bash
   export FOOTBALL_DATA_API_KEY="your_api_key_here"
   python premier_league_fixtures.py
   ```

## Database Schema

### Tables

#### `fixtures`
- `id` - Primary key
- `match_id` - Unique match identifier
- `matchday` - Matchday number (1-38)
- `date` - Match date (YYYY-MM-DD)
- `time` - Match time (HH:MM:SS)
- `home_team` - Home team name
- `away_team` - Away team name
- `home_team_id` - Home team ID
- `away_team_id` - Away team ID
- `status` - Match status (SCHEDULED, FINISHED, etc.)
- `venue` - Stadium name
- `home_score` - Home team score (when available)
- `away_score` - Away team score (when available)
- `season` - Season identifier
- `updated_at` - Last update timestamp

#### `teams`
- `id` - Primary key
- `team_id` - Unique team identifier
- `name` - Full team name
- `short_name` - Short team name
- `tla` - Three-letter abbreviation
- `crest` - Team crest URL
- `founded` - Year founded
- `venue` - Home stadium

## Sample Queries

```sql
-- Get all fixtures for a specific team
SELECT date, time, home_team, away_team, venue 
FROM fixtures 
WHERE home_team = 'Liverpool' OR away_team = 'Liverpool'
ORDER BY date;

-- Get all fixtures for a specific matchday
SELECT date, time, home_team, away_team 
FROM fixtures 
WHERE matchday = 1 
ORDER BY date, time;

-- Get team information
SELECT name, venue, founded 
FROM teams 
ORDER BY name;
```

## Features

- Automatic fallback to sample data when API is unavailable
- Proper database schema with relationships
- Sample queries included
- Error handling for API failures
- Support for both live and historical data

## Requirements

- Python 3.6+
- requests library
- sqlite3 (included with Python)

## API Information

The script uses the football-data.org API which provides:
- Free tier: 100 requests per 24 hours
- Requires registration for API key
- Covers major European leagues including Premier League
- Live scores, fixtures, and team information