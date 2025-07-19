import React, { useState, useEffect } from 'react'
import MatchdaySelector from './components/MatchdaySelector'
import FixtureList from './components/FixtureList'
import Header from './components/Header'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'

function App() {
  const [matchdays, setMatchdays] = useState([])
  const [currentMatchday, setCurrentMatchday] = useState(1)
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch available matchdays on component mount
  useEffect(() => {
    const fetchMatchdays = async () => {
      try {
        const response = await fetch('/api/matchdays')
        if (!response.ok) {
          throw new Error('Failed to fetch matchdays')
        }
        const data = await response.json()
        setMatchdays(data.matchdays)
        if (data.matchdays.length > 0) {
          setCurrentMatchday(data.matchdays[0])
        }
      } catch (err) {
        setError(`Error loading matchdays: ${err.message}`)
      }
    }

    fetchMatchdays()
  }, [])

  // Fetch fixtures for the selected matchday
  useEffect(() => {
    const fetchFixtures = async () => {
      if (!currentMatchday) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/fixtures/matchday/${currentMatchday}`)
        if (!response.ok) {
          throw new Error('Failed to fetch fixtures')
        }
        const data = await response.json()
        setFixtures(data.fixtures)
      } catch (err) {
        setError(`Error loading fixtures: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchFixtures()
  }, [currentMatchday])

  const handleMatchdayChange = (matchday) => {
    setCurrentMatchday(matchday)
  }

  return (
    <div className="container">
      <Header />
      
      {error && <ErrorMessage message={error} />}
      
      {matchdays.length > 0 && (
        <MatchdaySelector
          matchdays={matchdays}
          currentMatchday={currentMatchday}
          onMatchdayChange={handleMatchdayChange}
        />
      )}
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FixtureList 
          fixtures={fixtures} 
          matchday={currentMatchday} 
        />
      )}
    </div>
  )
}

export default App