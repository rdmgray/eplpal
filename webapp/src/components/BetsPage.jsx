import React, { useState, useEffect } from 'react'
import Header from './Header'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'
import { getTeamCrest } from '../utils/teamCrestMapping'

const BetsPage = () => {
  const [bettors, setBettors] = useState([])
  const [statuses, setStatuses] = useState([])
  const [currentBettorId, setCurrentBettorId] = useState(0)
  const [currentStatus, setCurrentStatus] = useState('PLACED')
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch available bettors and statuses on component mount
  useEffect(() => {
    const fetchBettors = async () => {
      try {
        const response = await fetch('/api/bettors')
        if (!response.ok) {
          throw new Error('Failed to fetch bettors')
        }
        const data = await response.json()
        setBettors(data.bettors)
        if (data.bettors.length > 0 && data.bettors.includes(0)) {
          setCurrentBettorId(0)
        } else if (data.bettors.length > 0) {
          setCurrentBettorId(data.bettors[0])
        }
      } catch (err) {
        setError(`Error loading bettors: ${err.message}`)
      }
    }

    const fetchStatuses = async () => {
      try {
        const response = await fetch('/api/bet-statuses')
        if (!response.ok) {
          throw new Error('Failed to fetch statuses')
        }
        const data = await response.json()
        setStatuses(data.statuses)
      } catch (err) {
        setError(`Error loading statuses: ${err.message}`)
      }
    }

    fetchBettors()
    fetchStatuses()
  }, [])

  // Fetch bets for the selected bettor and status
  useEffect(() => {
    const fetchBets = async () => {
      if (currentBettorId === null) return

      setLoading(true)
      setError(null)

      try {
        const url = `/api/bets/${currentBettorId}${currentStatus !== 'ALL' ? `?status=${currentStatus}` : '?status=ALL'}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch bets')
        }
        const data = await response.json()
        setBets(data.bets)
      } catch (err) {
        setError(`Error loading bets: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchBets()
  }, [currentBettorId, currentStatus])

  const handleBettorChange = (bettorId) => {
    setCurrentBettorId(parseInt(bettorId))
  }

  const handleStatusChange = (status) => {
    setCurrentStatus(status)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    } catch (error) {
      return 'N/A'
    }
  }

  const formatTime = (dateString, timeString) => {
    if (!dateString || !timeString || timeString === '00:00:00') return 'N/A'
    
    try {
      const utcDateTime = `${dateString}T${timeString}Z`
      const date = new Date(utcDateTime)
      
      if (isNaN(date.getTime())) {
        return 'N/A'
      }
      
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return 'N/A'
    }
  }

  const cleanTeamName = (teamName) => {
    return teamName?.replace(/ FC$| AFC$/, '') || 'N/A'
  }

  const formatAmount = (amount) => {
    if (!amount) return 'N/A'
    return `£${parseFloat(amount).toFixed(2)}`
  }

  const formatOdds = (odds) => {
    if (!odds) return 'N/A'
    return parseFloat(odds).toFixed(2)
  }

  const getBetTypeClass = (betType) => {
    return betType?.toLowerCase() === 'back' ? 'back-bet' : 'lay-bet'
  }

  const getMatchDisplay = (bet) => {
    if (!bet.match) {
      return `Match ID: ${bet.match_id}`
    }
    return `${cleanTeamName(bet.match.home_team)} vs ${cleanTeamName(bet.match.away_team)}`
  }

  const getTeamCrests = (bet) => {
    if (!bet.match) return null
    return {
      home: getTeamCrest(bet.match.home_team),
      away: getTeamCrest(bet.match.away_team)
    }
  }

  return (
    <div className="container">
      <Header />
      
      {error && <ErrorMessage message={error} />}
      
      {bettors.length > 0 && (
        <div className="bettor-selector-container">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Bettor Selection</h2>
            </div>
            <div className="card-content">
              <div className="bettor-selector">
                <div className="selector-group">
                  <label htmlFor="bettor-select" className="bettor-label">
                    Select Bettor ID:
                  </label>
                  <select
                    id="bettor-select"
                    value={currentBettorId}
                    onChange={(e) => handleBettorChange(e.target.value)}
                    className="bettor-select"
                  >
                    {bettors.map(bettorId => (
                      <option key={bettorId} value={bettorId}>
                        Bettor {bettorId}
                      </option>
                    ))}
                  </select>
                </div>
                
                {statuses.length > 0 && (
                  <div className="selector-group">
                    <label htmlFor="status-select" className="bettor-label">
                      Bet Status:
                    </label>
                    <select
                      id="status-select"
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bettor-select"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              {currentStatus === 'ALL' ? 'All Bets' : `${currentStatus} Bets`} - Bettor {currentBettorId} 
              {bets.length > 0 && <span className="bet-count">({bets.length} bet{bets.length !== 1 ? 's' : ''})</span>}
            </h2>
          </div>
          <div className="card-content">
            {bets.length === 0 ? (
              <div className="empty-state">
                <h3>No {currentStatus.toLowerCase()} bets found</h3>
                <p>Bettor {currentBettorId} has no {currentStatus.toLowerCase()} bets.</p>
              </div>
            ) : (
              <div className="bets-table">
                <table className="fixtures-table">
                  <thead>
                    <tr>
                      <th>Match</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Selection</th>
                      <th>Type</th>
                      <th>Back/Lay</th>
                      <th>Amount</th>
                      <th>Odds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map(bet => {
                      const crests = getTeamCrests(bet)
                      return (
                        <tr key={bet.id} className="bet-row">
                          <td className="match-cell">
                            <div className="match-info">
                              {crests && (
                                <div className="match-crests">
                                  <img 
                                    src={crests.home} 
                                    alt="Home team"
                                    className="team-crest-small"
                                    onError={(e) => { 
                                      if (e.target.src.includes('.svg')) {
                                        e.target.src = e.target.src.replace('.svg', '.png');
                                      } else {
                                        e.target.style.display = 'none';
                                      }
                                    }}
                                  />
                                  <span className="vs-small">v</span>
                                  <img 
                                    src={crests.away} 
                                    alt="Away team"
                                    className="team-crest-small"
                                    onError={(e) => { 
                                      if (e.target.src.includes('.svg')) {
                                        e.target.src = e.target.src.replace('.svg', '.png');
                                      } else {
                                        e.target.style.display = 'none';
                                      }
                                    }}
                                  />
                                </div>
                              )}
                              <div className="match-teams">
                                {getMatchDisplay(bet)}
                              </div>
                            </div>
                          </td>
                          <td className="date-cell">
                            {bet.match ? formatDate(bet.match.date) : 'N/A'}
                          </td>
                          <td className="time-cell">
                            {bet.match ? formatTime(bet.match.date, bet.match.time) : 'N/A'}
                          </td>
                          <td className="selection-cell">
                            <div className="selection-info">
                              <div className="runner-name">{bet.runner_name}</div>
                              <div className="runner-type">{bet.runner_type}</div>
                            </div>
                          </td>
                          <td className="bet-type-cell">
                            <span className={`bet-type-badge ${getBetTypeClass(bet.back_or_lay)}`}>
                              {bet.back_or_lay}
                            </span>
                          </td>
                          <td className="back-lay-cell">
                            <span className={`back-lay-indicator ${getBetTypeClass(bet.back_or_lay)}`}>
                              {bet.back_or_lay}
                            </span>
                          </td>
                          <td className="amount-cell">
                            {formatAmount(bet.bet_amount)}
                          </td>
                          <td className="odds-cell">
                            {formatOdds(bet.selection_odds)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BetsPage