#!/usr/bin/env python3
"""
Premier League 2025-26 Fixtures Database Manager

This script downloads fixture data for the 2025-26 Premier League season
and stores it in a SQLite database. It can also update existing fixtures
with the latest results and changes.

Usage:
    python premier_league_fixtures.py                    # Create new database
    python premier_league_fixtures.py --update           # Update existing fixtures
    python premier_league_fixtures.py --db-path path/to/db.db --update  # Custom db path
"""

import sqlite3
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional
import os
import argparse
from dotenv import load_dotenv


class PremierLeagueFixtures:
    def __init__(self, db_path: str = "premier_league_2025_26.db"):
        # Load environment variables from .env file
        load_dotenv()

        self.db_path = db_path
        self.base_url = "https://api.football-data.org/v4"
        self.headers = {"X-Auth-Token": os.getenv("FOOTBALL_DATA_API_KEY", "")}

    def create_database(self) -> None:
        """Create the SQLite database and tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create fixtures table
        cursor.execute(
            """
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
        """
        )

        # Create teams table
        cursor.execute(
            """
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
        """
        )

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
                print(
                    "API key required or invalid. Please check FOOTBALL_DATA_API_KEY environment variable."
                )
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
            cursor.execute(
                """
                INSERT OR REPLACE INTO teams 
                (team_id, name, short_name, tla, crest, founded, venue)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    team.get("id"),
                    team.get("name"),
                    team.get("shortName"),
                    team.get("tla"),
                    team.get("crest"),
                    team.get("founded"),
                    team.get("venue"),
                ),
            )

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
            time_part = (
                utc_date.split("T")[1].replace("Z", "") if "T" in utc_date else ""
            )

            # Extract team information
            home_team = fixture.get("homeTeam", {})
            away_team = fixture.get("awayTeam", {})
            score = fixture.get("score", {}).get("fullTime", {})

            cursor.execute(
                """
                INSERT OR REPLACE INTO fixtures 
                (match_id, matchday, date, time, home_team, away_team, 
                 home_team_id, away_team_id, status, venue, 
                 home_score, away_score, season, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
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
                    datetime.now().isoformat(),
                ),
            )

        conn.commit()
        conn.close()
        print(f"Inserted {len(fixtures)} fixtures into database")

    def update_fixtures_with_results(self) -> None:
        """Update existing fixtures with latest data including results"""
        print("Updating fixtures with latest data and results...")

        # Get latest fixture data from API
        fixtures = self.get_premier_league_fixtures()
        if not fixtures:
            print("No fixture data retrieved, skipping updates")
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        updated_count = 0
        new_count = 0

        for fixture in fixtures:
            match_id = fixture.get("id")

            # Check if fixture exists in database
            cursor.execute(
                "SELECT match_id, home_score, away_score, status, date, time FROM fixtures WHERE match_id = ?",
                (match_id,),
            )
            existing = cursor.fetchone()

            # Parse new data
            utc_date = fixture.get("utcDate", "")
            date_part = utc_date.split("T")[0] if utc_date else ""
            time_part = (
                utc_date.split("T")[1].replace("Z", "") if "T" in utc_date else ""
            )

            home_team = fixture.get("homeTeam", {})
            away_team = fixture.get("awayTeam", {})
            score = fixture.get("score", {}).get("fullTime", {})
            new_home_score = score.get("home") if score else None
            new_away_score = score.get("away") if score else None
            new_status = fixture.get("status")

            if existing:
                # Check if anything has changed
                (
                    old_match_id,
                    old_home_score,
                    old_away_score,
                    old_status,
                    old_date,
                    old_time,
                ) = existing

                changes_detected = (
                    old_home_score != new_home_score
                    or old_away_score != new_away_score
                    or old_status != new_status
                    or old_date != date_part
                    or old_time != time_part
                )

                if changes_detected:
                    # Update the existing fixture
                    cursor.execute(
                        """
                        UPDATE fixtures SET 
                            matchday = ?, date = ?, time = ?, home_team = ?, away_team = ?,
                            home_team_id = ?, away_team_id = ?, status = ?, venue = ?,
                            home_score = ?, away_score = ?, updated_at = ?
                        WHERE match_id = ?
                        """,
                        (
                            fixture.get("matchday"),
                            date_part,
                            time_part,
                            home_team.get("name"),
                            away_team.get("name"),
                            home_team.get("id"),
                            away_team.get("id"),
                            new_status,
                            fixture.get("venue"),
                            new_home_score,
                            new_away_score,
                            datetime.now().isoformat(),
                            match_id,
                        ),
                    )
                    updated_count += 1

                    # Log what changed
                    changes = []
                    if (
                        old_home_score != new_home_score
                        or old_away_score != new_away_score
                    ):
                        old_score = f"{old_home_score or '-'}-{old_away_score or '-'}"
                        new_score = f"{new_home_score or '-'}-{new_away_score or '-'}"
                        changes.append(f"score: {old_score} -> {new_score}")
                    if old_status != new_status:
                        changes.append(f"status: {old_status} -> {new_status}")
                    if old_date != date_part:
                        changes.append(f"date: {old_date} -> {date_part}")
                    if old_time != time_part:
                        changes.append(f"time: {old_time} -> {time_part}")

                    print(
                        f"  Updated {home_team.get('name')} vs {away_team.get('name')}: {', '.join(changes)}"
                    )
            else:
                # Insert new fixture
                cursor.execute(
                    """
                    INSERT INTO fixtures 
                    (match_id, matchday, date, time, home_team, away_team, 
                     home_team_id, away_team_id, status, venue, 
                     home_score, away_score, season, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        match_id,
                        fixture.get("matchday"),
                        date_part,
                        time_part,
                        home_team.get("name"),
                        away_team.get("name"),
                        home_team.get("id"),
                        away_team.get("id"),
                        new_status,
                        fixture.get("venue"),
                        new_home_score,
                        new_away_score,
                        "2025-26",
                        datetime.now().isoformat(),
                    ),
                )
                new_count += 1
                print(
                    f"  Added new fixture: {home_team.get('name')} vs {away_team.get('name')}"
                )

        conn.commit()
        conn.close()

        print(
            f"Update complete: {updated_count} fixtures updated, {new_count} new fixtures added"
        )

    def run(self, update_only: bool = False) -> None:
        """Main execution method"""
        if update_only:
            print("Updating Premier League 2025-26 fixtures with latest results...")
            self.update_fixtures_with_results()
        else:
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
        cursor.execute(
            """
            SELECT date, time, home_team, away_team, matchday 
            FROM fixtures 
            ORDER BY date, time 
            LIMIT 5
        """
        )

        print("\nFirst 5 fixtures:")
        for row in cursor.fetchall():
            print(f"  {row[0]} {row[1]} - {row[2]} vs {row[3]} (Matchday {row[4]})")

        # Show teams count
        cursor.execute("SELECT COUNT(*) FROM teams")
        team_count = cursor.fetchone()[0]
        print(f"\nTotal teams: {team_count}")

        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Premier League Fixtures Database Manager"
    )
    parser.add_argument(
        "--update",
        action="store_true",
        help="Update existing fixtures with latest results instead of creating new database",
    )
    parser.add_argument(
        "--db-path",
        default="premier_league_2025_26.db",
        help="Path to the database file (default: premier_league_2025_26.db)",
    )

    args = parser.parse_args()

    # Create the fixtures database manager
    fixtures_db = PremierLeagueFixtures(args.db_path)
    fixtures_db.run(update_only=args.update)
