import React from 'react'

const FixtureItem = ({ fixture }) => {
  const formatTime = (timeString) => {
    if (!timeString || timeString === '00:00:00') return 'TBD'
    
    // Parse the time and format to HH:MM
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD'
    
    try {
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

  const cleanTeamName = (teamName) => {
    // Remove 'FC' suffix for cleaner display
    return teamName?.replace(/ FC$/, '') || 'TBD'
  }

  const getVenueName = (venue) => {
    if (!venue || venue === 'TBD') return null
    // Remove 'Stadium' suffix for cleaner display
    return venue.replace(/ Stadium$/, '')
  }

  return (
    <div className="fixture-item">
      <div className="fixture-time">
        <div className="fixture-time-text">
          {formatDate(fixture.date)}
        </div>
        <div className="fixture-time-text">
          {formatTime(fixture.time)}
        </div>
      </div>
      
      <div className="fixture-match">
        <div className="fixture-teams">
          {cleanTeamName(fixture.home_team)} vs {cleanTeamName(fixture.away_team)}
        </div>
        {getVenueName(fixture.venue) && (
          <div className="fixture-venue">
            @ {getVenueName(fixture.venue)}
          </div>
        )}
      </div>
      
      <div className={`fixture-status ${getStatusClass(fixture.status)}`}>
        {getStatusText(fixture.status)}
      </div>
    </div>
  )
}

export default FixtureItem