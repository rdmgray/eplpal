import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connections
const dbPath = path.join(__dirname, '../../data/premier_league_2025_26.db');
const oddsDbPath = path.join(__dirname, '../../data/premier_league_odds.db');
const betsDbPath = path.join(__dirname, '../../data/sim_bets.db');
const db = new sqlite3.Database(dbPath);
const oddsDb = new sqlite3.Database(oddsDbPath);
const betsDb = new sqlite3.Database(betsDbPath);

// Team name mapping function to convert from fixtures DB names to odds DB names
const mapTeamName = (fixtureTeamName) => {
  const teamMappings = {
    'Liverpool FC': 'Liverpool',
    'AFC Bournemouth': 'Bournemouth',
    'Aston Villa FC': 'Aston Villa',
    'Newcastle United FC': 'Newcastle',
    'Brighton & Hove Albion FC': 'Brighton',
    'Fulham FC': 'Fulham',
    'Nottingham Forest FC': 'Nottm Forest',
    'Brentford FC': 'Brentford',
    'Sunderland AFC': 'Sunderland',
    'West Ham United FC': 'West Ham',
    'Chelsea FC': 'Chelsea',
    'Crystal Palace FC': 'Crystal Palace',
    'Tottenham Hotspur FC': 'Tottenham',
    'Burnley FC': 'Burnley',
    'Manchester United FC': 'Man Utd',
    'Arsenal FC': 'Arsenal',
    'Leeds United FC': 'Leeds',
    'Everton FC': 'Everton',
    'Wolverhampton Wanderers FC': 'Wolves',
    'Manchester City FC': 'Man City'
  };
  
  return teamMappings[fixtureTeamName] || fixtureTeamName;
};

// API Routes

// Get all fixtures for a specific matchday with odds
app.get('/api/fixtures/matchday/:matchday', (req, res) => {
  const matchday = parseInt(req.params.matchday);
  
  const query = `
    SELECT 
      f.match_id,
      f.matchday,
      f.date,
      f.time,
      f.home_team,
      f.away_team,
      f.home_team_id,
      f.away_team_id,
      f.status,
      f.venue,
      f.home_score,
      f.away_score
    FROM fixtures f
    WHERE f.matchday = ?
    ORDER BY f.date, f.time
  `;
  
  db.all(query, [matchday], (err, fixtures) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    // Get odds for each fixture
    const fixturesWithOdds = [];
    let processed = 0;
    
    if (fixtures.length === 0) {
      res.json({ matchday, fixtures: [] });
      return;
    }
    
    fixtures.forEach(fixture => {
      // Map team names to odds database format
      const mappedHomeName = mapTeamName(fixture.home_team);
      const mappedAwayName = mapTeamName(fixture.away_team);
      
      // Query odds database for latest odds for this match
      const oddsQuery = `
        SELECT 
          o.runner_type,
          o.best_back_price,
          o.request_time
        FROM matches m
        JOIN odds o ON m.id = o.match_id
        WHERE m.home_team = ? AND m.away_team = ?
        AND o.request_time = (
          SELECT MAX(o2.request_time) 
          FROM odds o2 
          WHERE o2.match_id = o.match_id
        )
        ORDER BY o.runner_type
      `;
      
      oddsDb.all(oddsQuery, [mappedHomeName, mappedAwayName], (oddsErr, oddsRows) => {
        processed++;
        
        const fixtureWithOdds = { ...fixture };
        
        if (!oddsErr && oddsRows.length > 0) {
          // Parse odds data
          const odds = {};
          oddsRows.forEach(row => {
            switch (row.runner_type) {
              case 'Home win':
                odds.home_win = row.best_back_price;
                break;
              case 'Away win':
                odds.away_win = row.best_back_price;
                break;
              case 'Draw':
                odds.draw = row.best_back_price;
                break;
            }
          });
          fixtureWithOdds.odds = odds;
        }
        
        fixturesWithOdds.push(fixtureWithOdds);
        
        // If all fixtures processed, send response
        if (processed === fixtures.length) {
          // Sort by original order
          fixturesWithOdds.sort((a, b) => {
            if (a.date === b.date) {
              return a.time.localeCompare(b.time);
            }
            return a.date.localeCompare(b.date);
          });
          
          res.json({
            matchday,
            fixtures: fixturesWithOdds
          });
        }
      });
    });
  });
});

// Get a specific fixture by match_id
app.get('/api/fixture/:matchId', (req, res) => {
  const matchId = parseInt(req.params.matchId);
  
  const query = `
    SELECT 
      f.match_id,
      f.matchday,
      f.date,
      f.time,
      f.home_team,
      f.away_team,
      f.home_team_id,
      f.away_team_id,
      f.status,
      f.venue,
      f.home_score,
      f.away_score
    FROM fixtures f
    WHERE f.match_id = ?
  `;
  
  db.get(query, [matchId], (err, fixture) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!fixture) {
      res.status(404).json({ error: 'Fixture not found' });
      return;
    }
    
    // Get odds for this fixture
    const mappedHomeName = mapTeamName(fixture.home_team);
    const mappedAwayName = mapTeamName(fixture.away_team);
    
    const oddsQuery = `
      SELECT 
        o.runner_type,
        o.best_back_price,
        o.request_time
      FROM matches m
      JOIN odds o ON m.id = o.match_id
      WHERE m.home_team = ? AND m.away_team = ?
      AND o.request_time = (
        SELECT MAX(o2.request_time) 
        FROM odds o2 
        WHERE o2.match_id = o.match_id
      )
      ORDER BY o.runner_type
    `;
    
    oddsDb.all(oddsQuery, [mappedHomeName, mappedAwayName], (oddsErr, oddsRows) => {
      const fixtureWithOdds = { ...fixture };
      
      if (!oddsErr && oddsRows.length > 0) {
        const odds = {};
        oddsRows.forEach(row => {
          switch (row.runner_type) {
            case 'Home win':
              odds.home_win = row.best_back_price;
              break;
            case 'Away win':
              odds.away_win = row.best_back_price;
              break;
            case 'Draw':
              odds.draw = row.best_back_price;
              break;
          }
        });
        fixtureWithOdds.odds = odds;
      }
      
      res.json({
        fixture: fixtureWithOdds
      });
    });
  });
});

// Get all matchdays
app.get('/api/matchdays', (req, res) => {
  const query = `
    SELECT DISTINCT matchday
    FROM fixtures
    WHERE matchday IS NOT NULL
    ORDER BY matchday
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    const matchdays = rows.map(row => row.matchday);
    res.json({ matchdays });
  });
});

// Get all teams
app.get('/api/teams', (req, res) => {
  const query = `
    SELECT 
      team_id,
      name,
      short_name,
      tla,
      crest,
      founded,
      venue
    FROM teams
    ORDER BY name
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    res.json({ teams: rows });
  });
});

// Get fixtures for a specific team
app.get('/api/fixtures/team/:teamId', (req, res) => {
  const teamId = parseInt(req.params.teamId);
  
  const query = `
    SELECT 
      f.match_id,
      f.matchday,
      f.date,
      f.time,
      f.home_team,
      f.away_team,
      f.home_team_id,
      f.away_team_id,
      f.status,
      f.venue,
      f.home_score,
      f.away_score
    FROM fixtures f
    WHERE f.home_team_id = ? OR f.away_team_id = ?
    ORDER BY f.date, f.time
  `;
  
  db.all(query, [teamId, teamId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    res.json({
      teamId,
      fixtures: rows
    });
  });
});

// Get all available bettor IDs
app.get('/api/bettors', (req, res) => {
  const query = `
    SELECT DISTINCT bettor_id
    FROM bets
    ORDER BY bettor_id
  `;
  
  betsDb.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    const bettorIds = rows.map(row => row.bettor_id);
    res.json({ bettors: bettorIds });
  });
});

// Get all available bet statuses
app.get('/api/bet-statuses', (req, res) => {
  const query = `
    SELECT DISTINCT status
    FROM bets
    ORDER BY status
  `;
  
  betsDb.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    const statuses = rows.map(row => row.status);
    res.json({ statuses: ['ALL', ...statuses] });
  });
});

// Get bets for a specific bettor with optional status filter
app.get('/api/bets/:bettorId', (req, res) => {
  const bettorId = parseInt(req.params.bettorId);
  const status = req.query.status || 'ALL'; // Default to ALL if no status specified
  
  let query = `
    SELECT 
      b.id,
      b.bettor_id,
      b.match_id,
      b.selection_id,
      b.runner_name,
      b.runner_type,
      b.back_or_lay,
      b.bet_amount,
      b.selection_odds,
      b.created_at,
      b.status,
      b.bet_won,
      b.returned_amount
    FROM bets b
    WHERE b.bettor_id = ?
  `;
  
  const queryParams = [bettorId];
  
  if (status !== 'ALL') {
    query += ` AND b.status = ?`;
    queryParams.push(status);
  }
  
  query += ` ORDER BY b.created_at DESC`;
  
  betsDb.all(query, queryParams, (err, bets) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    // For each bet, get the match information from the fixtures database
    const betsWithMatches = [];
    let processed = 0;
    
    if (bets.length === 0) {
      res.json({ bettor_id: bettorId, bets: [] });
      return;
    }
    
    bets.forEach(bet => {
      const matchQuery = `
        SELECT 
          f.match_id,
          f.matchday,
          f.date,
          f.time,
          f.home_team,
          f.away_team,
          f.status as match_status
        FROM fixtures f
        WHERE f.match_id = ?
      `;
      
      db.get(matchQuery, [bet.match_id], (matchErr, match) => {
        processed++;
        
        const betWithMatch = { 
          ...bet,
          match: match || null
        };
        
        betsWithMatches.push(betWithMatch);
        
        // If all bets processed, send response
        if (processed === bets.length) {
          // Sort by creation date (most recent first)
          betsWithMatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          res.json({
            bettor_id: bettorId,
            bets: betsWithMatches
          });
        }
      });
    });
  });
});

// Get odds history for a specific fixture
app.get('/api/fixture/:matchId/odds-history', (req, res) => {
  const matchId = parseInt(req.params.matchId);
  
  // First get fixture details
  const fixtureQuery = `
    SELECT 
      f.home_team,
      f.away_team
    FROM fixtures f
    WHERE f.match_id = ?
  `;
  
  db.get(fixtureQuery, [matchId], (err, fixture) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!fixture) {
      res.status(404).json({ error: 'Fixture not found' });
      return;
    }
    
    // Map team names and get odds history
    const mappedHomeName = mapTeamName(fixture.home_team);
    const mappedAwayName = mapTeamName(fixture.away_team);
    
    const oddsHistoryQuery = `
      SELECT 
        o.runner_type,
        o.best_back_price,
        o.best_lay_price,
        o.last_price_traded,
        o.total_matched,
        o.request_time
      FROM matches m
      JOIN odds o ON m.id = o.match_id
      WHERE m.home_team = ? AND m.away_team = ?
      ORDER BY o.request_time ASC, o.runner_type
    `;
    
    oddsDb.all(oddsHistoryQuery, [mappedHomeName, mappedAwayName], (oddsErr, oddsRows) => {
      if (oddsErr) {
        console.error('Odds database error:', oddsErr);
        res.status(500).json({ error: 'Odds database error' });
        return;
      }
      
      // Group odds by timestamp and runner type
      const historyByTime = {};
      
      oddsRows.forEach(row => {
        if (!historyByTime[row.request_time]) {
          historyByTime[row.request_time] = {};
        }
        
        const runnerKey = row.runner_type === 'Home win' ? 'home_win' :
                         row.runner_type === 'Away win' ? 'away_win' :
                         'draw';
        
        historyByTime[row.request_time][runnerKey] = {
          back_price: row.best_back_price,
          lay_price: row.best_lay_price,
          last_traded: row.last_price_traded,
          total_matched: row.total_matched
        };
      });
      
      // Convert to array format sorted by time
      const history = Object.entries(historyByTime)
        .map(([timestamp, odds]) => ({
          timestamp,
          odds
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      res.json({
        match_id: matchId,
        home_team: fixture.home_team,
        away_team: fixture.away_team,
        history
      });
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  
  // Test database connection
  db.get("SELECT COUNT(*) as count FROM fixtures", (err, row) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
    } else {
      console.log(`✅ Database connected - ${row.count} fixtures loaded`);
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing fixtures database:', err);
    } else {
      console.log('✅ Fixtures database connection closed');
    }
    
    oddsDb.close((oddsErr) => {
      if (oddsErr) {
        console.error('Error closing odds database:', oddsErr);
      } else {
        console.log('✅ Odds database connection closed');
      }
      
      betsDb.close((betsErr) => {
        if (betsErr) {
          console.error('Error closing bets database:', betsErr);
        } else {
          console.log('✅ Bets database connection closed');
        }
        process.exit(0);
      });
    });
  });
});