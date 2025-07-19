# Premier League 2025-26 Fixtures Web App

A clean, minimalist iOS-style web application for viewing Premier League 2025-26 fixtures.

## Features

- **Matchday Navigation**: Browse fixtures by matchday (1-38)
- **iOS-like Design**: Clean, minimalist interface with iOS design patterns
- **Responsive**: Optimized for mobile devices
- **Dark Mode**: Automatic dark mode support
- **Real-time Data**: Powered by SQLite database with live API data

## Project Structure

```
webapp/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── MatchdaySelector.jsx
│   │   ├── FixtureList.jsx
│   │   ├── FixtureItem.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── ErrorMessage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/
│   └── index.js
├── package.json
└── vite.config.js
```

## API Endpoints

- `GET /api/matchdays` - Get all available matchdays
- `GET /api/fixtures/matchday/:matchday` - Get fixtures for a specific matchday
- `GET /api/fixtures/team/:teamId` - Get fixtures for a specific team
- `GET /api/teams` - Get all teams
- `GET /api/health` - Health check

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```
   This will automatically start both the backend API server and frontend development server.

3. For development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

- The app will be available at `http://localhost:3000`
- API server runs on `http://localhost:3001`
- Navigate between matchdays using the tab selector
- View fixture details including teams, dates, times, and venues

## Design Features

- **iOS-inspired styling** with system fonts and colors
- **Card-based layout** for better content organization
- **Smooth animations** and transitions
- **Touch-friendly** interface elements
- **Accessible** design patterns
- **Dark mode** support based on system preference

## Dependencies

- React 18
- Vite (build tool)
- Express (API server)
- SQLite3 (database)
- CORS (cross-origin requests)