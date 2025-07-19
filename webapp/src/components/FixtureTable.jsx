import React from 'react'
import { getTeamCrest } from '../utils/teamCrestMapping'

const FixtureTable = ({ fixtures }) => {
  const formatDate = (dateString, timeString) => {
    if (!dateString) return 'TBD'
    
    try {
      // If we have both date and time, use the combined datetime for accurate local date
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
      
      // Fallback to just the date
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
      // Combine date and time to create a proper datetime
      const utcDateTime = `${dateString}T${timeString}Z`
      const date = new Date(utcDateTime)
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'TBD'
      }
      
      // Format to local time (HH:MM)
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return 'TBD'
    }
  }

  const cleanTeamName = (teamName) => {
    // Remove 'FC' suffix for cleaner display
    return teamName?.replace(/ FC$/, '') || 'TBD'
  }

  const getStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'scheduled'
      case 'LIVE':
      case 'IN_PLAY':
        return 'live'
      case 'FINISHED':
        return 'finished'
      default:
        return 'scheduled'
    }
  }

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'Scheduled'
      case 'LIVE':
      case 'IN_PLAY':
        return 'Live'
      case 'FINISHED':
        return 'Finished'
      default:
        return 'Scheduled'
    }
  }

  return (
    <div className="fixture-table">
      <table className="fixtures-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Home Team</th>
            <th></th>
            <th>Away Team</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map(fixture => (
            <tr key={fixture.match_id} className="fixture-row">
              <td className="date-cell">
                {formatDate(fixture.date, fixture.time)}
              </td>
              <td className="time-cell">
                {formatTime(fixture.date, fixture.time)}
              </td>
              <td className="team-cell home-team">
                <div className="team-with-crest">
                  <span className="team-name">{cleanTeamName(fixture.home_team)}</span>
                  <img 
                    src={getTeamCrest(fixture.home_team)} 
                    alt={`${fixture.home_team} crest`}
                    className="team-crest"
                    onError={(e) => { 
                      // Try PNG fallback if SVG fails
                      if (e.target.src.includes('.svg')) {
                        e.target.src = e.target.src.replace('.svg', '.png');
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                </div>
              </td>
              <td className="vs-cell">
                v
              </td>
              <td className="team-cell away-team">
                <div className="team-with-crest">
                  <img 
                    src={getTeamCrest(fixture.away_team)} 
                    alt={`${fixture.away_team} crest`}
                    className="team-crest"
                    onError={(e) => { 
                      // Try PNG fallback if SVG fails
                      if (e.target.src.includes('.svg')) {
                        e.target.src = e.target.src.replace('.svg', '.png');
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                  <span className="team-name">{cleanTeamName(fixture.away_team)}</span>
                </div>
              </td>
              <td className="status-cell">
                <span className={`status-badge ${getStatusClass(fixture.status)}`}>
                  {getStatusText(fixture.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FixtureTable