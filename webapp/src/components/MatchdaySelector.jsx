import React from 'react'

const MatchdaySelector = ({ matchdays, currentMatchday, onMatchdayChange }) => {
  return (
    <div className="matchday-selector">
      <div className="matchday-tabs">
        {matchdays.map(matchday => (
          <button
            key={matchday}
            className={`matchday-tab ${currentMatchday === matchday ? 'active' : ''}`}
            onClick={() => onMatchdayChange(matchday)}
          >
            {matchday}
          </button>
        ))}
      </div>
    </div>
  )
}

export default MatchdaySelector