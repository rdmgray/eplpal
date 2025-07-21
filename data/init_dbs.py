#!/usr/bin/env python3

import os
import sqlite3
from datetime import datetime


def init_odds_database(db_path: str):
    """Initialize the Betfair odds database with proper schema"""
    print(f"Initializing database at: {db_path}")

    # Remove existing database if it exists
    if os.path.exists(db_path):
        print("Removing existing database...")
        os.remove(db_path)

    # Create new database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Creating matches table...")
    # Create matches table
    cursor.execute(
        """
        CREATE TABLE matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE NOT NULL,
            market_id TEXT NOT NULL,
            home_team TEXT NOT NULL,
            away_team TEXT NOT NULL,
            match_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    print("Creating odds table...")
    # Create odds table
    cursor.execute(
        """
        CREATE TABLE odds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            selection_id INTEGER NOT NULL,
            runner_name TEXT NOT NULL,
            runner_type TEXT NOT NULL,
            best_back_price REAL,
            best_back_size REAL,
            best_lay_price REAL,
            best_lay_size REAL,
            last_price_traded REAL,
            total_matched REAL,
            status TEXT NOT NULL,
            request_time TIMESTAMP NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id)
        )
    """
    )

    # Create indexes for better performance
    print("Creating indexes...")
    cursor.execute("CREATE INDEX idx_matches_event_id ON matches(event_id)")
    cursor.execute("CREATE INDEX idx_odds_match_id ON odds(match_id)")
    cursor.execute("CREATE INDEX idx_odds_request_time ON odds(request_time)")
    cursor.execute("CREATE INDEX idx_odds_selection_id ON odds(selection_id)")

    conn.commit()
    conn.close()

    print("Database initialization complete!")
    print(f"Database created at: {db_path}")


def init_bets_database(db_path: str):
    """Initialize the bettor positions database with proper schema"""
    print(f"Initializing database at: {db_path}")

    # Remove existing database if it exists
    if os.path.exists(db_path):
        print("Removing existing database...")
        os.remove(db_path)

    # Create new database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Creating bets table...")
    # Create bets table
    cursor.execute(
        """
        CREATE TABLE bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bettor_id INTEGER NOT NULL,
            match_id INTEGER NOT NULL,
            selection_id INTEGER NOT NULL,
            runner_name TEXT NOT NULL,
            runner_type TEXT NOT NULL,
            back_or_lay TEXT NOT NULL,
            bet_amount REAL,
            selection_odds REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL,
            runner_outcome TEXT,
            bet_won BOOLEAN,
            returned_amount REAL
        )
    """
    )
    conn.commit()
    conn.close()

    print("Database initialization complete!")
    print(f"Database created at: {db_path}")


def main():
    """Main function to initialize the database"""
    odds_db_path = "/Users/rdmgray/Projects/EPLpal/data/premier_league_odds.db"
    bets_db_path = "/Users/rdmgray/Projects/EPLpal/data/sim_bets.db"

    try:
        init_odds_database(odds_db_path)
        print("\n Odds database successfully initialized!")
        init_bets_database(bets_db_path)
        print("\n Bets database successfully initialized!")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
