import React from 'react'
import FixtureTable from './FixtureTable'

const FixtureList = ({ fixtures, matchday }) => {
  if (!fixtures || fixtures.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>No fixtures found</h3>
          <p>There are no fixtures scheduled for Matchday {matchday}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Matchday {matchday}</h2>
      </div>
      <div className="card-content">
        <FixtureTable fixtures={fixtures} />
      </div>
    </div>
  )
}

export default FixtureList