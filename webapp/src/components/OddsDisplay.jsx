import React from 'react'

const OddsDisplay = ({ odds }) => {
  if (!odds || (!odds.home_win && !odds.draw && !odds.away_win)) {
    return null
  }

  const formatOdds = (oddsValue) => {
    if (!oddsValue) return 'N/A'
    return parseFloat(oddsValue).toFixed(2)
  }

  return (
    <div className="odds-display">
      <div className="odds-section">
        <div className="odds-label">Best Back Odds</div>
        <div className="odds-values">
          <div className="odds-item home-odds">
            <span className="odds-type">1</span>
            <span className="odds-value">{formatOdds(odds.home_win)}</span>
          </div>
          <div className="odds-item draw-odds">
            <span className="odds-type">X</span>
            <span className="odds-value">{formatOdds(odds.draw)}</span>
          </div>
          <div className="odds-item away-odds">
            <span className="odds-type">2</span>
            <span className="odds-value">{formatOdds(odds.away_win)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OddsDisplay