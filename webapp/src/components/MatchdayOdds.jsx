import React from 'react'
import { getTeamCrest } from '../utils/teamCrestMapping'

const MatchdayOdds = ({ fixtures, matchday }) => {
  const fixturesWithOdds = fixtures.filter(fixture => fixture.odds)

  if (fixturesWithOdds.length === 0) {
    return null
  }

  const formatOdds = (oddsValue) => {
    if (!oddsValue) return 'N/A'
    return parseFloat(oddsValue).toFixed(2)
  }

  const cleanTeamName = (teamName) => {
    return teamName?.replace(/ FC$| AFC$/, '') || 'TBD'
  }

  const formatDate = (dateString, timeString) => {
    if (!dateString) return 'TBD'
    
    try {
      if (timeString && timeString !== '00:00:00') {
        const utcDateTime = `${dateString}T${timeString}Z`
        const date = new Date(utcDateTime)
        
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          })
        }
      }
      
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    } catch (error) {
      return 'TBD'
    }
  }

  const formatTime = (dateString, timeString) => {
    if (!timeString || timeString === '00:00:00') return 'TBD'
    if (!dateString) return 'TBD'
    
    try {
      const utcDateTime = `${dateString}T${timeString}Z`
      const date = new Date(utcDateTime)
      
      if (isNaN(date.getTime())) {
        return 'TBD'
      }
      
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return 'TBD'
    }
  }

  return (
    <div className="odds-sidebar">
      <div className="odds-sidebar-header">
        <h3 className="odds-sidebar-title">Latest Odds</h3>
      </div>
      <div className="odds-sidebar-content">
        {fixturesWithOdds.map(fixture => (
            <div key={fixture.match_id} className="odds-fixture-card">
              <div className="odds-fixture-header">
                <div className="odds-fixture-date">
                  {formatDate(fixture.date, fixture.time)} • {formatTime(fixture.date, fixture.time)}
                </div>
              </div>
              
              <div className="odds-fixture-teams">
                <div className="odds-team home-team">
                  <img 
                    src={getTeamCrest(fixture.home_team)} 
                    alt={`${fixture.home_team} crest`}
                    className="odds-team-crest"
                    onError={(e) => { 
                      if (e.target.src.includes('.svg')) {
                        e.target.src = e.target.src.replace('.svg', '.png');
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                  <span className="odds-team-name">{cleanTeamName(fixture.home_team)}</span>
                </div>
                
                <div className="odds-vs">vs</div>
                
                <div className="odds-team away-team">
                  <span className="odds-team-name">{cleanTeamName(fixture.away_team)}</span>
                  <img 
                    src={getTeamCrest(fixture.away_team)} 
                    alt={`${fixture.away_team} crest`}
                    className="odds-team-crest"
                    onError={(e) => { 
                      if (e.target.src.includes('.svg')) {
                        e.target.src = e.target.src.replace('.svg', '.png');
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="odds-values-section">
                <div className="odds-item-card home-win">
                  <div className="odds-label-small">Home Win</div>
                  <div className="odds-value-large">{formatOdds(fixture.odds.home_win)}</div>
                </div>
                
                <div className="odds-item-card draw">
                  <div className="odds-label-small">Draw</div>
                  <div className="odds-value-large">{formatOdds(fixture.odds.draw)}</div>
                </div>
                
                <div className="odds-item-card away-win">
                  <div className="odds-label-small">Away Win</div>
                  <div className="odds-value-large">{formatOdds(fixture.odds.away_win)}</div>
                </div>
              </div>
            </div>
        ))}
      </div>
    </div>
  )
}

export default MatchdayOdds