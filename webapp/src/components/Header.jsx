import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Header = () => {
  const location = useLocation()

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>Premier League</h1>
          <p>2025-26 Season</p>
        </div>
        <nav className="header-nav">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Fixtures
          </Link>
          <Link 
            to="/bets" 
            className={`nav-link ${location.pathname === '/bets' ? 'active' : ''}`}
          >
            Bets
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header