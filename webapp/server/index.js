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

// Database connection
const dbPath = path.join(__dirname, '../../data/premier_league_2025_26.db');
const db = new sqlite3.Database(dbPath);

// API Routes

// Get all fixtures for a specific matchday
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
  
  db.all(query, [matchday], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    res.json({
      matchday,
      fixtures: rows
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
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});