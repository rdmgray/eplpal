#!/usr/bin/env python3

import os
import sys
import json
import sqlite3
import requests
import urllib.request
import urllib.parse
import getpass
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, List, Optional, Any
import dotenv

# Add parent directory to path for virtual environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
dotenv.load_dotenv()

class BetfairClient:
    """Betfair API client for retrieving match odds data"""
    
    def __init__(self, timeout: int = 30):
        self.base_url = "https://api.betfair.com/exchange/betting/json-rpc/v1"
        self.timeout = timeout
        self.api_key = os.getenv("BETFAIR_API_KEY")
        self.session_token = self.authenticate()
        
        if not self.api_key:
            raise ValueError("Missing BETFAIR_API_KEY in environment")
                
        self.headers = {
            'Content-Type': 'application/json',
            'X-Application': self.api_key,
            'X-Authentication': self.session_token
        }
    
    def authenticate(self) -> str:
        """Authenticate with Betfair and get a session token"""
        login_url = "https://identitysso.betfair.com/api/login"
        
        login_data = {
            "username": os.getenv("BETFAIR_USERNAME"),
            "password": os.getenv("BETFAIR_PASSWORD")
        }
        
        login_headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Application': 'eplpal'
        }
        
        login_url = "https://identitysso-cert.betfair.com/api/certlogin"

        cert_file = os.getenv("CERT_FILE_PATH")
        key_file = os.getenv("KEY_FILE_PATH")
        
        response = requests.post(
            login_url,
            data=login_data,
            cert=(cert_file, key_file),
            headers=login_headers
        )
        
        if response.status_code == 200:
            return response.json()["sessionToken"]
        else:
            raise Exception(f"Login failed: {response.text}")
    
    def _make_request(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make a JSON-RPC request to the Betfair API"""
        if params is None:
            params = {"filter": {}}
        
        json_rpc_data = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        }
        
        json_data = json.dumps(json_rpc_data).encode('utf-8')
        
        request = urllib.request.Request(
            url=self.base_url,
            data=json_data,
            headers=self.headers,
            method='POST'
        )
        
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                response_data = response.read().decode('utf-8')
                json_response = json.loads(response_data)
                
                if 'error' in json_response:
                    raise Exception(f"API Error: {json_response['error']}")
                
                return json_response.get('result', [])
                    
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"Request failed with {e.code}: {error_body}")
            if "INVALID_SESSION_INFORMATION" in error_body:
                raise Exception("Invalid session token. Please check your BETFAIR_SESSION_TOKEN in .env file.")
            raise Exception(f"HTTP {e.code}: {error_body}")
        except urllib.error.URLError as e:
            raise Exception(f"Network error: {e.reason}")
        except json.JSONDecodeError:
            raise Exception(f"Invalid JSON response: {response_data}")
    
    
    def get_premier_league_id(self) -> str:
        """Get the competition ID for English Premier League"""
        params = {
            "filter": {
                "eventTypeIds": [1]  # Soccer
            }
        }
        
        competitions = self._make_request("SportsAPING/v1.0/listCompetitions", params)
        
        for comp in competitions:
            if "English Premier League" in comp['competition']['name']:
                return comp['competition']['id']
        
        raise Exception("English Premier League not found")
    
    def get_upcoming_matches(self, competition_id: str) -> List[Dict[str, Any]]:
        """Get upcoming Premier League matches"""
        params = {
            "filter": {
                "eventTypeIds": [1],
                "competitionIds": [competition_id]
            }
        }
        
        events = self._make_request("SportsAPING/v1.0/listEvents", params)
        
        # Filter out non-match events (like season-long markets)
        matches = []
        for event in events:
            event_name = event['event']['name']
            # Check if it's a match between two teams (contains ' v ')
            if ' v ' in event_name and event_name != 'English Premier League':
                matches.append(event)
        
        return matches
    
    def get_match_odds(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Get match odds for a specific event"""
        # First get the market catalogue
        market_params = {
            "filter": {
                "eventIds": [event_id],
                "marketTypeCodes": ["MATCH_ODDS"]
            },
            "maxResults": 1,
            "marketProjection": ["COMPETITION", "EVENT", "EVENT_TYPE", "MARKET_DESCRIPTION", "RUNNER_DESCRIPTION"]
        }
        
        markets = self._make_request("SportsAPING/v1.0/listMarketCatalogue", market_params)
        
        if not markets:
            return None
        
        market_id = markets[0]['marketId']
        market_info = markets[0]
        
        # Get the actual odds
        odds_params = {
            "marketIds": [market_id],
            "priceProjection": {
                "priceData": ["EX_BEST_OFFERS"]
            }
        }
        
        market_book = self._make_request("SportsAPING/v1.0/listMarketBook", odds_params)
        
        if not market_book:
            return None
        
        # Combine market info with odds data
        return {
            "market_info": market_info,
            "market_book": market_book[0]
        }

class OddsDatabase:
    """SQLite database for storing match odds"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        
        # Check if database exists
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Database not found at {db_path}. Please run init_betfair_db.py first.")
    
    def insert_match(self, event_id: str, market_id: str, home_team: str, away_team: str, match_date: str) -> int:
        """Insert a match record if it doesn't exist, or return existing match ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if match already exists
        cursor.execute('SELECT id FROM matches WHERE event_id = ?', (event_id,))
        existing_match = cursor.fetchone()
        
        if existing_match:
            match_id = existing_match[0]
        else:
            # Insert new match
            cursor.execute('''
                INSERT INTO matches (event_id, market_id, home_team, away_team, match_date)
                VALUES (?, ?, ?, ?, ?)
            ''', (event_id, market_id, home_team, away_team, match_date))
            match_id = cursor.lastrowid
            conn.commit()
        
        conn.close()
        return match_id
    
    def insert_odds(
        self,
        match_id: int,
        runner_data: Dict[str, Any],
        runner_name: str,
        runner_type: str,
        request_time: str
        ):
        """Insert odds data for a runner"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Extract best back and lay prices
        best_back_price = None
        best_back_size = None
        best_lay_price = None
        best_lay_size = None
        
        if 'ex' in runner_data:
            if 'availableToBack' in runner_data['ex'] and runner_data['ex']['availableToBack']:
                best_back_price = runner_data['ex']['availableToBack'][0]['price']
                best_back_size = runner_data['ex']['availableToBack'][0]['size']
            
            if 'availableToLay' in runner_data['ex'] and runner_data['ex']['availableToLay']:
                best_lay_price = runner_data['ex']['availableToLay'][0]['price']
                best_lay_size = runner_data['ex']['availableToLay'][0]['size']
        
        cursor.execute('''
            INSERT INTO odds (
                match_id, selection_id, runner_name, runner_type, best_back_price, best_back_size,
                best_lay_price, best_lay_size, last_price_traded, total_matched, status, request_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            match_id,
            runner_data['selectionId'],
            runner_name,
            runner_type,
            best_back_price,
            best_back_size,
            best_lay_price,
            best_lay_size,
            runner_data.get('lastPriceTraded'),
            runner_data.get('totalMatched'),
            runner_data['status'],
            request_time
        ))
        
        conn.commit()
        conn.close()

def parse_match_name(match_name: str) -> tuple[str, str]:
    """Parse match name to extract home and away teams"""
    if ' v ' in match_name:
        home, away = match_name.split(' v ', 1)
        return home.strip(), away.strip()
    else:
        return match_name, ""

def main():
    """Main function to collect and store Premier League odds"""
    # Initialize database
    db_path = "/Users/rdmgray/Projects/EPLpal/data/premier_league_odds.db"
    
    try:
        db = OddsDatabase(db_path)
        print(f"✅ Connected to database: {db_path}")
    except FileNotFoundError as e:
        print(f"❌ {e}")
        print("Run: python init_betfair_db.py")
        return
    
    # Initialize Betfair client
    try:
        client = BetfairClient()
        print("✅ Betfair client initialized")
    except ValueError as e:
        print(f"❌ Error: {e}")
        return
    
    # Test if current session token is valid
    print("Testing current session token...")
    try:
        # Try a simple API call to test the token
        competition_id = client.get_premier_league_id()
        print("Session token is valid!")
    except Exception as e:
        if "INVALID_SESSION_INFORMATION" in str(e):
            print("Session token is invalid. Authentication would be required.")
            print("Please update your BETFAIR_SESSION_TOKEN in the .env file with a valid token.")
            return
        else:
            print(f"Error occurred: {e}")
            return
    
    try:
        # Get Premier League competition ID
        print("Getting Premier League competition ID...")
        competition_id = client.get_premier_league_id()
        print(f"Premier League ID: {competition_id}")
        
        # Get upcoming matches
        print("Fetching upcoming matches...")
        matches = client.get_upcoming_matches(competition_id)
        print(f"Found {len(matches)} upcoming matches")
        
        # Capture request time for this entire collection session
        request_time = datetime.now().isoformat()
        print(f"Collection session started at: {request_time}")
        
        # Process each match
        for match in matches:
            event_id = match['event']['id']
            match_name = match['event']['name']
            match_date = match['event']['openDate']
            
            print(f"\nProcessing: {match_name} ({match_date})")
            
            # Get odds for this match
            odds_data = client.get_match_odds(event_id)
            
            if not odds_data:
                print(f"No odds available for {match_name}")
                continue
            
            # Parse match name
            home_team, away_team = parse_match_name(match_name)
            
            # Insert match into database
            market_id = odds_data['market_info']['marketId']
            match_id = db.insert_match(event_id, market_id, home_team, away_team, match_date)
            
            # Insert odds for each runner
            market_book = odds_data['market_book']
            runners_info = odds_data['market_info']['runners']
            
            # Create a mapping of selection IDs to runner names
            runner_names = {runner['selectionId']: runner['runnerName'] for runner in runners_info}
            
            for runner in market_book['runners']:
                selection_id = runner['selectionId']
                runner_name = runner_names.get(selection_id, f"Unknown_{selection_id}")
                if runner_name == home_team:
                    runner_type = "Home win"
                elif runner_name == away_team:
                    runner_type = "Away win"
                else:
                    runner_type = "Draw"
                db.insert_odds(match_id, runner, runner_name, runner_type, request_time)
        
        print(f"\nOdds collection complete! Data saved to {db_path}")
        
    except Exception as e:
        print(f"Error occurred: {e}")
        return

if __name__ == "__main__":
    main()