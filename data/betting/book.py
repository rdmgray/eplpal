import sqlite3
from contextlib import closing
import pandas as pd


class BookmakerSimulator:

    def __init__(self):
        self.odds_db_path = "/Users/rdmgray/Projects/EPLpal/data/premier_league_odds.db"
        self.bets_db_path = "/Users/rdmgray/Projects/EPLpal/data/sim_bets.db"

    def get_latest_odds(self):
        with closing(sqlite3.connect(bs.odds_db_path)) as odds_db_conn:
            odds = pd.read_sql_query("SELECT * from odds", odds_db_conn)
        # Get latest
        odds = odds.loc[
            odds.groupby(["match_id", "selection_id"])["request_time"].idxmax()
        ]
        return odds

    def get_all_bets(self):
        with closing(sqlite3.connect(bs.bets_db_path)) as odds_db_conn:
            bets = pd.read_sql_query("SELECT * from bets", odds_db_conn)
        return bets

    def place_bet(
        self,
        bettor_id: int,
        match_id: int,
        selection_id: int,
        back_or_lay: str,
        bet_amount: float,
    ):
        odds = self.get_latest_odds()

        # Check the validity
        assert (
            selection_id
            in odds.loc[odds["match_id"] == match_id, "selection_id"].values
        ), f"Invalid selection_id {selection_id} for match_id {match_id}."

        assert (
            bet_amount > 0 and bet_amount < 1000.0
        ), "Invalid bet amount - valid range [0,1000]."

        # Get selection odds
        if back_or_lay == "BACK":
            selection_odds = odds.loc[
                (
                    (odds["selection_id"] == selection_id)
                    & (odds["match_id"] == match_id)
                ),
                "best_back_price",
            ].values[0]
        elif back_or_lay == "LAY":
            selection_odds = odds.loc[
                (
                    (odds["selection_id"] == selection_id)
                    & (odds["match_id"] == match_id)
                ),
                "best_lay_price",
            ].values[0]
        else:
            return f"Invalid value for back_or_lay, choose BACK or LAY."

        runner_name = odds.loc[
            ((odds["selection_id"] == selection_id) & (odds["match_id"] == match_id)),
            "runner_name",
        ].values[0]
        runner_type = odds.loc[
            ((odds["selection_id"] == selection_id) & (odds["match_id"] == match_id)),
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
        odds = self.get_latest_odds()

        # Check the validity
        assert (
            winning_selection_id
            in odds.loc[odds["match_id"] == match_id, "selection_id"].values
        ), f"Invalid selection_id {winning_selection_id} for match_id {match_id}."

        runner_outcome = odds.loc[
            (odds["match_id"] == match_id)
            & (odds["selection_id"] == winning_selection_id),
            "runner_type",
        ].values[0]
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
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                # Losing back bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = false, returned_amount = 0
                            where match_id = ?
                            AND selection_id <> ?
                            AND back_or_lay = "BACK"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                # Winning lay bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = true, returned_amount = -bet_amount
                            where match_id = ?
                            AND selection_id <> ?
                            AND back_or_lay = "LAY"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
                # Losing lay bets
                cursor.execute(
                    """
                            UPDATE bets 
                            SET status = "SETTLED", runner_outcome = ?, bet_won = false, returned_amount = bet_amount * (selection_odds - 1)
                            where match_id = ?
                            AND selection_id = ?
                            AND back_or_lay = "LAY"
                """,
                    (runner_outcome, match_id, winning_selection_id),
                )
            bets_db_conn.commit()
