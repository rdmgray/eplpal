#!/usr/bin/env python3
"""
Premier League 2025-26 Fixtures Database Creator

This script downloads fixture data for the 2025-26 Premier League season
and stores it in a SQLite database.
"""

import sqlite3
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv


class PremierLeagueFixtures:
    def __init__(self, db_path: str = "premier_league_2025_26.db"):
        # Load environment variables from .env file
        load_dotenv()
        
        self.db_path = db_path
        self.base_url = "https://api.football-data.org/v4"
        self.headers = {
            "X-Auth-Token": os.getenv("FOOTBALL_DATA_API_KEY", "")
        }
        
    def create_database(self) -> None:
        """Create the SQLite database and tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create fixtures table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fixtures (
                id INTEGER PRIMARY KEY,
                match_id INTEGER UNIQUE,
                matchday INTEGER,
                date TEXT,
                time TEXT,
                home_team TEXT,
                away_team TEXT,
                home_team_id INTEGER,
                away_team_id INTEGER,
                status TEXT,
                venue TEXT,
                home_score INTEGER,
                away_score INTEGER,
                season TEXT,
                updated_at TEXT
            )
        """)
        
        # Create teams table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY,
                team_id INTEGER UNIQUE,
                name TEXT,
                short_name TEXT,
                tla TEXT,
                crest TEXT,
                founded INTEGER,
                venue TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        
    def get_premier_league_fixtures(self) -> Optional[List[Dict]]:
        """Download Premier League fixtures from football-data.org API"""
        try:
            # Premier League competition ID is 'PL'
            url = f"{self.base_url}/competitions/PL/matches"
            
            # Get current season fixtures (no season parameter needed)
            print("Fetching Premier League fixtures...")
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                matches = data.get("matches", [])
                if matches:
                    print(f"Found {len(matches)} fixtures")
                    return matches
            elif response.status_code == 403:
                print("API key required or invalid. Please check FOOTBALL_DATA_API_KEY environment variable.")
                return None
            else:
                print(f"Error fetching data: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def get_premier_league_teams(self) -> Optional[List[Dict]]:
        """Download Premier League teams data"""
        try:
            url = f"{self.base_url}/competitions/PL/teams"
            
            # Get current season teams (no season parameter needed)
            print("Fetching Premier League teams...")
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                teams = data.get("teams", [])
                if teams:
                    print(f"Found {len(teams)} teams")
                    return teams
            else:
                print(f"Error fetching teams: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def insert_teams(self, teams: List[Dict]) -> None:
        """Insert teams data into database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for team in teams:
            cursor.execute("""
                INSERT OR REPLACE INTO teams 
                (team_id, name, short_name, tla, crest, founded, venue)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                team.get("id"),
                team.get("name"),
                team.get("shortName"),
                team.get("tla"),
                team.get("crest"),
                team.get("founded"),
                team.get("venue")
            ))
        
        conn.commit()
        conn.close()
        print(f"Inserted {len(teams)} teams into database")
    
    def insert_fixtures(self, fixtures: List[Dict]) -> None:
        """Insert fixtures data into database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for fixture in fixtures:
            # Parse date and time
            utc_date = fixture.get("utcDate", "")
            date_part = utc_date.split("T")[0] if utc_date else ""
            time_part = utc_date.split("T")[1].replace("Z", "") if "T" in utc_date else ""
            
            # Extract team information
            home_team = fixture.get("homeTeam", {})
            away_team = fixture.get("awayTeam", {})
            score = fixture.get("score", {}).get("fullTime", {})
            
            cursor.execute("""
                INSERT OR REPLACE INTO fixtures 
                (match_id, matchday, date, time, home_team, away_team, 
                 home_team_id, away_team_id, status, venue, 
                 home_score, away_score, season, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fixture.get("id"),
                fixture.get("matchday"),
                date_part,
                time_part,
                home_team.get("name"),
                away_team.get("name"),
                home_team.get("id"),
                away_team.get("id"),
                fixture.get("status"),
                fixture.get("venue"),
                score.get("home") if score else None,
                score.get("away") if score else None,
                "2025-26",
                datetime.now().isoformat()
            ))
        
        conn.commit()
        conn.close()
        print(f"Inserted {len(fixtures)} fixtures into database")
    
    def run(self) -> None:
        """Main execution method"""
        print("Creating Premier League 2025-26 fixtures database...")
        
        # Create database
        self.create_database()
        
        # Try to get data from API
        fixtures = self.get_premier_league_fixtures()
        teams = self.get_premier_league_teams()
        
        # Insert data
        if teams:
            self.insert_teams(teams)
        
        if fixtures:
            self.insert_fixtures(fixtures)
        
        print(f"Database created successfully: {self.db_path}")
        print("You can now query the database using SQL or Python sqlite3 module")
        
        # Display sample query
        self.show_sample_queries()
    
    def show_sample_queries(self) -> None:
        """Show sample queries to demonstrate the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        print("\n--- Sample Queries ---")
        
        # Count total fixtures
        cursor.execute("SELECT COUNT(*) FROM fixtures")
        fixture_count = cursor.fetchone()[0]
        print(f"Total fixtures: {fixture_count}")
        
        # Show first 5 fixtures
        cursor.execute("""
            SELECT date, time, home_team, away_team, matchday 
            FROM fixtures 
            ORDER BY date, time 
            LIMIT 5
        """)
        
        print("\nFirst 5 fixtures:")
        for row in cursor.fetchall():
            print(f"  {row[0]} {row[1]} - {row[2]} vs {row[3]} (Matchday {row[4]})")
        
        # Show teams count
        cursor.execute("SELECT COUNT(*) FROM teams")
        team_count = cursor.fetchone()[0]
        print(f"\nTotal teams: {team_count}")
        
        conn.close()


if __name__ == "__main__":
    # Create the fixtures database
    fixtures_db = PremierLeagueFixtures()
    fixtures_db.run()