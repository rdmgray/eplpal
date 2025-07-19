import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeamCrest } from '../utils/teamCrestMapping'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'

const FixtureDetail = () => {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [fixture, setFixture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchFixture = async () => {
      try {
        const response = await fetch(`/api/fixture/${matchId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch fixture details')
        }
        const data = await response.json()
        setFixture(data.fixture)
      } catch (err) {
        setError(`Error loading fixture: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (matchId) {
      fetchFixture()
    }
  }, [matchId])

  const formatDate = (dateString, timeString) => {
    if (!dateString) return 'TBD'
    
    try {
      if (timeString && timeString !== '00:00:00') {
        const utcDateTime = `${dateString}T${timeString}Z`
        const date = new Date(utcDateTime)
        
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      }
      
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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

  const cleanTeamName = (teamName) => {
    return teamName?.replace(/ FC$| AFC$/, '') || 'TBD'
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

  const formatOdds = (oddsValue) => {
    if (!oddsValue) return 'N/A'
    return parseFloat(oddsValue).toFixed(2)
  }

  if (loading) {
    return (
      <div className="container">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <ErrorMessage message={error} />
        <button 
          onClick={() => navigate('/')} 
          className="back-button"
        >
          ← Back to Fixtures
        </button>
      </div>
    )
  }

  if (!fixture) {
    return (
      <div className="container">
        <ErrorMessage message="Fixture not found" />
        <button 
          onClick={() => navigate('/')} 
          className="back-button"
        >
          ← Back to Fixtures
        </button>
      </div>
    )
  }

  return (
    <div className="container">
      <button 
        onClick={() => navigate('/')} 
        className="back-button"
      >
        ← Back to Fixtures
      </button>

      <div className="fixture-detail-card">
        <div className="fixture-detail-header">
          <div className="fixture-detail-matchday">
            Matchday {fixture.matchday}
          </div>
          <div className="fixture-detail-date">
            {formatDate(fixture.date, fixture.time)}
          </div>
          <div className="fixture-detail-time">
            {formatTime(fixture.date, fixture.time)}
          </div>
        </div>

        <div className="fixture-detail-teams">
          <div className="fixture-detail-team home-team">
            <img 
              src={getTeamCrest(fixture.home_team)} 
              alt={`${fixture.home_team} crest`}
              className="fixture-detail-crest"
              onError={(e) => { 
                if (e.target.src.includes('.svg')) {
                  e.target.src = e.target.src.replace('.svg', '.png');
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
            <div className="fixture-detail-team-name">
              {cleanTeamName(fixture.home_team)}
            </div>
          </div>

          <div className="fixture-detail-vs">
            <div className="vs-text">vs</div>
            <div className={`fixture-detail-status ${getStatusClass(fixture.status)}`}>
              {getStatusText(fixture.status)}
            </div>
          </div>

          <div className="fixture-detail-team away-team">
            <img 
              src={getTeamCrest(fixture.away_team)} 
              alt={`${fixture.away_team} crest`}
              className="fixture-detail-crest"
              onError={(e) => { 
                if (e.target.src.includes('.svg')) {
                  e.target.src = e.target.src.replace('.svg', '.png');
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
            <div className="fixture-detail-team-name">
              {cleanTeamName(fixture.away_team)}
            </div>
          </div>
        </div>

        {fixture.venue && (
          <div className="fixture-detail-venue">
            📍 {fixture.venue}
          </div>
        )}

        {fixture.odds && (
          <div className="fixture-detail-odds">
            <div className="fixture-detail-odds-header">
              <h3>Latest Odds</h3>
            </div>
            <div className="fixture-detail-odds-grid">
              <div className="fixture-detail-odds-item home-win">
                <div className="odds-label">Home Win</div>
                <div className="odds-value">{formatOdds(fixture.odds.home_win)}</div>
              </div>
              <div className="fixture-detail-odds-item draw">
                <div className="odds-label">Draw</div>
                <div className="odds-value">{formatOdds(fixture.odds.draw)}</div>
              </div>
              <div className="fixture-detail-odds-item away-win">
                <div className="odds-label">Away Win</div>
                <div className="odds-value">{formatOdds(fixture.odds.away_win)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FixtureDetail