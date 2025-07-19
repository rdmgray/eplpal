# Betfair Odds Collector

This script collects Premier League match odds from the Betfair API and stores them in a SQLite database.

## Setup

1. **Environment Variables**: The script requires these environment variables in `.env`:
   - `BETFAIR_API_KEY`: Your Betfair API application key
   - `BETFAIR_SESSION_TOKEN`: A valid session token (or will prompt for credentials)

2. **Database**: The script creates a SQLite database `premier_league_odds.db` with two tables:
   - `matches`: Stores match information (teams, dates, event IDs)
   - `odds`: Stores odds data (best back/lay prices, selection IDs)

## Usage

```bash
cd /Users/rdmgray/Projects/EPLpal && source venv/bin/activate && cd data
python betfair_odds_collector.py
```

## Authentication

The script will:
1. First try to use the session token from `.env`
2. If invalid, prompt for Betfair username/password to get a new token
3. Use the valid token to fetch Premier League odds

## What it collects

- Upcoming Premier League matches
- Best available back odds for each outcome (Home/Away/Draw)
- Match details (teams, dates, market IDs)
- Timestamps for when odds were recorded

## Database Schema

### matches table
- `id`: Primary key
- `event_id`: Betfair event ID
- `market_id`: Betfair market ID
- `home_team`, `away_team`: Team names
- `match_date`: When the match is scheduled
- `created_at`: When record was created

### odds table
- `id`: Primary key
- `match_id`: Foreign key to matches table
- `selection_id`: Betfair selection ID
- `runner_name`: Team name or "The Draw"
- `best_back_price`: Best available back price
- `best_back_size`: Size available at best back price
- `best_lay_price`: Best available lay price
- `best_lay_size`: Size available at best lay price
- `last_price_traded`: Last traded price
- `total_matched`: Total volume matched
- `status`: Selection status (ACTIVE, etc.)
- `recorded_at`: When odds were recorded