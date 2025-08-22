import sqlite3
from contextlib import closing
import pandas as pd


class BookmakerSimulator:

    def __init__(self):
        self.odds_db_path = "/Users/rdmgray/Projects/EPLpal/data/premier_league_odds.db"
        self.bets_db_path = "/Users/rdmgray/Projects/EPLpal/data/sim_bets.db"
        self.fixtures_db_path = (
            "/Users/rdmgray/Projects/EPLpal/data/premier_league_2025_26.db"
        )

        self.odds = self.get_latest_odds()
        self.fixtures = self.get_all_fixtures()

    def get_latest_odds(self):
        with closing(sqlite3.connect(self.odds_db_path)) as odds_db_conn:
            odds = pd.read_sql_query("SELECT * from odds", odds_db_conn)
        # Get latest
        odds = odds.loc[
            odds.groupby(["match_id", "selection_id"])["request_time"].idxmax()
        ]
        return odds

    def get_all_bets(self):
        with closing(sqlite3.connect(self.bets_db_path)) as bets_db_conn:
            bets = pd.read_sql_query("SELECT * from bets", bets_db_conn)
        return bets

    def get_all_fixtures(self):
        with closing(sqlite3.connect(self.fixtures_db_path)) as fixtures_db_conn:
            fixtures = pd.read_sql_query("SELECT * from fixtures", fixtures_db_conn)
        return fixtures

    def place_bet(
        self,
        bettor_id: int,
        match_id: int,
        selection_id: int,
        back_or_lay: str,
        bet_amount: float,
    ):

        # Check the validity
        assert (
            selection_id
            in self.odds.loc[self.odds["match_id"] == match_id, "selection_id"].values
        ), f"Invalid selection_id {selection_id} for match_id {match_id}."

        assert (
            bet_amount > 0 and bet_amount < 1000.0
        ), "Invalid bet amount - valid range [0,1000]."

        # Get selection odds
        if back_or_lay == "BACK":
            selection_odds = self.odds.loc[
                (
                    (self.odds["selection_id"] == selection_id)
                    & (self.odds["match_id"] == match_id)
                ),
                "best_back_price",
            ].values[0]
        elif back_or_lay == "LAY":
            selection_odds = self.odds.loc[
                (
                    (self.odds["selection_id"] == selection_id)
                    & (self.odds["match_id"] == match_id)
                ),
                "best_lay_price",
            ].values[0]
        else:
            return f"Invalid value for back_or_lay, choose BACK or LAY."

        runner_name = self.odds.loc[
            (
                (self.odds["selection_id"] == selection_id)
                & (self.odds["match_id"] == match_id)
            ),
            "runner_name",
        ].values[0]
        runner_type = self.odds.loc[
            (
                (self.odds["selection_id"] == selection_id)
                & (self.odds["match_id"] == match_id)
            ),
            "runner_type",
        ].values[0]

        # Insert new bet
        with closing(sqlite3.connect(self.bets_db_path)) as bets_db_conn:
            with closing(bets_db_conn.cursor()) as cursor:
                cursor.execute(
                    """
                            INSERT INTO bets (bettor_id, match_id, selection_id, runner_name, runner_type, back_or_lay, bet_amount, selection_odds, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        bettor_id,
                        match_id,
                        selection_id,
                        runner_name,
                        runner_type,
                        back_or_lay,
                        bet_amount,
                        selection_odds,
                        "PLACED",
                    ),
                )
                bet_id = cursor.lastrowid
            bets_db_conn.commit()

        print(
            f"Bet placed: {back_or_lay} {bet_amount} on {runner_name}. Bet id {bet_id}."
        )
        return bet_id

    def cancel_bet(self, bettor_id, bet_id):

        all_bets = self.get_all_bets()

        assert (
            bet_id in all_bets.loc[all_bets["bettor_id"] == bettor_id, "id"].values
        ), f"Invalid bet id {bet_id} for bettor {bettor_id}"

        # Update bet
        with closing(sqlite3.connect(self.bets_db_path)) as bets_db_conn:
            with closing(bets_db_conn.cursor()) as cursor:
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "CANCELLED"
                            where bettor_id = ?
                            AND id = ?
                """,
                    (bettor_id, bet_id),
                )
            bets_db_conn.commit()

        print(f"Bet cancelled: {bet_id}.")
        return bet_id

    def resolve_bets(self, match_id, winning_selection_id):

        # Check the validity
        assert (
            winning_selection_id
            in self.odds.loc[self.odds["match_id"] == match_id, "selection_id"].values
        ), f"Invalid selection_id {winning_selection_id} for match_id {match_id}."

        runner_outcome = self.odds.loc[
            (self.odds["match_id"] == match_id)
            & (self.odds["selection_id"] == winning_selection_id),
            "runner_type",
        ].values[0]
        
        print(f"    Resolving bets for match {match_id}, winning outcome: {runner_outcome}")
        
        # Winning back bets
        with closing(sqlite3.connect(self.bets_db_path)) as bets_db_conn:
            with closing(bets_db_conn.cursor()) as cursor:
                # Winning back bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = true, returned_amount = bet_amount * selection_odds
                            where match_id = ?
                            AND selection_id = ?
                            AND back_or_lay = "BACK"
                            AND status = "PLACED"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                print(f"      Updated {cursor.rowcount} winning back bets")
                # Losing back bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = false, returned_amount = 0
                            where match_id = ?
                            AND selection_id <> ?
                            AND back_or_lay = "BACK"
                            AND status = "PLACED"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                print(f"      Updated {cursor.rowcount} losing back bets")
                # Winning lay bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = true, returned_amount = bet_amount
                            where match_id = ?
                            AND selection_id <> ?
                            AND back_or_lay = "LAY"
                            AND status = "PLACED"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                print(f"      Updated {cursor.rowcount} winning lay bets")
                # Losing lay bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = false, returned_amount = -bet_amount * (selection_odds - 1)
                            where match_id = ?
                            AND selection_id = ?
                            AND back_or_lay = "LAY"
                            AND status = "PLACED"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                print(f"      Updated {cursor.rowcount} losing lay bets")
            bets_db_conn.commit()

    def resolve_all(self):
        finished = self.fixtures[self.fixtures["status"] == "FINISHED"].copy()
        print(f"Found {len(finished)} finished fixtures to process")

        for i, fixture in finished.iterrows():
            match_id = fixture["match_id"]
            home_score = fixture["home_score"] 
            away_score = fixture["away_score"]
            
            print(f"Processing match {match_id}: {fixture['home_team']} {home_score}-{away_score} {fixture['away_team']}")
            
            if home_score > away_score:
                winning_outcome = "Home win"
            elif away_score > home_score:
                winning_outcome = "Away win"
            else:
                winning_outcome = "Draw"
                
            print(f"  Winning outcome: {winning_outcome}")

            # Check if we have odds data for this match
            match_odds = self.odds[self.odds["match_id"] == match_id]
            if match_odds.empty:
                print(f"  No odds data found for match {match_id}, skipping")
                continue
                
            winning_odds = match_odds[match_odds["runner_type"] == winning_outcome]
            if winning_odds.empty:
                print(f"  No odds found for outcome '{winning_outcome}' in match {match_id}, skipping")
                continue
                
            winning_selection_id = int(winning_odds["selection_id"].values[0])
            print(f"  Winning selection_id: {winning_selection_id}")

            self.resolve_bets(match_id, winning_selection_id)
            print(f"  Resolved bets for match {match_id}")
            
        print("Finished processing all matches")


if __name__ == "__main__":
    bs = BookmakerSimulator()
    bs.resolve_all()