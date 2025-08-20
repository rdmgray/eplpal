#!/bin/bash
cd /Users/rdmgray/Projects/EPLpal
source venv/bin/activate
# Get latest odds
python data/betfair_odds_collector.py
# Update fixtures data
python data/scripts/premier_league_fixtures.py --update --db-path data/premier_league_2025_26.db
# Resolve bets
python data/betting/book.py
